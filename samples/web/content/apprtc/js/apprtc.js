/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

// Directives for JSHint checking (see jshint.com/docs/options).
// globals: variables defined in apprtc/index.html
/* global config, setupStereoscopic */

'use strict';

var apprtc = apprtc || {};

(function() {

var Log = apprtc.Log;
var SignalingManager = apprtc.SignalingManager;
var Stats = apprtc.Stats;

/*
 * Handles all UI interactions and creates requisite model objects.
 */
var App = apprtc.App = function() {
  Log.info('Initializing AppRTC; room=' + config.roomId + '.');

  // Grab references to DOM elemnts.
  this.cardDiv = document.getElementById('card');
  this.containerDiv = document.getElementById('container');
  this.localVideoElt = document.getElementById('localVideo');
  this.miniVideoElt = document.getElementById('miniVideo');
  this.remoteCanvasElt = document.getElementById('remoteCanvas');
  this.remoteVideoElt = document.getElementById('remoteVideo');
  this.statusDiv = document.getElementById('status');

  // DOM element events.
  this.onResize = this.onResize.bind(this);
  this.onDblClick = this.onDblClick.bind(this);
  this.onTouchEnd = this.onTouchEnd.bind(this);
  this.onKeyDown = this.onKeyDown.bind(this);
  this.localVideoElt.addEventListener('loadedmetadata', this.onResize);
  this.containerDiv.addEventListener('dblclick', this.onDblClick);
  this.containerDiv.addEventListener('touchend', this.onTouchEnd);
  window.addEventListener('keydown', this.onKeyDown);
  window.addEventListener('resize', this.onResize);

  // Create signaling manager. Manager will request media, handle call
  // connection and publish relevant events when we receive media.
  // Config object is passed in from App Engine in global scope.
  this.config = config;
  this.signalingManager = new SignalingManager(this.config);

  // Create stats.
  this.stats = new Stats(this.signalingManager);

  // Create info box.
  this.infoBox = new apprtc.InfoBox(
      document.getElementById('infoDiv'), this.stats);

  // Subscribe to relevant topics.
  this.subscriptions = {};
  this.subscriptions[SignalingManager.LOCAL_STREAM_TOPIC] =
      this.onLocalStream.bind(this);
  this.subscriptions[SignalingManager.REMOTE_STREAM_TOPIC] =
      this.onRemoteStream.bind(this);
  this.subscriptions[SignalingManager.REMOTE_VIDEO_NONE_TOPIC] =
      this.onRemoteVideoNone.bind(this);
  this.subscriptions[SignalingManager.REMOTE_VIDEO_PENDING_TOPIC] =
      this.onRemoteVideoPending.bind(this);
  this.subscriptions[SignalingManager.REMOTE_HANGUP_TOPIC] =
      this.onRemoteHangup.bind(this);
  apprtc.pubsub.subscribeAll(this.subscriptions);

  // Setup UI.
  this.localStream = null;
  this.remoteStream = null;
  this.isVideoMuted = false;
  this.isAudioMuted = false;
  this.resetStatusMessage();
};

// Cleanup.
App.prototype.shutdown = function() {
  if (this.localStream) {
    this.localStream.stop();
    this.localStream = null;
  }
  this.remoteStream = null;
  apprtc.pubsub.unsubscribeAll(this.subscriptions);
  apprtc.pubsub.clear();
  this.infoBox.shutdown();
  this.infoBox = null;
  this.stats.shutdown();
  this.stats = null;
  this.signalingManager.shutdown();
  this.signalingManager = null;

  window.removeEventListener('resize', this.onResize);
  window.removeEventListener('keydown', this.onKeyDown);
  this.containerDiv.removeEventListener('touchend', this.onTouchEnd);
  this.containerDiv.removeEventListener('dblclick', this.onDblClick);
  this.localVideoElt.removeEventListener('loadedmetadata', this.onResize);
};

// Sets the HTML for the status element.
App.prototype.setStatusMessage = function(message) {
  this.statusDiv.innerHTML = message;
};

// Resets the status message based on whether or not we're the caller.
App.prototype.resetStatusMessage = function() {
  if (!this.signalingManager.isInitiator) {
    var roomLink = this.config.roomLink;
    this.setStatusMessage(
        'Waiting for someone to join: <a href=' + roomLink + '>' +
        roomLink + '</a>');
  } else {
    this.setStatusMessage('Initializing...');
  }
};

// Waits for the remote video attached to the remote video element to start
// playing, then transitions the call to an active state.
App.prototype.waitForRemoteVideo = function() {
  // Wait for the actual video to start arriving before moving to the active
  // call state.
  if (this.remoteVideoElt.currentTime > 0) {
    this.transitionToActive();
  } else {
    setTimeout(this.waitForRemoteVideo.bind(this), 10);
  }
};

// Sets the app into an active video call state. This makes the remote video
// the main view on the screen with a local video view in the corner.
App.prototype.transitionToActive = function() {
  apprtc.perf.record(apprtc.perf.PEER_CONNECTION_SCENARIO);
  // Prepare the remote video and PIP elements.
  if (this.config.stereoscopic) {
    setupStereoscopic(this.remoteVideoElt, this.remoteCanvasElt);
  } else {
    reattachMediaStream(this.miniVideoElt, this.localVideoElt);
  }
  this.miniVideoElt.style.opacity = 1;
  this.remoteVideoElt.style.opacity = 1;
  // Spin the card to show remote video (800 ms). Set a timer to detach the
  // local video once the transition completes.
  this.cardDiv.style.webkitTransform = 'rotateY(180deg)';
  var localVideoElt = this.localVideoElt;
  setTimeout(function() {
    localVideoElt.src = '';
  }, 800);
  // Reset window display according to the aspect ratio of remote video.
  this.onResize();
  this.setStatusMessage(
      '<input type=\'button\' id=\'hangup\' value=\'Hang up\' />');
  // TODO(tkchin): do something better. Pending merge of separate UI CL.
  var button = document.getElementById('hangup');
  button.addEventListener('click', this.onHangup.bind(this));
};

// Sets the app into a done state. The videos are hidden.
App.prototype.transitionToDone = function() {
  this.localVideoElt.style.opacity = 0;
  this.remoteVideoElt.style.opacity = 0;
  this.miniVideoElt.style.opacity = 0;
  this.setStatusMessage('You have left the call. <a href=' + 
                        this.config.roomLink +
                        '>Click here</a> to rejoin.');
};

// Sets the app into a waiting state. We display local stream only.
App.prototype.transitionToWaiting = function() {
  // Prepare the local video element.
  reattachMediaStream(this.localVideoElt, this.miniVideoElt);
  this.miniVideoElt.style.opacity = 0;
  this.remoteVideoElt.style.opacity = 0;
  // Spin the card to show local video (800 ms). Set a timer to detach the
  // remote and PIP video once the transition completes.
  this.cardDiv.style.webkitTransform = 'rotateY(0deg)';
  setTimeout((function() {
    this.miniVideoElt.src = '';
    this.remoteVideoElt.src = '';
  }).bind(this), 800);
  this.resetStatusMessage();
};

// Mutes/unmutes the video.
App.prototype.toggleVideoMute = function() {
  // Call the getVideoTracks method via adapter.js.
  var videoTracks = this.localStream.getVideoTracks();

  if (videoTracks.length === 0) {
    Log.info('No local video available.');
    return;
  }

  Log.info('Toggling video mute state.');
  var i;
  if (this.isVideoMuted) {
    for (i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = true;
    }
    Log.info('Video unmuted.');
  } else {
    for (i = 0; i < videoTracks.length; i++) {
      videoTracks[i].enabled = false;
    }
    Log.info('Video muted.');
  }

  this.isVideoMuted = !this.isVideoMuted;
};

// Mutes/unmutes the audio.
App.prototype.toggleAudioMute = function() {
  // Call the getAudioTracks method via adapter.js.
  var audioTracks = this.localStream.getAudioTracks();

  if (audioTracks.length === 0) {
    Log.info('No local audio available.');
    return;
  }

  Log.info('Toggling audio mute state.');
  var i;
  if (this.isAudioMuted) {
    for (i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = true;
    }
    Log.info('Audio unmuted.');
  } else {
    for (i = 0; i < audioTracks.length; i++) {
      audioTracks[i].enabled = false;
    }
    Log.info('Audio muted.');
  }

  this.isAudioMuted = !this.isAudioMuted;
};

// Enters full screen mode.
App.prototype.enterFullScreen = function(isCanvas) {
  // When full-screening the canvas we want to avoid the extra spacing
  // introduced by the containing div, but when full-screening the rectangular
  // view we want to keep the full container visible (including e.g. miniVideo).
  var elt = isCanvas ? this.remoteCanvasElt : this.containerDiv;
  elt.webkitRequestFullScreen();
};

//
// Topic handlers.
//

App.prototype.onLocalStream = function(data) {
  // Attaches stream to video element and displays it.
  // Call the polyfill wrapper to attach the media stream to this element.
  var stream = data.stream;
  attachMediaStream(this.localVideoElt, stream);
  this.localVideoElt.style.opacity = 1;
  this.localStream = stream;
};

App.prototype.onRemoteStream = function(data) {
  this.remoteStream = data.stream;
  attachMediaStream(this.remoteVideoElt, this.remoteStream);
};

App.prototype.onRemoteVideoNone = function() {
  Log.info('No remote video stream; not waiting for media to arrive.');
  this.transitionToActive();
};

App.prototype.onRemoteVideoPending = function() {
  Log.info('Waiting for remote video.');
  this.waitForRemoteVideo();
};

App.prototype.onRemoteHangup = function() {
  Log.info('Session terminated.');
  this.remoteStream = null;
  this.isAudioMuted = false;
  this.isVideoMuted = false;
  this.transitionToWaiting();
};

//
// DOM event handlers.
//

// Called when container is double clicked. Fullscreens the application.
App.prototype.onDblClick = function(event) {
  this.enterFullScreen(event.target.id === 'remoteCanvas');
};

App.prototype.onTouchEnd = function(event) {
  this.enterFullScreen(event.target.id === 'remoteCanvas');
};

// Called when hangup button is pressed. Terminates the call.
App.prototype.onHangup = function() {
  this.transitionToDone();
  this.shutdown();
};

// Called when key down occurs in window.
// Mac: hotkey is Command.
// Non-Mac: hotkey is Control.
// <hotkey>-D: toggle audio mute.
// <hotkey>-E: toggle video mute.
// <hotkey>-I: toggle Info box.
App.prototype.onKeyDown = function(event) {
  var hotkey = event.ctrlKey;
  if (navigator.appVersion.indexOf('Mac') !== -1) {
    hotkey = event.metaKey;
  }
  if (!hotkey) {
    return;
  }
  switch (event.keyCode) {
    case 68:
      this.toggleAudioMute();
      return;
    case 69:
      this.toggleVideoMute();
      return;
    case 73:
      this.infoBox.setVisible(!this.infoBox.isVisible());
      return;
    default:
      return;
  }
};

// Called on window resize.
App.prototype.onResize = function() {
  // Don't letterbox while full-screening, by undoing the changes below.
  if (document.webkitIsFullScreen) {
    this.containerDiv.style.cssText = 'top: 0px; left: 0px;';
    return;
  }

  var aspectRatio;
  var remoteVideoElt = this.remoteVideoElt;
  var localVideoElt = this.localVideoElt;
  if (remoteVideoElt && remoteVideoElt.style.opacity === '1') {
    aspectRatio = remoteVideoElt.videoWidth / remoteVideoElt.videoHeight;
  } else if (localVideoElt && localVideoElt.style.opacity === '1') {
    aspectRatio = localVideoElt.videoWidth / localVideoElt.videoHeight;
  } else {
    return;
  }

  var innerHeight = window.innerHeight;
  var innerWidth = window.innerWidth;
  var videoWidth = innerWidth < aspectRatio * window.innerHeight ?
      innerWidth : aspectRatio * window.innerHeight;
  var videoHeight = innerHeight < window.innerWidth / aspectRatio ?
      innerHeight : window.innerWidth / aspectRatio;
  this.containerDiv.style.width = videoWidth + 'px';
  this.containerDiv.style.height = videoHeight + 'px';
  this.containerDiv.style.left = (innerWidth - videoWidth) / 2 + 'px';
  this.containerDiv.style.top = (innerHeight - videoHeight) / 2 + 'px';
};

})();
