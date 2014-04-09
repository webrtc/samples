var localVideo;
var miniVideo;
var remoteVideo;
var hasLocalStream;
var localStream;
var remoteStream;
var channel;
var pc;
var socket;
var xmlhttp;
var started = false;
var turnDone = false;
var channelReady = false;
var signalingReady = false;
var msgQueue = [];
// Set up audio and video regardless of what devices are present.
var sdpConstraints = {'mandatory': {
                      'OfferToReceiveAudio': true,
                      'OfferToReceiveVideo': true }};
var isVideoMuted = false;
var isAudioMuted = false;
// Types of gathered ICE Candidates.
var gatheredIceCandidateTypes = { Local: {}, Remote: {} };
var infoDivErrors = [];

function initialize() {
  if (errorMessages.length > 0) {
    for (i = 0; i < errorMessages.length; ++i) {
      window.alert(errorMessages[i]);
    }
    return;
  }

  console.log('Initializing; room=' + roomKey + '.');
  card = document.getElementById('card');
  localVideo = document.getElementById('localVideo');
  // Reset localVideo display to center.
  localVideo.addEventListener('loadedmetadata', function(){
    window.onresize();});
  miniVideo = document.getElementById('miniVideo');
  remoteVideo = document.getElementById('remoteVideo');
  resetStatus();
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
  // Allow to skip turn by passing ts=false to apprtc.
  if (turnUrl == '') {
    turnDone = true;
    return;
  }

  for (var i = 0, len = pcConfig.iceServers.length; i < len; i++) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
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
    // Create turnUris using the polyfill (adapter.js).
    var iceServers = createIceServers(turnServer.uris,
                                      turnServer.username,
                                      turnServer.password);
    if (iceServers !== null) {
      pcConfig.iceServers = pcConfig.iceServers.concat(iceServers);
    }
  } else {
    messageError('No TURN server; unlikely that media will traverse networks.  '
                 + 'If this persists please report it to '
                 + 'discuss-webrtc@googlegroups.com.');
  }
  // If TURN request failed, continue the call with default STUN.
  turnDone = true;
  maybeStart();
}

function resetStatus() {
  if (!initiator) {
    setStatus('Waiting for someone to join: \
              <a href=' + roomLink + '>' + roomLink + '</a>');
  } else {
    setStatus('Initializing...');
  }
}

function doGetUserMedia() {
  // Call into getUserMedia via the polyfill (adapter.js).
  try {
    getUserMedia(mediaConstraints, onUserMediaSuccess,
                 onUserMediaError);
    console.log('Requested access to local media with mediaConstraints:\n' +
                '  \'' + JSON.stringify(mediaConstraints) + '\'');
  } catch (e) {
    alert('getUserMedia() failed. Is this a WebRTC capable browser?');
    messageError('getUserMedia failed with exception: ' + e.message);
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
    messageError('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object; \
          WebRTC is not supported by this browser.');
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

function setStatus(state) {
  document.getElementById('status').innerHTML = state;
}

function doCall() {
  var constraints = mergeConstraints(offerConstraints, sdpConstraints);
  console.log('Sending offer to peer, with constraints: \n' +
              '  \'' + JSON.stringify(constraints) + '\'.')
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
    merged.mandatory[name] = cons2.mandatory[name];
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
    console.log("Set remote session description success.");
    // By now all addstream events for the setRemoteDescription have fired.
    // So we can know if the peer is sending any stream or is only receiving.
    if (remoteStream) {
      waitForRemoteVideo();
    } else {
      console.log("Not receiving any stream.");
      transitionToActive();
    }
  }
}

function sendMessage(message) {
  var msgString = JSON.stringify(message);
  console.log('C->S: ' + msgString);
  // NOTE: AppRTCClient.java searches & parses this line; update there when
  // changing here.
  path = '/message?r=' + roomKey + '&u=' + me;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.send(msgString);
}

function processSignalingMessage(message) {
  if (!started) {
    messageError('peerConnection has not been created yet!');
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
    noteIceCandidate("Remote", iceCandidateType(message.candidate));
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
  messageError('Failed to add Ice Candidate: ' + error.toString());
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
  messageError('Channel error.');
}

function onChannelClosed() {
  console.log('Channel closed.');
}

function messageError(msg) {
  console.log(msg);
  infoDivErrors.push(msg);
  updateInfoDiv();
}

function onUserMediaSuccess(stream) {
  console.log('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localVideo.style.opacity = 1;
  localStream = stream;
  // Caller creates PeerConnection.
  maybeStart();
}

function onUserMediaError(error) {
  messageError('Failed to get access to local media. Error code was ' +
               error.code + '. Continuing without sending a stream.');
  alert('Failed to get access to local media. Error code was ' +
        error.code + '. Continuing without sending a stream.');

  hasLocalStream = false;
  maybeStart();
}

function onCreateSessionDescriptionError(error) {
  messageError('Failed to create session description: ' + error.toString());
}

function onSetSessionDescriptionSuccess() {
  console.log('Set session description success.');
}

function onSetSessionDescriptionError(error) {
  messageError('Failed to set session description: ' + error.toString());
}

function iceCandidateType(candidateSDP) {
  if (candidateSDP.indexOf("typ relay ") >= 0)
    return "TURN";
  if (candidateSDP.indexOf("typ srflx ") >= 0)
    return "STUN";
  if (candidateSDP.indexOf("typ host ") >= 0)
    return "HOST";
  return "UNKNOWN";
}

function onIceCandidate(event) {
  if (event.candidate) {
    sendMessage({type: 'candidate',
                 label: event.candidate.sdpMLineIndex,
                 id: event.candidate.sdpMid,
                 candidate: event.candidate.candidate});
    noteIceCandidate("Local", iceCandidateType(event.candidate.candidate));
  } else {
    console.log('End of candidates.');
  }
}

function onRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
}

function onRemoteStreamRemoved(event) {
  console.log('Remote stream removed.');
}

function onSignalingStateChanged(event) {
  updateInfoDiv();
}

function onIceConnectionStateChanged(event) {
  updateInfoDiv();
}

function onHangup() {
  console.log('Hanging up.');
  transitionToDone();
  localStream.stop();
  stop();
  // will trigger BYE from server
  socket.close();
}

function onRemoteHangup() {
  console.log('Session terminated.');
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
  videoTracks = remoteStream.getVideoTracks();
  if (videoTracks.length === 0 || remoteVideo.currentTime > 0) {
    transitionToActive();
  } else {
    setTimeout(waitForRemoteVideo, 100);
  }
}

function transitionToActive() {
  reattachMediaStream(miniVideo, localVideo);
  remoteVideo.style.opacity = 1;
  card.style.webkitTransform = 'rotateY(180deg)';
  setTimeout(function() { localVideo.src = ''; }, 500);
  setTimeout(function() { miniVideo.style.opacity = 1; }, 1000);
  // Reset window display according to the asperio of remote video.
  window.onresize();
  setStatus('<input type=\'button\' id=\'hangup\' value=\'Hang up\' \
            onclick=\'onHangup()\' />');
}

function transitionToWaiting() {
  card.style.webkitTransform = 'rotateY(0deg)';
  setTimeout(function() {
               localVideo.src = miniVideo.src;
               miniVideo.src = '';
               remoteVideo.src = '' }, 500);
  miniVideo.style.opacity = 0;
  remoteVideo.style.opacity = 0;
  resetStatus();
}

function transitionToDone() {
  localVideo.style.opacity = 0;
  remoteVideo.style.opacity = 0;
  miniVideo.style.opacity = 0;
  setStatus('You have left the call. <a href=' + roomLink + '>\
            Click here</a> to rejoin.');
}

function enterFullScreen() {
  container.webkitRequestFullScreen();
}

function noteIceCandidate(location, type) {
  if (gatheredIceCandidateTypes[location][type])
    return;
  gatheredIceCandidateTypes[location][type] = 1;
  updateInfoDiv();
}

function getInfoDiv() {
  return document.getElementById("infoDiv");
}

function updateInfoDiv() {
  var contents = "<pre>Gathered ICE Candidates\n";
  for (var endpoint in gatheredIceCandidateTypes) {
    contents += endpoint + ":\n";
    for (var type in gatheredIceCandidateTypes[endpoint])
      contents += "  " + type + "\n";
  }
  if (pc != null) {
    contents += "Gathering: " + pc.iceGatheringState + "\n";
    contents += "</pre>\n";
    contents += "<pre>PC State:\n";
    contents += "Signaling: " + pc.signalingState + "\n";
    contents += "ICE: " + pc.iceConnectionState + "\n";
  }
  var div = getInfoDiv();
  div.innerHTML = contents + "</pre>";

  for (var msg in infoDivErrors) {
    div.innerHTML += '<p style="background-color: red; color: yellow;">' +
                     infoDivErrors[msg] + '</p>';
  }
  if (infoDivErrors.length)
    showInfoDiv();
}

function toggleInfoDiv() {
  var div = getInfoDiv();
  if (div.style.display == "block") {
    div.style.display = "none";
  } else {
    showInfoDiv();
  }
}

function showInfoDiv() {
  var div = getInfoDiv();
  div.style.display = "block";
}

function toggleVideoMute() {
  // Call the getVideoTracks method via adapter.js.
  videoTracks = localStream.getVideoTracks();

  if (videoTracks.length === 0) {
    console.log('No local video available.');
    return;
  }

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
  audioTracks = localStream.getAudioTracks();

  if (audioTracks.length === 0) {
    console.log('No local audio available.');
    return;
  }

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
      toggleAudioMute();
      return false;
    case 69:
      toggleVideoMute();
      return false;
    case 73:
      toggleInfoDiv();
      return false;
    default:
      return;
  }
}

function maybePreferAudioSendCodec(sdp) {
  if (audio_send_codec == '') {
    console.log('No preference on audio send codec.');
    return sdp;
  }
  console.log('Prefer audio send codec: ' + audio_send_codec);
  return preferAudioCodec(sdp, audio_send_codec);
}

function maybePreferAudioReceiveCodec(sdp) {
  if (audio_receive_codec == '') {
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
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        var mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null)
    return sdp;

  // If the codec is available, set it as the default in m line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search(name + '/' + rate) !== -1) {
      var regexp = new RegExp(':(\\d+) ' + name + '\\/' + rate, 'i');
      var payload = extractSdp(sdpLines[i], regexp);
      if (payload)
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
                                               payload);
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
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      break;
    }
  }

  // Find the payload in fmtp line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('a=fmtp') !== -1) {
      var payload = extractSdp(sdpLines[i], /a=fmtp:(\d+)/ );
      if (payload === opusPayload) {
        var fmtpLineIndex = i;
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
  return (result && result.length == 2)? result[1]: null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = new Array();
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
}

// Set the video diplaying in the center of window.
window.onresize = function(){
  var aspectRatio;
  if (remoteVideo.style.opacity === '1') {
    aspectRatio = remoteVideo.videoWidth/remoteVideo.videoHeight;
  } else if (localVideo.style.opacity === '1') {
    aspectRatio = localVideo.videoWidth/localVideo.videoHeight;
  } else {
    return;
  }

  var innerHeight = this.innerHeight;
  var innerWidth = this.innerWidth;
  var videoWidth = innerWidth < aspectRatio * window.innerHeight ?
                   innerWidth : aspectRatio * window.innerHeight;
  var videoHeight = innerHeight < window.innerWidth / aspectRatio ?
                    innerHeight : window.innerWidth / aspectRatio;
  containerDiv = document.getElementById('container');
  containerDiv.style.width = videoWidth + 'px';
  containerDiv.style.height = videoHeight + 'px';
  containerDiv.style.left = (innerWidth - videoWidth) / 2 + 'px';
  containerDiv.style.top = (innerHeight - videoHeight) / 2 + 'px';
};
