/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, quotmark: single, undef: true, unused: strict */

'use strict';

var apprtc = apprtc || {};

(function() {

var Log = apprtc.Log;
var Stats = apprtc.Stats;

/*
 * Handles an information box used to display messages.
 */
var InfoBox = apprtc.InfoBox = function(host, stats) {
  this.host = host;
  this.stats = stats;
  this.errorMessages = [];

  this.subscriptions = {};
  this.subscriptions[Stats.UPDATED_TOPIC] = this.update.bind(this);
  this.subscriptions[Log.ERROR_TOPIC] = this.onAppError.bind(this);
  apprtc.pubsub.subscribeAll(this.subscriptions);
};

// Cleanup.
InfoBox.prototype.shutdown = function() {
  apprtc.pubsub.unsubscribeAll(this.subscriptions);
  this.stats = null;
  this.host = null;
};

// Updates the info box with relevant data.
InfoBox.prototype.update = function() {
  var stats = this.stats;
  var contents = '<pre>';
  if (stats) {
    // Build the display.
    contents += this.buildLine('States');
    contents += this.buildLine('Signaling', stats.getSignalingState());
    contents += this.buildLine('Gathering', stats.getIceGatheringState());
    contents += this.buildLine('Connection', stats.getIceConnectionState());
    contents += this.buildLine('Local', stats.getLocalCandidateTypes());
    contents += this.buildLine('Remote', stats.getRemoteCandidateTypes());

    var localAddress = stats.getLocalAddress();
    var remoteAddress = stats.getRemoteAddress();
    if (localAddress && remoteAddress) {
      contents += this.buildLine('LocalAddress', localAddress);
      contents += this.buildLine('RemoteAddress', remoteAddress);
    }
    contents += this.buildLine();

    contents += this.buildLine('Stats');
    var callSetupTime = stats.getCallSetupTime();
    if (callSetupTime) {
      contents += this.buildLine('Setup time',
          callSetupTime.toFixed(0).toString() + 'ms');
    }
    var rtt = stats.getRtt();
    if (rtt) {
      contents += this.buildLine('RTT', rtt.toString() + 'ms');
    }
    var e2eDelay = stats.getE2EDelay();
    if (e2eDelay) {
      contents += this.buildLine('End to end', e2eDelay.toString() + 'ms');
    }
  }
  contents += '</pre>';

  var div = this.host;
  div.innerHTML = contents;

  for (var i in this.errorMessages) {
    div.innerHTML += '<p style="background-color: red; color: yellow;">' +
        this.errorMessages[i] + '</p>';
  }
};

// Returns if the info box is visible.
InfoBox.prototype.isVisible = function() {
  return this.host.style.display === 'block';
};

// Sets if the info box is visible or not.
InfoBox.prototype.setVisible = function(visible) {
  if (visible) {
    this.host.style.display = 'block';
    this.stats.startPolling();
  } else {
    this.stats.stopPolling();
    this.host.style.display = 'none';
  }
};

// Topic handler.
InfoBox.prototype.onAppError = function(data) {
  this.errorMessages.push(data.error);
  this.setVisible(true);
};

// Helper function to build a string with given label and value.
InfoBox.prototype.buildLine = function(label, value) {
  var columnWidth = 12;
  var line = '';
  if (label) {
    line += label + ':';
    while (line.length < columnWidth) {
      line += ' ';
    }
    if (value) {
      line += value;
    }
  }
  line += '\n';
  return line;
};

})();
