var cameraIcon = document.querySelector('div#camera');
var emailButton = document.querySelector('#emailButton');
var emailInput = document.querySelector('input#emailAddress');
var hangupIcon = document.querySelector('div#hangup');
var header = document.querySelector('header');
var localVideo = document.querySelector('video#localVideo');
var miniVideo = document.querySelector('video#miniVideo');
var muteIcon = document.querySelector('div#mute');
var remoteVideo = document.querySelector('video#remoteVideo');
var sharingDiv = document.querySelector('div#sharing');
var statusDiv = document.querySelector('div#status');
var videosDiv = document.querySelector('#videos');

var channelReady = false;
var errorMessages = [];
// Types of gathered ICE Candidates.
var gatheredIceCandidateTypes = { Local: {}, Remote: {} };
var hasLocalStream;
var isAudioMuted = false;
var isVideoMuted = false;
var localStream;
var msgQueue = [];
var pc;
var remoteStream;
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
                      'OfferToReceiveAudio': true,
                      'OfferToReceiveVideo': true }};
var signalingReady = false;
var socket;
var started = false;
var turnDone = false;
var xmlhttp;


function initialize() {
  if (errorMessages.length > 0) {
    for (var i = 0; i < errorMessages.length; ++i) {
      window.alert(errorMessages[i]);
    }
    return;
  }

  cameraIcon.onclick = changeCamera;
  hangupIcon.onclick = hangup;
  muteIcon.onclick = toggleRemoteVideoElementMuted;

  setRemoteVideoElementMuted(localStorage.getItem('mute'));

  console.log('Initializing; room=' + roomKey + '.');

  // NOTE: AppRTCClient.java searches & parses this line; update there when
  // changing here.
  openChannel();
  maybeRequestTurn();

  // Caller is always ready to create peerConnection.
  signalingReady = initiator;

  if (mediaConstraints.audio === false &&
      mediaConstraints.video === false) {
    hasLocalStream = false;
    maybeStart();
  } else {
    hasLocalStream = true;
    doGetUserMedia();
  }
}

function openChannel() {
  console.log('Opening channel.');
  var channel = new goog.appengine.Channel(channelToken);
  var handler = {
    'onopen': onChannelOpened,
    'onmessage': onChannelMessage,
    'onerror': onChannelError,
    'onclose': onChannelClosed
  };
  socket = channel.open(handler);
}

function maybeRequestTurn() {
  if (turnUrl === '') {
    turnDone = true;
    return;
  }

  for (var i = 0, len = pcConfig.iceServers.length; i < len; i++) {
    if (pcConfig.iceServers[i].url &&
        pcConfig.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnDone = true;
      return;
    }
  }

  var currentDomain = document.domain;
  if (currentDomain.search('localhost') === -1 &&
      currentDomain.search('apprtc') === -1) {
    // Not authorized domain. Try with default STUN instead.
    turnDone = true;
    return;
  }

  // No TURN server. Get one from computeengineondemand.appspot.com.
  xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = onTurnResult;
  xmlhttp.open('GET', turnUrl, true);
  xmlhttp.send();
}

function onTurnResult() {
  if (xmlhttp.readyState !== 4)
    return;

  if (xmlhttp.status === 200) {
    var turnServer = JSON.parse(xmlhttp.responseText);
    for (var i = 0; i < turnServer.uris.length; i++) {
      // Create a turnUri using the polyfill (adapter.js).
      var iceServer = createIceServer(turnServer.uris[i],
                                      turnServer.username,
                                      turnServer.password);
      if (iceServer !== null) {
        pcConfig.iceServers.push(iceServer);
      }
    }
  } else {
    setErrorStatus('No TURN server; unlikely that media will traverse networks. ' +
      'If this persists please report it to discuss-webrtc@googlegroups.com.');
  }
  // If TURN request failed, continue the call with default STUN.
  turnDone = true;
  maybeStart();
}

function doGetUserMedia() {
  // Call into getUserMedia via the polyfill (adapter.js).
  try {
   setStatus('Initializing...');
    // if changing camera, etc.
    if (typeof localStream !== 'undefined') {
      localVideo.src = null;
      localStream.stop();
    }
    getUserMedia(mediaConstraints, onUserMediaSuccess, onUserMediaError);
    console.log('Requested access to local media with mediaConstraints:\n' +
      '  \'' + JSON.stringify(mediaConstraints) + '\'');
  } catch (e) {
    alert('getUserMedia() failed. Is this a WebRTC capable browser?');
    setErrorStatus('getUserMedia failed with exception: ' + e.message);
  }
}

function createPeerConnection() {
  try {
    // Create an RTCPeerConnection via the polyfill (adapter.js).
    pc = new RTCPeerConnection(pcConfig, pcConstraints);
    pc.onicecandidate = onIceCandidate;
    console.log('Created RTCPeerConnnection with:\n' +
                '  config: \'' + JSON.stringify(pcConfig) + '\';\n' +
                '  constraints: \'' + JSON.stringify(pcConstraints) + '\'.');
  } catch (e) {
    setErrorStatus('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.');
    return;
  }
  pc.onaddstream = onRemoteStreamAdded;
  pc.onremovestream = onRemoteStreamRemoved;
  pc.onsignalingstatechange = onSignalingStateChanged;
  pc.oniceconnectionstatechange = onIceConnectionStateChanged;
}

function maybeStart() {
  if (!started && signalingReady && channelReady && turnDone &&
      (localStream || !hasLocalStream)) {
    setStatus('Connecting...');
    console.log('Creating PeerConnection.');
    createPeerConnection();

    if (hasLocalStream) {
      console.log('Adding local stream.');
      pc.addStream(localStream);
    } else {
      console.log('Not sending any stream.');
    }
    started = true;

    if (initiator)
      doCall();
    else
      calleeStart();
  }
}

function doCall() {
  var constraints = mergeConstraints(offerConstraints, sdpConstraints);
  console.log('Sending offer to peer, with constraints: \n\'' +
    JSON.stringify(constraints) + '\'.');
  pc.createOffer(setLocalAndSendMessage,
    onCreateSessionDescriptionError, constraints);
}

function calleeStart() {
  // Callee starts to process cached offer and other messages.
  while (msgQueue.length > 0) {
    processSignalingMessage(msgQueue.shift());
  }
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage,
    onCreateSessionDescriptionError, sdpConstraints);
}

function mergeConstraints(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    if (cons2.mandatory.hasOwnProperty(name)) {
      merged.mandatory[name] = cons2.mandatory[name];
    }
  }
  merged.optional.concat(cons2.optional);
  return merged;
}

function setLocalAndSendMessage(sessionDescription) {
  sessionDescription.sdp = maybePreferAudioReceiveCodec(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription,
       onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
  sendMessage(sessionDescription);
}

function setRemote(message) {
  // Set Opus in Stereo, if stereo enabled.
  if (stereo)
    message.sdp = addStereo(message.sdp);
  message.sdp = maybePreferAudioSendCodec(message.sdp);
  pc.setRemoteDescription(new RTCSessionDescription(message),
       onSetRemoteDescriptionSuccess, onSetSessionDescriptionError);

  function onSetRemoteDescriptionSuccess() {
    console.log('Set remote session description success.');
    // By now all addstream events for the setRemoteDescription have fired.
    // So we can know if the peer is sending any stream or is only receiving.
    if (remoteStream) {
      waitForRemoteVideo();
    } else {
      console.log('Not receiving any stream.');
      transitionToActive();
    }
  }
}

function sendMessage(message) {
  var msgString = JSON.stringify(message);
  console.log('C->S: ' + msgString);
  // NOTE: AppRTCClient.java searches & parses this line; update there when
  // changing here.
  var path = '/message?r=' + roomKey + '&u=' + me;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.send(msgString);
}

function processSignalingMessage(message) {
  if (!started) {
    setErrorStatus('peerConnection has not been created yet!');
    return;
  }

  if (message.type === 'offer') {
    setRemote(message);
    doAnswer();
  } else if (message.type === 'answer') {
    setRemote(message);
  } else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({sdpMLineIndex: message.label,
                                         candidate: message.candidate});
    noteIceCandidate('Remote', iceCandidateType(message.candidate));
    pc.addIceCandidate(candidate,
                      onAddIceCandidateSuccess, onAddIceCandidateError);
  } else if (message.type === 'bye') {
    onRemoteHangup();
  }
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  setErrorStatus('Failed to add Ice Candidate: ' + error.toString());
}

function onChannelOpened() {
  console.log('Channel opened.');
  channelReady = true;
  maybeStart();
}

function onChannelMessage(message) {
  console.log('S->C: ' + message.data);
  var msg = JSON.parse(message.data);
  // Since the turn response is async and also GAE might disorder the
  // Message delivery due to possible datastore query at server side,
  // So callee needs to cache messages before peerConnection is created.
  if (!initiator && !started) {
    if (msg.type === 'offer') {
      // Add offer to the beginning of msgQueue, since we can't handle
      // Early candidates before offer at present.
      msgQueue.unshift(msg);
      // Callee creates PeerConnection
      signalingReady = true;
      maybeStart();
    } else {
      msgQueue.push(msg);
    }
  } else {
    processSignalingMessage(msg);
  }
}

function onChannelError() {
  setErrorStatus('Channel error.');
}

function onChannelClosed() {
  console.log('Channel closed.');
}

function onUserMediaSuccess(stream) {
  console.log('User has granted access to local media.');
  attachMediaStream(localVideo, stream);
  localStream = stream;

  // if already connected, i.e. re-calling getUserMedia()
  if (started){
    // display the new stream
    reattachMediaStream(miniVideo, localVideo);
    pc.addStream(localStream);
    if (initiator)
      doCall();
    else
      calleeStart();
  } else {
    // call the polyfill wrapper to attach the media stream to this element.
    setStatus('');
    if (initiator === 0) {
      displaySharingInfo();
    }
    maybeStart();
    localVideo.classList.add('active');
  }
}

function onUserMediaError(error) {
  setErrorStatus('Failed to get access to local media. Error code was ' +
               error.code + '. Continuing without sending a stream.');
  alert('Failed to get access to local media. Error code was ' +
        error.code + '. Continuing without sending a stream.');

  hasLocalStream = false;
  maybeStart();
}

function onCreateSessionDescriptionError(error) {
  setErrorStatus('Failed to create session description: ' + error.toString());
}

function onSetSessionDescriptionSuccess() {
  console.log('Set session description success.');
}

function onSetSessionDescriptionError(error) {
  setErrorStatus('Failed to set session description: ' + error.toString());
}

function iceCandidateType(candidateSDP) {
  if (candidateSDP.indexOf('typ relay ') >= 0)
    return 'TURN';
  if (candidateSDP.indexOf('typ srflx ') >= 0)
    return 'STUN';
  if (candidateSDP.indexOf('typ host ') >= 0)
    return 'HOST';
  return 'UNKNOWN';
}

function onIceCandidate(event) {
  if (event.candidate) {
    sendMessage({type: 'candidate',
                 label: event.candidate.sdpMLineIndex,
                 id: event.candidate.sdpMid,
                 candidate: event.candidate.candidate});
    noteIceCandidate('Local', iceCandidateType(event.candidate.candidate));
  } else {
    console.log('End of candidates.');
  }
}

function onRemoteStreamAdded(event) {
  sharingDiv.classList.remove('active');
  console.log('Remote stream added.');
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
}

function onRemoteStreamRemoved() {
  console.log('Remote stream removed.');
}

function onSignalingStateChanged() {
  updateInfo();
}

function onIceConnectionStateChanged() {
  updateInfo();
}

function hangup() {
  console.log('Hanging up.');
  setStatus('Hanging up');
  transitionToDone();
  localStream.stop();
  stop();
  // will trigger BYE from server
  socket.close();
}

function onRemoteHangup() {
  setStatus('The remote side hung up.');
  initiator = 0;
  transitionToWaiting();
  stop();
}

function stop() {
  started = false;
  signalingReady = false;
  isAudioMuted = false;
  isVideoMuted = false;
  pc.close();
  pc = null;
  remoteStream = null;
  msgQueue.length = 0;
}

function waitForRemoteVideo() {
  // Call the getVideoTracks method via adapter.js.
  var videoTracks = remoteStream.getVideoTracks();
  if (videoTracks.length === 0 || remoteVideo.currentTime > 0) {
    transitionToActive();
  } else {
    setTimeout(waitForRemoteVideo, 100);
  }
}

function transitionToActive() {
  // !!!hack: to avoid resetting miniVideo.src when remote side has changed camera
  if (localVideo.src.substring(0, 4) !== 'http') {
    reattachMediaStream(miniVideo, localVideo);
  }
  remoteVideo.classList.add('active');
  videosDiv.classList.add('active');
  setTimeout(function() {
    localVideo.src = '';
    localVideo.classList.remove('active');
  }, 500);
  setTimeout(function() {
    miniVideo.classList.add('active');
    header.classList.remove('hidden');
  }, 1000);
  setStatus('');
}

function transitionToWaiting() {
  videosDiv.classList.remove('active');
  header.classList.add('hidden');
  setTimeout(function() {
    localVideo.src = miniVideo.src;
    miniVideo.src = '';
    remoteVideo.src = '';
  }, 500);
  miniVideo.classList.remove('active');
  localVideo.classList.add('active');
  remoteVideo.classList.remove('active');
}

function transitionToDone() {
  localVideo.classList.remove('active');
  remoteVideo.classList.remove('active');
  miniVideo.classList.remove('active');
  header.classList.add('hidden');
  setTimeout(function(){setStatus('You have left the call. <a href=\'' + roomLink + '\'>Click here</a> to rejoin.');}, 1000);
}

function noteIceCandidate(location, type) {
  if (gatheredIceCandidateTypes[location][type])
    return;
  gatheredIceCandidateTypes[location][type] = 1;
  updateInfo();
}

function updateInfo() {
  var info = '';
  if (pc !== null) {
    if (Object.keys(gatheredIceCandidateTypes).length > 0) {
      info = 'Gathered ICE Candidates\n';
      for (var endpoint in gatheredIceCandidateTypes) {
        if (gatheredIceCandidateTypes.hasOwnProperty(endpoint)){
          info += endpoint + ':\n';
          for (var type in gatheredIceCandidateTypes[endpoint]) {
            if (gatheredIceCandidateTypes[endpoint].hasOwnProperty(type)) {
              info += '  ' + type + '\n';
            }
          }
        }
      }
    }
    info += 'Gathering: ' + pc.iceGatheringState + '\n';
    info += 'PC State:\n';
    info += 'Signaling: ' + pc.signalingState + '\n';
    info += 'ICE: ' + pc.iceConnectionState + '\n';

    setTimeout(function(){setStatus('');}, 2000);
  }
  if (info !== '') {
    console.log(info);
  }
}

function toggleVideoMute() {
  // Call the getVideoTracks method via adapter.js.
  var videoTracks = localStream.getVideoTracks();

  if (videoTracks.length === 0) {
    console.log('No local video available.');
    return;
  }

  var i;
  if (isVideoMuted) {
    for (i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = true;
    }
    console.log('Video unmuted.');
  } else {
    for (i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = false;
    }
    console.log('Video muted.');
  }

  isVideoMuted = !isVideoMuted;
}

function toggleAudioMute() {
  // Call the getAudioTracks method via adapter.js.
  var audioTracks = localStream.getAudioTracks();

  if (audioTracks.length === 0) {
    console.log('No local audio available.');
    return;
  }

  var i;
  if (isAudioMuted) {
    for (i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = true;
    }
    console.log('Audio unmuted.');
  } else {
    for (i = 0; i < audioTracks.length; i++){
      audioTracks[i].enabled = false;
    }
    console.log('Audio muted.');
  }

  isAudioMuted = !isAudioMuted;
}

// Mac: hotkey is Command.
// Non-Mac: hotkey is Control.
// <hotkey>-D: toggle audio mute.
// <hotkey>-E: toggle video mute.
// <hotkey>-I: toggle Info box.
// Return false to screen out original Chrome shortcuts.
document.onkeydown = function(event) {
  var hotkey = event.ctrlKey;
  if (navigator.appVersion.indexOf('Mac') != -1)
    hotkey = event.metaKey;
  if (!hotkey)
    return;
  switch (event.keyCode) {
    case 68:
      showHeader();
      toggleAudioMute();
      toggleRemoteVideoElementMuted();
      return false;
    case 69:
      toggleVideoMute();
      return false;
    case 73:
      // errors now displayed in div#statusDiv, info in console
      // toggleInfoDiv();
      return false;
    default:
      return;
  }
};

function maybePreferAudioSendCodec(sdp) {
  if (audio_send_codec === '') {
    console.log('No preference on audio send codec.');
    return sdp;
  }
  console.log('Prefer audio send codec: ' + audio_send_codec);
  return preferAudioCodec(sdp, audio_send_codec);
}

function maybePreferAudioReceiveCodec(sdp) {
  if (audio_receive_codec === '') {
    console.log('No preference on audio receive codec.');
    return sdp;
  }
  console.log('Prefer audio receive codec: ' + audio_receive_codec);
  return preferAudioCodec(sdp, audio_receive_codec);
}

// Set |codec| as the default audio codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function preferAudioCodec(sdp, codec) {
  var fields = codec.split('/');
  if (fields.length != 2) {
    console.log('Invalid codec setting: ' + codec);
    return sdp;
  }
  var name = fields[0];
  var rate = fields[1];
  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex;
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('m=audio') !== -1) {
      mLineIndex = i;
      break;
    }
  }
  if (mLineIndex === null)
    return sdp;

  // If the codec is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search(name + '/' + rate) !== -1) {
      var regexp = new RegExp(':(\\d+) ' + name + '\\/' + rate, 'i');
      var payload = extractSdp(sdpLines[i], regexp);
      if (payload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
          payload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Set Opus in stereo if stereo is enabled.
function addStereo(sdp) {
  var sdpLines = sdp.split('\r\n');

  // Find opus payload.
  var opusPayload;
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      break;
    }
  }

  // Find the payload in fmtp line.\
  var fmtpLineIndex;
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('a=fmtp') !== -1) {
      var payload = extractSdp(sdpLines[i], /a=fmtp:(\d+)/ );
      if (payload === opusPayload) {
        fmtpLineIndex = i;
        break;
      }
    }
  }
  // No fmtp line found.
  if (fmtpLineIndex === null)
    return sdp;

  // Append stereo=1 to fmtp line.
  sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat(' stereo=1');

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length == 2 ? result[1]: null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    if (elements[i] !== payload)
      newLine[index++] = elements[i];
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

// Send BYE on refreshing(or leaving) a demo page
// to ensure the room is cleaned for next session.
window.onbeforeunload = function() {
  sendMessage({type: 'bye'});
};

function displaySharingInfo(){
  emailInput.onkeydown = function(e){
    if (e.keyCode === 13){
      sendEmail();
    }
  };
  emailButton.onclick = sendEmail;
  sharingDiv.classList.add('active');
}

function sendEmail(){
  var subject = 'Join me for a video chat!';
  var body = 'Please join me at the following address:\n\n' + location.href;
  var a = document.createElement('a');
  a.href = 'mailto:' + emailInput.value + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  a.target = '_blank';
  a.click();
}

function toggleRemoteVideoElementMuted(){
  setRemoteVideoElementMuted(!remoteVideo.muted);
}

function setRemoteVideoElementMuted(mute){
  if (mute) {
    remoteVideo.muted = true;
    remoteVideo.title = 'Unmute audio';
    muteIcon.classList.add('active');
    localStorage.setItem('mute', 'true');
  } else {
    remoteVideo.muted = false;
    remoteVideo.title = 'Mute audio';
    muteIcon.classList.remove('active');
    localStorage.setItem('mute', 'false');
  }
}

function showHeader(){
  if (!header.classList.contains('active')) {
    header.classList.add('active');
    setTimeout(function(){
      header.classList.remove('active');
    }, 5000);
  }
};

document.body.onmousemove = showHeader;

var isGetSourcesSupported = MediaStreamTrack && MediaStreamTrack.getSources;

if (isGetSourcesSupported){
  MediaStreamTrack.getSources(gotSources);
} else {
  console.log('This browser does not support MediaStreamTrack.getSources().');
}

var videoSources = [];
function gotSources(sources){
  for (var i = 0; i != sources.length; ++i) {
    var source = sources[i];
    if (source.kind === 'video') {
      videoSources.push(source);
    }
  }
  // if more than one camera available, show the camera icon
  if (videoSources.length > 1) {
    cameraIcon.classList.remove('hidden');
  }
}

function changeCamera(){
  // do icon animation
  cameraIcon.classList.add('activated');
  setTimeout(function(){
    cameraIcon.classList.remove('activated');
    header.classList.remove('active');
  }, 1000);

  // check if sourceId has already been set
  var sourceIdObj;
  var videoOptional = mediaConstraints.video.optional;
  if (!!videoOptional) {
    for (i = 0; i !== videoOptional.length; ++i) {
      if (videoOptional[i].hasOwnProperty('sourceId')){
        sourceIdObj = videoOptional[i];
        break;
      }
    }
  }

  if (sourceIdObj) {
    for (var i = 0; i !== videoSources.length; ++i) {
      var videoSourceId = videoSources[i].id;
      // change it
      if (sourceIdObj.sourceId !== videoSourceId) {
        sourceIdObj.sourceId = videoSourceId;
        break;
      }
    }
  } else {
    // this is the first time a non-default camera has been set
    // default source is first in array of sources, so use second
    mediaConstraints.video =
      {optional: [{'sourceId': videoSources[1].id}]};
  }
  doGetUserMedia();
}

function setStatus(status) {
  statusDiv.classList.remove('warning');
  if (status === ''){
    statusDiv.classList.remove('active');
  } else {
    statusDiv.classList.add('active');
  }
  statusDiv.innerHTML = status;
}

function setErrorStatus(status) {
  if (status === ''){
    statusDiv.classList.remove('active');
    statusDiv.classList.remove('warning');
  } else {
    statusDiv.classList.add('active');
    statusDiv.classList.add('warning');
  }
  console.log(status);
  statusDiv.innerHTML = status;
}

// Google+ sharing
window.___gcfg = {lang: 'en-GB'};
(function() {
  var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
  po.src = 'https://apis.google.com/js/platform.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
})();
