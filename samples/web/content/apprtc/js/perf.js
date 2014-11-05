/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var apprtc = apprtc || {};
apprtc.perf = apprtc.perf || {};

// Simple implementation of some functions to log timestamps for measuring
// specific perf scenarios.

(function() {

// Scenario for time between peer connection creation and receiving remote
// video.
apprtc.perf.PEER_CONNECTION_SCENARIO = 'PERF_PEER_CONNECTION';

apprtc.perf.times = {};

// Records a timestamp for |scenario|. Expects to be called twice for a given
// scenario.
apprtc.perf.record = function(scenario) {
  var now = window.performance.now();
  var times = apprtc.perf.times;
  var arr = times[scenario];
  if (!arr) {
    arr = times[scenario] = [];
  }
  arr.push(now);
};

// Returns the difference between the last time pair recorded for |scenario|
// or null.
apprtc.perf.getTime = function(scenario) {
  var arr = apprtc.perf.times[scenario];
  if (!arr || arr.length < 2) {
    return null;
  }
  var len = arr.length;
  var i = (len % 2 === 0) ? len - 2 : len - 3; 
  return arr[i + 1] - arr[i];
};

})();
