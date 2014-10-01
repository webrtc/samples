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

// mflodman added comment.

addTestSuite("BandwidthTest", bwTest);

function bwTest() {
  var durationMs = 10000;
  var maxVideoBitrateKbps = 2000;
  var forceTurn = false;
  var autoClose = false;
  var pcConstraints = null;

  var updateStatusInterval;
  var testFinished = false;

  if (!(isFinite(maxVideoBitrateKbps) && maxVideoBitrateKbps > 0)) {
    // TODO(andresp): Get a better way to show errors than alert.
    alert("Invalid max video bitrate");
    return;
  }

  if (!(isFinite(durationMs) && durationMs > 0)) {
    alert("Invalid duration");
    return;
  }

  doGetUserMedia({audio:false, video:true},
                 gotStream, function() {});

  function gotStream(stream) {
    reportSuccess("duration: " + durationMs);
    reportSuccess("forceTurn: " + forceTurn);
    reportSuccess("maxBitrate: " + maxVideoBitrateKbps);
    var test = new LoopbackTest(stream, durationMs,
                                forceTurn,
                                pcConstraints,
                                maxVideoBitrateKbps);
    test.run(onTestFinished.bind(test));
  }

  function onTestFinished() {
    testFinished = true;
    if (autoClose) {
      window.close();
    } else {
      var stats = this.getResults();
      var last_block = stats.pop();
      reportSuccess("RTT: " + last_block.pop().stat("googRtt") + " ms");
      testSuiteFinished();
    }
  }
}
