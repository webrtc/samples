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

addTestSuite("BandwidthTest", bwTest);

function bwTest() {
  var durationMs = 40000;
  var maxVideoBitrateKbps = 2000;
  var forceTurn = true;
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
    var test = new LoopbackTest(stream, durationMs,
                                forceTurn,
                                pcConstraints,
                                maxVideoBitrateKbps);
    test.run(onTestFinished.bind(test));
  }

  function computeStatsAndReport(stats) {
    var bwe_stats = new StatisticsAggregate(0.75 * maxVideoBitrateKbps * 1000);
    var rtt_stats = new StatisticsAggregate(0);
    for (var block_index in stats) {
      for (var report_index in stats[block_index]) {
        var report = stats[block_index][report_index];
        if (report.id == "bweforvideo") {
          bwe_stats.add(Date.parse(report.timestamp),
            parseInt(report.stat("googAvailableSendBandwidth")));
        } else if (report.type == "ssrc") {
          rtt_stats.add(Date.parse(report.timestamp),
            parseInt(report.stat("googRtt")));
        }
      }
    }
    var last_block = stats.pop();
    reportSuccess("RTT average: " + rtt_stats.getAverage() + " ms");
    reportSuccess("RTT max: " + rtt_stats.getMax() + " ms");
    reportSuccess("Send bandwidth average: " + bwe_stats.getAverage() + " bps");
    reportSuccess("Send bandwidth max: " + bwe_stats.getMax() + " bps");
    reportSuccess("Send bandwidth ramp-up time: " + bwe_stats.getRampUpTime() + " ms");
  }

  function onTestFinished() {
    testFinished = true;
    if (autoClose) {
      window.close();
    } else {
      computeStatsAndReport(this.getResults());
      testSuiteFinished();
    }
  }
}
