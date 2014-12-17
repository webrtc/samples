/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

 /* More information about these options at jshint.com/docs/options */

// Variables defined in and used from apprtc/index.html.
/* globals params, setupStereoscopic */
/* exported initialize */

// Variables defined in and used from util.js.
/* globals doGetUserMedia */
/* exported onUserMediaSuccess, onUserMediaError */

// Variables defined in and used from infobox.js.
/* globals showInfoDiv, toggleInfoDiv, updateInfoDiv */
/* exported getStatsTimer, infoDiv */

// Variables defined in and used from stats.js.
/* exported prevStats, stats */

// Variables defined in and used from signaling.js.
<<<<<<< HEAD
/* globals openChannel, maybeStart, sendMessage */
/* exported channelReady, gatheredIceCandidateTypes, sdpConstraints, turnDone,
onRemoteHangup, waitForRemoteVideo */
=======
/* globals connectToRoom, hasReceivedOffer:true, isSignalingChannelReady:true,
   messageQueue, sendWSSMessage, startSignaling */
/* exported gatheredIceCandidateTypes, sdpConstraints, onRemoteHangup,
   waitForRemoteVideo */

// Variables defined in and used from loopback.js.
/* globals setupLoopback */
>>>>>>> 6a1b066c262380571c2d8d3cc6b6b1a0222b2364

'use strict';

var icons = $('#icons');
var infoDiv = $('#info');
var localVideo = $('#local-video');
var miniVideo = $('#mini-video');
var remoteCanvas = $('#remote-canvas');
var remoteVideo = $('#remote-video');
var sharingDiv = $('#sharing');
var statusDiv = $('#status');
var videosDiv = $('#videos');

var muteAudioSvg = $('#mute-audio');
var muteVideoSvg = $('#mute-video');
var switchVideoSvg = $('#switch-video');
var fullscreenSvg = $('#fullscreen');
var hangupSvg = $('#hangup');

var muteAudioOnIcon = $('#mute-audio-on');
var muteAudioOffIcon = $('#mute-audio-off');
var muteVideoOnIcon = $('#mute-video-on');
var muteVideoOffIcon = $('#mute-video-off');
var fullscreenOnIcon = $('#fullscreen-on');
var fullscreenOffIcon = $('#fullscreen-off');

muteAudioSvg.onclick = toggleAudioMute;
muteVideoSvg.onclick = toggleVideoMute;
switchVideoSvg.onclick = switchVideo;
fullscreenSvg.onclick = toggleFullscreen;
hangupSvg.onclick = hangup;



// Types of gathered ICE Candidates.
var gatheredIceCandidateTypes = {
  Local: {},
  Remote: {}
};
var getStatsTimer;
var errorMessages = [];
var isAudioMuted = false;
var isVideoMuted = false;
var localStream;
var pc = null;
var remoteStream;
// Set up audio and video regardless of what devices are present.
// Disable comfort noise for maximum audio quality.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  },
  'optional': [{
    'VoiceActivityDetection': false
  }]
};

var webSocket;
var startTime;
var endTime;
var stats;
var prevStats;

function initialize() {
<<<<<<< HEAD
  show(icons); // if hidden by hangup()
=======
  // We don't want to continue if this is triggered from Chrome prerendering,
  // since it will register the user to GAE without cleaning it up, causing
  // the real navigation to get a "full room" error. Instead we'll initialize
  // once the visibility state changes to non-prerender.
  if (document.webkitVisibilityState === 'prerender') {
    document.addEventListener('webkitvisibilitychange', onVisibilityChange);
    return;
  }

>>>>>>> 6a1b066c262380571c2d8d3cc6b6b1a0222b2364
  var roomErrors = params.errorMessages;
  if (roomErrors.length > 0) {
    console.log(roomErrors);
    for (var i = 0; i < roomErrors.length; ++i) {
      window.alert(roomErrors[i]);
    }
    return;
  }
<<<<<<< HEAD

=======
  document.body.ondblclick = toggleFullScreen;
>>>>>>> 6a1b066c262380571c2d8d3cc6b6b1a0222b2364
  trace('Initializing; room=' + params.roomId + '.');
  connectToRoom(params.roomId);
  if (params.isLoopback) {
    setupLoopback();
  }
}

<<<<<<< HEAD
  // NOTE: AppRTCClient.java searches & parses this line; update there when
  // changing here.
  openChannel();
  maybeRequestTurn();

  // Caller is always ready to create peerConnection.
  signalingReady = params.isInitiator;

  if (params.mediaConstraints.audio === false &&
      params.mediaConstraints.video === false) {
    hasLocalStream = false;
  maybeStart();
} else {
  hasLocalStream = true;
  doGetUserMedia();
}
=======
function onVisibilityChange() {
  if (document.webkitVisibilityState === 'prerender') {
    return;
  }
  document.removeEventListener('webkitvisibilitychange', onVisibilityChange);
  initialize();
>>>>>>> 6a1b066c262380571c2d8d3cc6b6b1a0222b2364
}

function onUserMediaSuccess(stream) {
  trace('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localStream = stream;
  // Caller creates PeerConnection.
  displayStatus('');
  if (params.isInitiator) {
    displaySharingInfo();
  }
  localVideo.classList.add('active');
}

function onUserMediaError(error) {
  var errorMessage = 'Failed to get access to local media. Error name was ' +
  error.name + '. Continuing without sending a stream.';
  displayError(errorMessage);
  alert(errorMessage);
}

function hangup() {
  trace('Hanging up.');
  displayStatus('Hanging up');
  hide(icons);
  transitionToDone();
  localStream.stop();
  stop();
  disconnectFromRoom();
}

function disconnectFromRoom() {
  // Send bye to GAE. This must complete before saying BYE to other client.
  // When the other client sees BYE it attempts to post offer and candidates to
  // GAE. GAE needs to know that we're disconnected at that point otherwise
  // it will forward messages to this client instead of storing them.
  path = '/bye/' + params.roomId + '/' + params.clientId;
  xhr = new XMLHttpRequest();
  xhr.open('POST', path, false);
  xhr.send();

  // Send bye to other client.
  if (webSocket) {
    sendWSSMessage({ type: 'bye' });
    webSocket.close();
    webSocket = null;
    isSignalingChannelReady = false;
  }

  // Tell WSS that we're done.
  var path = params.wssPostUrl + '/' + params.roomId + '/' + params.clientId;
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', path, false);
  xhr.send();
}

function onRemoteHangup() {
  displayStatus('The remote side hung up.');
  transitionToWaiting();
  stop();
  // On remote hangup this client becomes the new initiator.
  params.isInitiator = true;
  startSignaling();
}

function stop() {
  isAudioMuted = false;
  isVideoMuted = false;
  pc.close();
  pc = null;
  remoteStream = null;
  hasReceivedOffer = false;
  params.messages.length = 0;
  messageQueue.length = 0;
}

function waitForRemoteVideo() {
  // Wait for the actual video to start arriving before moving to the active
  // call state.
  if (remoteVideo.readyState >= 2) {  // i.e. can play
    trace('Remote video started; currentTime: ' + remoteVideo.currentTime);
    transitionToActive();
  } else {
    remoteVideo.oncanplay = waitForRemoteVideo;
  }
}

function transitionToActive() {
  // Stop waiting for remote video.
  remoteVideo.oncanplay = undefined;
  endTime = window.performance.now();
  trace('Call setup time: ' + (endTime - startTime).toFixed(0) + 'ms.');
  updateInfoDiv();

  // Prepare the remote video and PIP elements.
  if (params.isStereoscopic) {
    deactivate(miniVideo);
    hide(miniVideo);
    setupStereoscopic(remoteVideo, remoteCanvas);
  } else {
    reattachMediaStream(miniVideo, localVideo);
  }

  // Transition opacity from 0 to 1 for the remote and mini videos.
  remoteVideo.classList.add('active');
  miniVideo.classList.add('active');
    show(hangupSvg);
  // Transition opacity from 1 to 0 for the local video.
  deactivate(localVideo);
  localVideo.src = '';
  // Rotate the div containing the videos 180 deg with a CSS transform.
  videosDiv.classList.add('active');
  displayStatus('');
}

function transitionToWaiting() {
   // Stop waiting for remote video.
   remoteVideo.oncanplay = undefined;
   startTime = null;
  // Rotate the div containing the videos -180 deg with a CSS transform.
  deactivate(videosDiv);
  hide(hangupSvg);
  setTimeout(function() {
    if (miniVideo.src) {
      localVideo.src = miniVideo.src;
    }
    miniVideo.src = '';
    remoteVideo.src = '';
  }, 800);
  // Transition opacity from 0 to 1 for the local video.
  localVideo.classList.add('active');
  // Transition opacity from 1 to 0 for the remote and mini videos.
  deactivate(remoteVideo);
  deactivate(miniVideo);
}

function transitionToDone() {
  // Stop waiting for remote video.
  remoteVideo.oncanplay = undefined;
  deactivate(localVideo);
  deactivate(remoteVideo);
  deactivate(miniVideo);
  hide(hangupSvg);
  displayStatus('You have left the call. <a href=\'' + params.roomLink +
      '\'>Click here</a> to rejoin.');
}

function toggleVideoMute() {
  var videoTracks = localStream.getVideoTracks();
  if (videoTracks.length === 0) {
    trace('No local video available.');
    return;
  }

  var newMuted = !isVideoMuted;
  trace('Toggling video mute state.');
  for (var i = 0; i < videoTracks.length; ++i) {
    videoTracks[i].enabled = !newMuted;
  }

  isVideoMuted = newMuted;
  trace('Video ' + (isVideoMuted ? 'muted.' : 'unmuted.'));

  if (isVideoMuted) {
    hide(muteVideoOffIcon);
    show(muteVideoOnIcon);
  } else {
    hide(muteVideoOnIcon);
    show(muteVideoOffIcon);
  }
}

function toggleAudioMute() {
  var audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    trace('No local audio available.');
    return;
  }

  var newMuted = !isAudioMuted;
  trace('Toggling audio mute state.');
  for (var i = 0; i < audioTracks.length; ++i) {
    audioTracks[i].enabled = !newMuted;
  }

  isAudioMuted = newMuted;
  trace('Audio ' + (isAudioMuted ? 'muted.' : 'unmuted.'));

  if (isAudioMuted) {
    hide(muteAudioOffIcon);
    show(muteAudioOnIcon);
  } else {
    hide(muteAudioOnIcon);
    show(muteAudioOffIcon);
  }
}

// Return false to screen out original Chrome shortcuts.
document.onkeypress = function(event) {
  switch (String.fromCharCode(event.charCode)) {
    case ' ':
    case 'm':
    show(hangupSvg);
    toggleAudioMute();
    return false;
    case 'c':
    show(hangupSvg);
    toggleVideoMute();
    return false;
    case 'f':
    show(hangupSvg);
    toggleFullscreen();
    return false;
    case 'i':
    toggleInfoDiv();
    return false;
    case 'q':
    hangup();
    return false;
    default:
    return;
  }
};

// Send a BYE on refreshing or leaving a page
// to ensure the room is cleaned up for the next session.
window.onbeforeunload = function() {
  disconnectFromRoom();
};

function displaySharingInfo() {
  sharingDiv.classList.add('active');
}

function displayStatus(status) {
  if (status === '') {
    deactivate(statusDiv);
  } else {
    statusDiv.classList.add('active');
  }
  statusDiv.innerHTML = status;
}

function displayError(error) {
  trace(error);
  errorMessages.push(error);
  updateInfoDiv();
  showInfoDiv();
}

//////////////////// maybe this should go in adapter.js? /////////////

document.cancelFullScreen = document.webkitCancelFullScreen ||
document.mozCancelFullScreen || document.cancelFullScreen;

document.body.requestFullScreen = document.body.webkitRequestFullScreen ||
document.body.mozRequestFullScreen || document.body.requestFullScreen;

// document.onfullscreenchange = document.onwebkitfullscreenchange =
//   document.onmozfullscreenchange;

function isFullScreen(){
  return !!(document.webkitIsFullScreen || document.mozFullScreen ||
    document.isFullScreen); // if any defined and true
}

// function fullScreenElement(){
//   return document.webkitFullScreenElement || document.webkitCurrentFullScreenElement ||
//     document.mozFullScreenElement || document.fullScreenElement;
// }

function toggleFullscreen(){
  if (isFullScreen()) {
    document.cancelFullScreen();
    show(fullscreenOffIcon);
    hide(fullscreenOnIcon);
  } else {
    document.body.requestFullScreen();
    show(fullscreenOnIcon);
    hide(fullscreenOffIcon);
  }
}

// function toggleRemoteVideoElementMuted() {
//   setRemoteVideoElementMuted(!remoteVideo.muted);
// }

// function setRemoteVideoElementMuted(mute) {
//   if (mute) {
//     remoteVideo.muted = true;
//     remoteVideo.title = 'Unmute audio';
//     mic.classList.add('active');
//     lmic.setItem('mute', 'true');
//   } else {
//     remoteVideo.muted = false;
//     remoteVideo.title = 'Mute audio';
//     deactivate(mic);
//   mic.setItem('mute', 'false');
//   }
// }

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
  for (var i = 0; i !== sources.length; ++i) {
    var source = sources[i];
    if (source.kind === 'video') {
      videoSources.push(source);
    }
  }
  // if more than one camera available, show the camera icon
  if (videoSources.length > 1) {
    show(switchVideoSvg);
  }
}

function switchVideo() {
  displayStatus('Camera switching is coming soon. For the moment, the person on the other end of the call will need to refresh their page to see the change of camera.');

  setTimeout(function(){displayStatus('');}, 5000);

  // do icon animation
  // activate(switchVideoSvg);
  // setTimeout(function() {
  //   switchVideoSvg.classList.remove('activated');
  // }, 1000);

  // check if sourceId has already been set
  var sourceIdObj;
  var videoOptional = params.mediaConstraints.video.optional;
  if ( !! videoOptional) {
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
    params.mediaConstraints.video = {
      optional: [{
        'sourceId': videoSources[1].id
      }]
    };
  }
  doGetUserMedia();
}

function $(selector){
  return document.querySelector(selector);
}

function hide(element){
  element.classList.add('hidden');
}

function show(element){
  element.classList.remove('hidden');
}

function activate(element){
  element.classList.add('active');
}

function deactivate(element){
  element.classList.remove('active');
}

function showIcons() {
  if (!icons.classList.contains('active')) {
    activate(icons);
    setTimeout(function() {
      deactivate(icons);
    }, 5000);
  }
}

window.onmousemove = showIcons;

