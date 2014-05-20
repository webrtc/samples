var cameraIcon = document.querySelector('div#camera');
var emailButton = document.querySelector('#emailButton');
var emailInput = document.querySelector('input#emailAddress');
var hangupIcon = document.querySelector('div#hangup');
var header = document.querySelector('header');
var infoDiv = document.querySelector('div#info');
var localVideo = document.querySelector('video#localVideo');
var miniVideo = document.querySelector('video#miniVideo');
var muteIcon = document.querySelector('div#mute');
var remoteCanvas = document.querySelector('#remoteCanvas');
var remoteVideo = document.querySelector('video#remoteVideo');
var sharingDiv = document.querySelector('div#sharing');
var toggleInfoIcon = document.querySelector('div#toggleInfo');
var statusDiv = document.querySelector('div#status');
var videosDiv = document.querySelector('div#videos');

var channelReady = false;
var e2eDelay;
// Types of gathered ICE Candidates.
var gatheredIceCandidateTypes = {
  Local: {},
  Remote: {}
};
var getStatsTimer;
var hasLocalStream;
var errorMessages = [];
var isAudioMuted = false;
var isVideoMuted = false;
var localStream;
var msgQueue = [];
var pc = null;
var remoteStream;
var rtt;
// Set up audio and video regardless of what devices are present.
// Disable comfort noise for maximum audio quality.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
   },
   'optional': [
     {'VoiceActivityDetection': false}
   ]
};
var setupTime;
var signalingReady = false;
var socket;
var started = false;
var startTime;
var turnDone = false;
var xmlhttp;


function initialize() {
  console.log(errorMessages);
  if (errorMessages.length > 0) {
    for (var i = 0; i < errorMessages.length; ++i) {
      window.alert(errorMessages[i]);
    }
    return;
  }

  cameraIcon.onclick = changeCamera;
  hangupIcon.onclick = hangup;
  muteIcon.onclick = toggleRemoteVideoElementMuted;
  toggleInfoIcon.onclick = toggleInfoDiv;

  setRemoteVideoElementMuted(localStorage.getItem('mute'));

  trace('Initializing; room=' + roomKey + '.');

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
  trace('Opening channel.');
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
  if (turnUrl === '') {
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
    displayStatus('No TURN server; unlikely that media will traverse networks. ' +
      'If this persists please report it to discuss-webrtc@googlegroups.com.');
  }
  // If TURN request failed, continue the call with default STUN.
  turnDone = true;
  maybeStart();
}

function doGetUserMedia() {
  // Call into getUserMedia via the polyfill (adapter.js).
  try {
    displayStatus('Calling getUserMedia()...');
    trace('Calling getUserMedia()');
    // if changing camera, etc.
    if (typeof localStream !== 'undefined') {
      localVideo.src = null;
      localStream.stop();
    }
    getUserMedia(mediaConstraints, onUserMediaSuccess, onUserMediaError);
    trace('Requested access to local media with mediaConstraints:\n' +
      '  \'' + JSON.stringify(mediaConstraints) + '\'');
  } catch (e) {
    alert('getUserMedia() failed. Is this a WebRTC capable browser?');
    displayError('getUserMedia failed with exception: ' + e.message);
  }
}

function createPeerConnection() {
  try {
    // Create an RTCPeerConnection via the polyfill (adapter.js).
    pc = new RTCPeerConnection(pcConfig, pcConstraints);
    pc.onicecandidate = onIceCandidate;
    trace('Created RTCPeerConnnection with:\n' +
      '  config: \'' + JSON.stringify(pcConfig) + '\';\n' +
      '  constraints: \'' + JSON.stringify(pcConstraints) + '\'.');
  } catch (e) {
    displayError('Failed to create PeerConnection, exception: ' + e.message);
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
    startTime = performance.now();
    displayStatus('Connecting...');
    trace('Creating PeerConnection.');
    createPeerConnection();

    if (hasLocalStream) {
      trace('Adding local stream.');
      pc.addStream(localStream);
    } else {
      trace('Not sending any stream.');
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
  trace('Sending offer to peer, with constraints: \n\'' +
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
  trace('Sending answer to peer.');
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
  merged.optional = merged.optional.concat(cons2.optional);
  return merged;
}

function setLocalAndSendMessage(sessionDescription) {
  sessionDescription.sdp = maybePreferAudioReceiveCodec(sessionDescription.sdp);
  sessionDescription.sdp = maybeSetAudioReceiveBitRate(sessionDescription.sdp);
  sessionDescription.sdp = maybeSetVideoReceiveBitRate(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription,
    onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
  sendMessage(sessionDescription);
}

function setRemote(message) {
  // Set Opus in Stereo, if stereo enabled.
  if (stereo) {
    message.sdp = addStereo(message.sdp);
  }
  message.sdp = maybePreferAudioSendCodec(message.sdp);
  message.sdp = maybeSetAudioSendBitRate(message.sdp);
  message.sdp = maybeSetVideoSendBitRate(message.sdp);
  message.sdp = maybeSetVideoSendInitialBitRate(message.sdp);
  pc.setRemoteDescription(new RTCSessionDescription(message),
    onSetRemoteDescriptionSuccess, onSetSessionDescriptionError);

function onSetRemoteDescriptionSuccess() {
  trace('Set remote session description success.');
  // By now all onaddstream events for the setRemoteDescription have fired,
  // so we can know if the peer has any remote video streams that we need
  // to wait for. Otherwise, transition immediately to the active state.
  // NOTE: Ideally we could just check |remoteStream| here, which is populated
  // in the onaddstream callback. But as indicated in
  // https://code.google.com/p/webrtc/issues/detail?id=3358, sometimes this
  // callback is dispatched after the setRemoteDescription success callback.
  // Therefore, we read the remoteStreams array directly from the
  // PeerConnection, which seems to work reliably.
  var remoteStreams = pc.getRemoteStreams();
  if (remoteStreams.length > 0 &&
      remoteStreams[0].getVideoTracks().length > 0) {
      trace('Waiting for remote video.');
      waitForRemoteVideo();
    } else {
      trace('No remote video stream; not waiting for media to arrive.');
      transitionToActive();
    }
  }
}

function sendMessage(message) {
  var msgString = JSON.stringify(message);
  trace('C->S: ' + msgString);
  // NOTE: AppRTCClient.java searches & parses this line; update there when
  // changing here.
  var path = '/message?r=' + roomKey + '&u=' + me;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.send(msgString);
}

function processSignalingMessage(message) {
  if (!started) {
    displayError('peerConnection has not been created yet!');
    return;
  }

  if (message.type === 'offer') {
    setRemote(message);
    doAnswer();
  } else if (message.type === 'answer') {
    setRemote(message);
  } else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    noteIceCandidate('Remote', iceCandidateType(message.candidate));
    pc.addIceCandidate(candidate,
      onAddIceCandidateSuccess, onAddIceCandidateError);
  } else if (message.type === 'bye') {
    onRemoteHangup();
  }
}

function onAddIceCandidateSuccess() {
  trace('Remote candidate added successfully.');
}

function onAddIceCandidateError(error) {
  displayError('Failed to add remote candidate: ' + error.toString());
}

function onChannelOpened() {
  trace('Channel opened.');
  channelReady = true;
  maybeStart();
}

function onChannelMessage(message) {
  trace('S->C: ' + message.data);
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
  displayError('Channel error.');
}

function onChannelClosed() {
  trace('Channel closed.');
}

function onUserMediaSuccess(stream) {
  trace('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localStream = stream;

  // if already connected, i.e. re-calling getUserMedia()
  if (started) {
    // display the new stream
    reattachMediaStream(miniVideo, localVideo);
    pc.addStream(localStream);
    if (initiator)
      doCall();
    else
      calleeStart();
  } else {
    displayStatus('');
    if (initiator === 0) {
      displaySharingInfo();
    }
    maybeStart();
    localVideo.classList.add('active');
  }
}

function onUserMediaError(error) {
  displayError('Failed to get access to local media. Error code was ' +
    error.code + '. Continuing without sending a stream.');
  alert('Failed to get access to local media. Error code was ' +
    error.code + '. Continuing without sending a stream.');

  hasLocalStream = false;
  maybeStart();
}

function onCreateSessionDescriptionError(error) {
  displayError('Failed to create session description: ' + error.toString());
}

function onSetSessionDescriptionSuccess() {
  trace('Set session description success.');
}

function onSetSessionDescriptionError(error) {
  displayError('Failed to set session description: ' + error.toString());
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
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
    noteIceCandidate('Local', iceCandidateType(event.candidate.candidate));
  } else {
    trace('End of candidates.');
  }
}

function onRemoteStreamAdded(event) {
  sharingDiv.classList.remove('active');
  trace('Remote stream added.');
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
}

function computeRttAndDelay() {
  if (pc) {
    pc.getStats(function(response) {
      var stats = response.result();
      rtt = extractStat(stats, 'googRtt');
      var captureStart = extractStat(stats, 'googCaptureStartNtpTimeMs');
      if (captureStart) {
        e2eDelay = computeE2EDelay(captureStart, remoteVideo.currentTime);
      }
      updateInfoDiv();
    });
  }
}

function extractStat(stats, statName) {
  for (var i = 0; i < stats.length; ++i) {
    var report = stats[i];
    if (report.names().indexOf(statName) != -1) {
      return report.stat(statName);
    }
  }
}

function computeE2EDelay(captureStart, remoteVideoCurrentTime) {
  // Computes end to end Delay.
  if (captureStart !== 0) {
    // Adding offset to get NTP time.
    var now_ntp = Date.now() + 2208988800000;
    e2eDelay = now_ntp - captureStart - remoteVideoCurrentTime * 1000;
    return e2eDelay;
  }
}

function onRemoteStreamRemoved() {
  trace('Remote stream removed.');
}

function onSignalingStateChanged() {
  if (pc) {
    trace('Signaling state changed to: ' + pc.signalingState);
  }
  updateInfoDiv();
}

function onIceConnectionStateChanged() {
  if (pc) {
    trace('ICE connection state changed to: ' + pc.iceConnectionState);
  }
  updateInfoDiv();
}

function hangup() {
  trace('Hanging up.');
  displayStatus('Hanging up');
  transitionToDone();
  localStream.stop();
  stop();
  // will trigger BYE from server
  socket.close();
}

function onRemoteHangup() {
  displayStatus('The remote side hung up.');
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
  // Wait for the actual video to start arriving before moving to the active call state.
  if (remoteVideo.currentTime > 0) {
    transitionToActive();
  } else {
    setTimeout(waitForRemoteVideo, 10);
  }
}

function transitionToActive() {
  setupTime = ((performance.now() - startTime) / 1000).toFixed(3);
  trace('Call setup time: ' + setupTime + 's.');
  updateInfoDiv();
  // !!!hack: to avoid resetting miniVideo.src when remote side has changed camera
  if (localVideo.src.substring(0, 4) !== 'http') {
    reattachMediaStream(miniVideo, localVideo);
  }

// Prepare the remote video and PIP elements.
// if (stereoscopic) {
//   setupStereoscopic(remoteVideo, remoteCanvas);
// } else {
//   reattachMediaStream(miniVideo, localVideo);
// }

  remoteVideo.classList.add('active');
  videosDiv.classList.add('active');
  setTimeout(function () {
    localVideo.src = null;
    localVideo.classList.remove('active');
    localVideo.classList.add('hidden');
  }, 500);
  setTimeout(function () {
    miniVideo.classList.add('active');
    header.classList.remove('hidden');
  }, 1000);
  displayStatus('');
}

function transitionToWaiting() {
  startTime = null;
  videosDiv.classList.remove('active');
  header.classList.add('hidden');
  setTimeout(function () {
    localVideo.src = miniVideo.src;
    miniVideo.src = '';
    remoteVideo.src = '';
  }, 500);
  miniVideo.classList.remove('active');
  localVideo.classList.add('active');
  localVideo.classList.remove('hidden');
  remoteVideo.classList.remove('active');
}

function transitionToDone() {
  localVideo.classList.remove('active');
  remoteVideo.classList.remove('active');
  miniVideo.classList.remove('active');
  header.classList.add('hidden');
  setTimeout(function () {
    displayStatus('You have left the call. <a href=\'' + roomLink + '\'>Click here</a> to rejoin.');
  }, 1000);
}

function noteIceCandidate(location, type) {
  if (gatheredIceCandidateTypes[location][type])
    return;
  gatheredIceCandidateTypes[location][type] = 1;
  updateInfoDiv();
}

function updateInfoDiv() {
  var contents = [];

  for (var i = 0; i !== errorMessages.length; ++i) {
    contents.push(errorMessages[i]);
  }

  if (pc !== null) {
    var candidateTypes ='';
    for (var endpoint in gatheredIceCandidateTypes) {
      if (gatheredIceCandidateTypes.hasOwnProperty(endpoint)) {
        candidateTypes += '&nbsp;&nbsp;' + endpoint + '<br>\n';
        for (var type in gatheredIceCandidateTypes[endpoint]) {
          if (gatheredIceCandidateTypes[endpoint].hasOwnProperty(type)) {
            candidateTypes += '&nbsp;&nbsp;&nbsp;&nbsp;' + type + '<br>\n';
          }
        }
      }
    }
    if (candidateTypes !== '') {
      contents.push('<strong>Gathered ICE Candidates</strong>');
      contents.push(candidateTypes);
    }
    contents.push('<strong>Gathering:</strong> ' + pc.iceGatheringState);
    contents.push('<br><strong>PC state</strong>');
    contents.push('&nbsp;&nbsp;Signaling: ' + pc.signalingState);
    contents.push('&nbsp;&nbsp;ICE: ' + pc.iceConnectionState);
    contents.push('<br><strong>PC stats</strong>');
    if (setupTime) {
      contents.push('&nbsp;&nbsp;Setup time: ' + setupTime + 's');
    }
    if (rtt) {
      contents.push('&nbsp;&nbsp;RTT: ' + rtt + 's');
    }
    if (e2eDelay) {
      contents.push('&nbsp;&nbsp;End to end delay: ' + e2eDelay + 'ms');
    }
  }

  infoDiv.innerHTML = contents.join('<br>\n');
  if (errorMessages.length) {
    infoDiv.className = 'warning active';
  }
}

function toggleInfoDiv(){
  //  toggleInfo.classList.toggle('active');
  if (infoDiv.classList.contains('active')) {
    clearInterval(getStatsTimer);
    toggleInfoIcon.classList.remove('active');
    infoDiv.classList.remove('active');
  } else {
    getStatsTimer = setInterval(computeRttAndDelay, 1000);
    toggleInfoIcon.classList.add('active');
    infoDiv.classList.add('active');
  }
}

function toggleVideoMute() {
  // Call the getVideoTracks method via adapter.js.
  var videoTracks = localStream.getVideoTracks();

  if (videoTracks.length === 0) {
    trace('No local video available.');
    return;
  }

  trace('Toggling video mute state.');
  var i;
  if (isVideoMuted) {
    for (i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = true;
    }
    trace('Video unmuted.');
  } else {
    for (i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = false;
    }
    trace('Video muted.');
  }

  isVideoMuted = !isVideoMuted;
}

function toggleAudioMute() {
  // Call the getAudioTracks method via adapter.js.
  var audioTracks = localStream.getAudioTracks();

  if (audioTracks.length === 0) {
    trace('No local audio available.');
    return;
  }

  trace('Toggling audio mute state.');
  var i;
  if (isAudioMuted) {
    for (i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = true;
    }
    trace('Audio unmuted.');
  } else {
    for (i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = false;
    }
    trace('Audio muted.');
  }

  isAudioMuted = !isAudioMuted;
}

// Mac: hotkey is Command.
// Non-Mac: hotkey is Control.
// <hotkey>-D: toggle audio mute.
// <hotkey>-E: toggle video mute.
// <hotkey>-I: toggle info display.
// Return false to screen out original Chrome shortcuts.
document.onkeydown = function (event) {
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
    toggleInfoDiv();
    return false;
  default:
    return;
  }
};

function maybeSetAudioSendBitRate(sdp) {
  if (!audioSendBitrate) {
    return sdp;
  }
  trace('Prefer audio send bitrate: ' + audioSendBitrate);
  return preferBitRate(sdp, audioSendBitrate, 'audio');
}

function maybeSetAudioReceiveBitRate(sdp) {
  if (!audioRecvBitrate) {
    return sdp;
  }
  trace('Prefer audio receive bitrate: ' + audioRecvBitrate);
  return preferBitRate(sdp, audioRecvBitrate, 'audio');
}

function maybeSetVideoSendBitRate(sdp) {
  if (!videoSendBitrate) {
    return sdp;
  }
  trace('Prefer video send bitrate: ' + videoSendBitrate);
  return preferBitRate(sdp, videoSendBitrate, 'video');
}

function maybeSetVideoReceiveBitRate(sdp) {
  if (!videoRecvBitrate) {
    return sdp;
  }
  trace('Prefer video receive bitrate: ' + videoRecvBitrate);
  return preferBitRate(sdp, videoRecvBitrate, 'video');
}

// Add a b=AS:bitrate line to the m=mediaType section.
function preferBitRate(sdp, bitrate, mediaType) {
  var sdpLines = sdp.split('\r\n');

  // Find m line for the given mediaType.
  var mLineIndex = findLine(sdpLines, 'm=', mediaType);
  if (mLineIndex === null) {
    displayError('Failed to add bandwidth line to sdp, as no m-line found');
    return sdp;
  }

  // Find next m-line if any.
  var nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, 'm=');
  if (nextMLineIndex === null) {
    nextMLineIndex = sdpLines.length;
  }

  // Find c-line corresponding to the m-line.
  var cLineIndex = findLineInRange(sdpLines, mLineIndex + 1, nextMLineIndex,
                                   'c=');
  if (cLineIndex === null) {
    displayError('Failed to add bandwidth line to sdp, as no c-line found');
    return sdp;
  }

  // Check if bandwidth line already exists between c-line and next m-line.
  var bLineIndex = findLineInRange(sdpLines, cLineIndex + 1, nextMLineIndex,
                                   'b=AS');
  if (bLineIndex) {
    sdpLines.splice(bLineIndex, 1);
  }

  // Create the b (bandwidth) sdp line.
  var bwLine = 'b=AS:' + bitrate;
  // As per RFC 4566, the b line should follow after c-line.
  sdpLines.splice(cLineIndex + 1, 0, bwLine);
  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Add an a=fmtp: x-google-min-bitrate=kbps line, if videoSendInitialBitrate
// is specified. We'll also add a x-google-min-bitrate value, since the max
// must be >= the min.
function maybeSetVideoSendInitialBitRate(sdp) {
  if (!videoSendInitialBitrate) {
    return sdp;
  }

  // Validate the initial bitrate value.
  var maxBitrate = videoSendInitialBitrate;
  if (videoSendBitrate) {
    if (videoSendInitialBitrate > videoSendBitrate) {
      displayError('Clamping initial bitrate to max bitrate of ' +
          videoSendBitrate + ' kbps.');
      videoSendInitialBitrate = videoSendBitrate;
    }
    maxBitrate = videoSendBitrate;
  }

  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === null) {
    displayError('Failed to find video m-line');
    return sdp;
  }

  var vp8RtpmapIndex = findLine(sdpLines, 'a=rtpmap', 'VP8/90000');
  var vp8Payload = getCodecPayloadType(sdpLines[vp8RtpmapIndex]);
  var vp8Fmtp = 'a=fmtp:' + vp8Payload + ' x-google-min-bitrate=' +
     videoSendInitialBitrate.toString() + '; x-google-max-bitrate=' +
     maxBitrate.toString();
  sdpLines.splice(vp8RtpmapIndex + 1, 0, vp8Fmtp);
  return sdpLines.join('\r\n');
}

// Promotes |audioSendCodec| to be the first in the m=audio line, if set.
function maybePreferAudioSendCodec(sdp) {
  if (audioSendCodec === '') {
    trace('No preference on audio send codec.');
    return sdp;
  }
  trace('Prefer audio send codec: ' + audioSendCodec);
  return preferAudioCodec(sdp, audioSendCodec);
}

// Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
function maybePreferAudioReceiveCodec(sdp) {
  if (audioRecvCodec === '') {
    trace('No preference on audio receive codec.');
    return sdp;
  }
  trace('Prefer audio receive codec: ' + audioRecvCodec);
  return preferAudioCodec(sdp, audioRecvCodec);
}

// Sets |codec| as the default audio codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function preferAudioCodec(sdp, codec) {
  var fields = codec.split('/');
  if (fields.length != 2) {
    trace('Invalid codec setting: ' + codec);
    return sdp;
  }

  // var name = fields[0];
  // var rate = fields[1];
  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = findLine(sdpLines, 'm=', 'audio');
  if (mLineIndex === null)
    return sdp;

  // If the codec is available, set it as the default in m line.
  var codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
  if (codecIndex) {
    var payload = getCodecPayloadType(sdpLines[codecIndex]);
    if (payload) {
      sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Sets Opus in stereo if stereo is enabled, by adding the stereo=1 fmtp param.
function addStereo(sdp) {
  var sdpLines = sdp.split('\r\n');

  // Find opus payload.
  var opusIndex = findLine(sdpLines, 'a=rtpmap', 'opus/48000'), opusPayload;
  if (opusIndex) {
    opusPayload = getCodecPayloadType(sdpLines[opusIndex]);
  }

  // Find the payload in fmtp line.
  var fmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + opusPayload.toString());
  if (fmtpLineIndex === null)
    return sdp;

  // Append stereo=1 to fmtp line.
  sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat(' stereo=1');

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines, prefix, substr) {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
  var realEndLine = (endLine != -1) ? endLine : sdpLines.length;
  for (var i = startLine; i < realEndLine; ++i) {
    if (sdpLines[i].indexOf(prefix) === 0) {
      if (!substr ||
          sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadType(sdpLine) {
  var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
  var result = sdpLine.match(pattern);
  return (result && result.length == 2) ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
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

// Send a BYE on refreshing or leaving a page
// to ensure the room is cleaned up for the next session.
window.onbeforeunload = function() {
  sendMessage({type: 'bye'});
};

function displaySharingInfo() {
  emailInput.onkeydown = function (e) {
    if (e.keyCode === 13) {
      sendEmail();
    }
  };
  emailButton.onclick = sendEmail;
  sharingDiv.classList.add('active');
}

function sendEmail() {
  var subject = 'Join me for a video chat!';
  var body = 'Please join me at the following address:\n\n' + location.href;
  var a = document.createElement('a');
  a.href = 'mailto:' + emailInput.value + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  a.target = '_blank';
  a.click();
}

function toggleRemoteVideoElementMuted() {
  setRemoteVideoElementMuted(!remoteVideo.muted);
}

function setRemoteVideoElementMuted(mute) {
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

function showHeader() {
  if (!header.classList.contains('active')) {
    header.classList.add('active');
    setTimeout(function () {
      header.classList.remove('active');
    }, 5000);
  }
}

document.body.onmousemove = showHeader;

var isGetSourcesSupported = MediaStreamTrack && MediaStreamTrack.getSources;

try {
  if (isGetSourcesSupported) {
    MediaStreamTrack.getSources(gotSources);
  } else {
    trace('This browser does not support MediaStreamTrack.getSources().');
  }
} catch (e) {
    trace('This browser does not support MediaStreamTrack.getSources().');
    trace('getUserMedia failed with exception: ' + e.message);
}

var videoSources = [];

function gotSources(sources) {
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

function changeCamera() {
  // do icon animation
  cameraIcon.classList.add('activated');
  setTimeout(function () {
    cameraIcon.classList.remove('activated');
    header.classList.remove('active');
  }, 1000);

  // check if sourceId has already been set
  var sourceIdObj;
  var videoOptional = mediaConstraints.video.optional;
  if (!!videoOptional) {
    for (i = 0; i !== videoOptional.length; ++i) {
      if (videoOptional[i].hasOwnProperty('sourceId')) {
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
    mediaConstraints.video = {
      optional: [{
        'sourceId': videoSources[1].id
      }]
    };
  }
  doGetUserMedia();
}

function displayStatus(status) {
  statusDiv.classList.remove('warning');
  if (status === '') {
    statusDiv.classList.remove('active');
  } else {
    statusDiv.classList.add('active');
  }
  statusDiv.innerHTML = status;
}

function displayError(error) {
  trace(error);
  errorMessages.push(error);
  updateInfoDiv();
}

// Google+ sharing
window.___gcfg = {
  lang: 'en-GB'
};
(function () {
  var po = document.createElement('script');
  po.type = 'text/javascript';
  po.async = true;
  po.src = 'https://apis.google.com/js/platform.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(po, s);
})();
