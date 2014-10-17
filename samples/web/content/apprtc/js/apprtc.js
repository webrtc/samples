/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

var apprtc = apprtc || {};
// Config dictionary is set by app engine.
var config = config || {};

(function() {

var Log = apprtc.Log;
var SignalingManager = apprtc.SignalingManager;

/*
 * Handles all UI interactions and creates requisite model objects.
 */
var App = apprtc.App = function() {
  Log.info('Initializing AppRTC; room=' + config.roomId + '.');

  // Grab references to necessary elements.
  this.cardDiv = document.getElementById('card');
  this.containerDiv = document.getElementById('container');
  this.localVideoElt = document.getElementById('localVideo');
  // Reset localVideo display to center.
  this.localVideoElt.addEventListener('loadedmetadata', function() {
//    window.onresize();
  });
  this.miniVideoElt = document.getElementById('miniVideo');
  this.remoteVideoElt = document.getElementById('remoteVideo');

  // Create signaling manager.
  this.config = config;
  this.signalingManager = new SignalingManager(this.config);

  // Subscribe to relevant topics.
  apprtc.pubsub.subscribe(SignalingManager.ICE_STATE_TOPIC, function(data) {
    Log.info('ICE connection state changed to: ' + data.state);
  });

  // Initialize call.
  this.turnCompleted = false;
  this.gotUserMedia = false;
  this.localStream = null;
  this.initialize();
};

// Cleanup.
App.prototype.shutdown = function() {
  this.signalingManager.shutdown();
  this.signalingManager = null;
};

App.prototype.initialize = function() {
  this.resetStatusMessage();

  apprtc.util.updateTurnServerUrl(this.config, (function() {
    this.turnCompleted = true;
    this.startCallIfReady();
  }).bind(this));

  if (this.config.mediaConstraints.audio === false &&
      this.config.mediaConstraints.video === false) {
    this.gotUserMedia = true;
  } else {
    this.requestUserMedia();
  }
};

App.prototype.startCallIfReady = function() {
  if (!this.turnCompleted || !this.gotUserMedia) {
    return;
  }
  this.signalingManager.start(this.localStream);
};

App.prototype.requestUserMedia = function() {
  // Call into getUserMedia via the polyfill (adapter.js).
  var mediaConstraints = this.config.mediaConstraints;
  try {
    getUserMedia(mediaConstraints,
        this.onUserMediaSuccess.bind(this), this.onUserMediaError.bind(this));
    Log.info('Requested access to local media with mediaConstraints:\n' +
        '  \'' + JSON.stringify(mediaConstraints) + '\'');
  } catch (e) {
    alert('getUserMedia() failed. Is this a WebRTC capable browser?');
    Log.error('getUserMedia failed with exception: ' + e.message);
  }
};

App.prototype.onUserMediaSuccess = function(stream) {
  Log.info('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(this.localVideoElt, stream);
  this.localVideoElt.style.opacity = 1;
  this.localStream = stream;
  this.gotUserMedia = true;
  this.startCallIfReady();
};

App.prototype.onUserMediaError = function(error) {
  var errorMessage = 'Failed to get access to local media. Error name was ' +
      error.name + '. Continuing without sending a stream.';
  Log.error(errorMessage);
  alert(errorMessage);
  this.gotUserMedia = true;
  this.startCallIfReady();
};

App.prototype.resetStatusMessage = function() {

};

})();
