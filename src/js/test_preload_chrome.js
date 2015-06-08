/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/*
 * Provides fakes for Chrome Javascript API.
 *
 * JS Test Driver (JSTD) implements a subset of Javascript
 * functionality. This simulates the Chrome JS behavior for testing.
 */

navigator.webkitGetUserMedia = function() {};

// Fake for webkitRTCPeerConnection.
webkitRTCPeerConnection = function(config, constraints) {
  // Provides access to test data for getStats.
  this.fakeGetStatsData = [];
};

webkitRTCPeerConnection.prototype.getStats =
    function(successCallback, selector) {
      var stats = this.fakeGetStatsData;
      // Simulate a callback on the stats object.
      window.setTimeout(function() {
	successCallback(stats);
      }, 0);
    };


// Mimcs Chrome's specialized stats datastructure.
var FakeStatsReportStruct = function(id, timestamp, type, obj) {
  this.id = id;
  this.timestamp = timestamp;
  this.type = type;
  this.obj = obj;
}

FakeStatsReportStruct.prototype.names = function() {
  return Object.keys(this.obj);
};

FakeStatsReportStruct.prototype.stat = function(key) {
  return this.obj[key];
};
