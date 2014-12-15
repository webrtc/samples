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
/* exported doGetUserMedia, enterFullScreen, initialize, onHangup */

// Variables defined in and used from util.js.
/* globals doGetUserMedia, maybeRequestTurn */
/* exported xmlhttp, onUserMediaSuccess, onUserMediaError */

// Variables defined in and used from infobox.js.
/* globals showInfoDiv, toggleInfoDiv, updateInfoDiv */
/* exported getStatsTimer, infoDiv */

// Variables defined in and used from stats.js.
/* exported prevStats, stats */

// Variables defined in and used from signaling.js.
/* globals openChannel, maybeStart, sendMessage */
/* exported channelReady, gatheredIceCandidateTypes, sdpConstraints, turnDone,
onRemoteHangup, waitForRemoteVideo */

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

var muteAudioSvg = $('#mute_audio');
var muteVideoSvg = $('#mute_video');
var switchVideoSvg = $('#switch_video');
var fullscreenSvg = $('#fullscreen');
var hangupSvg = $('#hangup');

var muteAudioOnIcon = $('#mute_audio_on');
var muteAudioOffIcon = $('#mute_audio_off');
var muteVideoOnIcon = $('#mute_video_on');
var muteVideoOffIcon = $('#mute_video_off');
var fullscreenOnIcon = $('#fullscreen_on');
var fullscreenOffIcon = $('#fullscreen_off');

muteAudioSvg.onclick = toggleAudioMute;
muteVideoSvg.onclick = toggleVideoMute;
switchVideoSvg.onclick = switchVideo;
fullscreenSvg.onclick = toggleFullScreen;
hangupSvg.onclick = hangup;



var channelReady = false;
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

var signalingReady = false;
var socket;
var started = false;
var startTime;
var endTime;
var stats;
var prevStats;
var turnDone = false;
var xmlhttp;

function initialize() {
  var roomErrors = params.errorMessages;
  if (roomErrors.length > 0) {
    console.log(roomErrors);
    for (var i = 0; i < roomErrors.length; ++i) {
      window.alert(roomErrors[i]);
    }
    return;
  }

  trace('Initializing; room=' + params.roomId + '.');

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
}

function onUserMediaSuccess(stream) {
  trace('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localStream = stream;
  // Caller creates PeerConnection.
  maybeStart();
  displayStatus('');
  if (params.isInitiator === 0) {
    displaySharingInfo();
  }
  localVideo.classList.add('active');
}

function onUserMediaError(error) {
  var errorMessage = 'Failed to get access to local media. Error name was ' +
  error.name + '. Continuing without sending a stream.';
  displayError(errorMessage);
  alert(errorMessage);

  hasLocalStream = false;
  maybeStart();
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
  params.isInitiator = 0;
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
  show(icons);
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
  hide(icons);
  setTimeout(function() {
    localVideo.src = miniVideo.src;
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
  hide(icons);
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
    show(icons);
    toggleAudioMute();
    return false;
    case 'c':
    show(icons);
    toggleVideoMute();
    return false;
    case 'f':
    show(icons);
    toggleFullScreen();
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
  sendMessage({
    type: 'bye'
  });
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

function toggleFullScreen() {
  try {
    // TODO: add shim so not Chrome only
    if (document.webkitIsFullScreen) {
      document.webkitCancelFullScreen();
      show(fullscreenOnIcon);
      hide(fullscreenOffIcon);
    } else {
      videosDiv.webkitRequestFullScreen();
      remoteCanvas.webkitRequestFullScreen();
      show(fullscreenOffIcon);
      hide(fullscreenOnIcon);
    }
  } catch (event) {
    trace(event);
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

// function activate(element){
//   element.classList.add('active');
// }

function deactivate(element){
  element.classList.remove('active');
}
