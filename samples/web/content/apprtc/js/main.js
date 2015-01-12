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
/* globals isFullScreen */
/* exported onUserMediaSuccess, onUserMediaError */

// Variables defined in and used from infobox.js.
/* globals showInfoDiv, toggleInfoDiv, updateInfoDiv */
/* exported getStatsTimer, infoDiv */

// Variables defined in and used from stats.js.
/* exported prevStats, stats */

// Variables defined in and used from signaling.js.
/* globals connectToRoom, hasReceivedOffer:true, isSignalingChannelReady:true,
   messageQueue, sendWSSMessage, startSignaling */
/* exported gatheredIceCandidateTypes, sdpConstraints, onRemoteHangup,
   waitForRemoteVideo, displaySharingInfo */

// Variables defined in and used from loopback.js.
/* globals setupLoopback */

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
var fullscreenSvg = $('#fullscreen');
var hangupSvg = $('#hangup');

var muteAudioIconSet = new IconSet('#mute-audio-on', '#mute-audio-off');
var muteVideoIconSet = new IconSet('#mute-video-on', '#mute-video-off');
var fullscreenIconSet = new IconSet('#fullscreen-on', '#fullscreen-off');

muteAudioSvg.onclick = toggleAudioMute;
muteVideoSvg.onclick = toggleVideoMute;
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
var transitionToWaitingTimer = null;

function initialize() {
  // We don't want to continue if this is triggered from Chrome prerendering,
  // since it will register the user to GAE without cleaning it up, causing
  // the real navigation to get a "full room" error. Instead we'll initialize
  // once the visibility state changes to non-prerender.
  if (document.webkitVisibilityState === 'prerender') {
    document.addEventListener('webkitvisibilitychange', onVisibilityChange);
    return;
  }
  
  if (!params.roomServer)
  {
    params.roomServer = '';
  }

  var roomErrors = params.errorMessages;
  if (roomErrors.length > 0) {
    console.log(roomErrors);
    for (var i = 0; i < roomErrors.length; ++i) {
      window.alert(roomErrors[i]);
    }
    return;
  }

  trace('Initializing; room=' + params.roomId + '.');
  connectToRoom(params.roomServer, params.roomId);
  if (params.isLoopback) {
    setupLoopback();
  }
}

function onVisibilityChange() {
  if (document.webkitVisibilityState === 'prerender') {
    return;
  }
  document.removeEventListener('webkitvisibilitychange', onVisibilityChange);
  initialize();
}

function onUserMediaSuccess(stream) {
  trace('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localStream = stream;
  // Caller creates PeerConnection.
  displayStatus('');
  activate(localVideo);
  show(icons);
}

function onUserMediaError(error) {
  var errorMessage = 'Failed to get access to local media. Error name was ' +
      error.name + '. Continuing without sending a stream.';
  displayError(errorMessage);
  alert(errorMessage);
}

function hangup() {
  hide(icons);
  trace('Hanging up.');
  displayStatus('Hanging up');
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

  path = params.roomServer + '/bye/' + params.roomId + '/' + params.clientId;
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

  if (transitionToWaitingTimer) {
    clearTimeout(transitionToWaitingTimer);
    transitionToWaitingTimer = null;
  }

  // Prepare the remote video and PIP elements.
  if (params.isStereoscopic) {
    deactivate(miniVideo);
    hide(miniVideo);
    setupStereoscopic(remoteVideo, remoteCanvas);
  } else {
    reattachMediaStream(miniVideo, localVideo);
  }

  // Transition opacity from 0 to 1 for the remote and mini videos.
  activate(remoteVideo);
  activate(miniVideo);
  // Transition opacity from 1 to 0 for the local video.
  deactivate(localVideo);
  localVideo.src = '';
  // Rotate the div containing the videos 180 deg with a CSS transform.
  activate(videosDiv);
  show(hangupSvg);
  displayStatus('');
}

function transitionToWaiting() {
   // Stop waiting for remote video.
  remoteVideo.oncanplay = undefined;
  startTime = null;
  // Rotate the div containing the videos -180 deg with a CSS transform.
  hide(hangupSvg);
  deactivate(videosDiv);

  transitionToWaitingTimer = setTimeout(function() {
    transitionToWaitingTimer = null;
    miniVideo.src = '';
    remoteVideo.src = '';
  }, 800);

  // Set localVideo.src now so that the local stream won't be lost if the call
  // is restarted before the timeout.
  localVideo.src = miniVideo.src;

  // Transition opacity from 0 to 1 for the local video.
  activate(localVideo);
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
  muteVideoIconSet.toggle();
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
  muteAudioIconSet.toggle();
}

// Spacebar, or m: toggle audio mute.
// c: toggle camera(video) mute.
// f: toggle fullscreen.
// i: toggle info panel.
// q: quit (hangup)
// Return false to screen out original Chrome shortcuts.
document.onkeypress = function(event) {
  switch (String.fromCharCode(event.charCode)) {
    case ' ':
    case 'm':
      toggleAudioMute();
      return false;
    case 'c':
      toggleVideoMute();
      return false;
    case 'f':
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
  activate(sharingDiv);
}

function displayStatus(status) {
  if (status === '') {
    deactivate(statusDiv);
  } else {
    activate(statusDiv);
  }
  statusDiv.innerHTML = status;
}

function displayError(error) {
  trace(error);
  errorMessages.push(error);
  updateInfoDiv();
  showInfoDiv();
}

function toggleFullscreen(){
  if (isFullScreen()) {
    document.cancelFullScreen();
  } else {
    document.body.requestFullScreen();
  }
  fullscreenIconSet.toggle();
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

function IconSet(icon0, icon1){
  this.icon0 = document.querySelector(icon0);
  this.icon1 = document.querySelector(icon1);
}

IconSet.prototype.toggle = function() {
  if (this.icon0.classList.contains('hidden')){
    this.icon0.classList.remove('hidden');
  } else {
    this.icon0.classList.add('hidden');
  }

  if (this.icon1.classList.contains('hidden')){
    this.icon1.classList.remove('hidden');
  } else {
    this.icon1.classList.add('hidden');
  }
};

function showIcons() {
  if (!icons.classList.contains('active')) {
    activate(icons);
    setTimeout(function() {
      deactivate(icons);
    }, 5000);
  }
}

window.onmousemove = showIcons;

