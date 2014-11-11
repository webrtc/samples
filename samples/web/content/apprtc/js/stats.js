/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

'use strict';

/* globals pc, stats:true, updateInfoDiv */
/* exported computeE2EDelay, extractStatAsInt, refreshStats */

function refreshStats() {
  if (pc) {
    pc.getStats(function(response) {
      stats = response.result();
      updateInfoDiv();
    });
  }
}

// Return the integer stat |statName| from the object with type |statObj| in
// |stats|, or null if not present.
function extractStatAsInt(stats, statObj, statName) {
  // Ignore stats that have a 'nullish' value.
  // The correct fix is indicated in
  // https://code.google.com/p/webrtc/issues/detail?id=3377.
  var str = extractStat(stats, statObj, statName);
  if (str) {
    var val = parseInt(str);
    if (val !== -1) {
      return val;
    }
  }
  return null;
}

// Return the stat |statName| from the object with type |statObj| in |stats|
// as a string, or null if not present.
function extractStat(stats, statObj, statName) {
  var report = getStatsReport(stats, statObj, statName);
  if (report && report.names().indexOf(statName) !== -1) {
    return report.stat(statName);
  }
  return null;
}

// Return the stats report with type |statObj| in |stats|, with the stat
// |statName| (if specified), and value |statVal| (if specified). Return
// undef if not present.
function getStatsReport(stats, statObj, statName, statVal) {
  if (stats) {
    for (var i = 0; i < stats.length; ++i) {
      var report = stats[i];
      if (report.type === statObj) {
        var found = true;
        // If |statName| is present, ensure |report| has that stat.
        // If |statVal| is present, ensure the value matches.
        if (statName) {
          var val = report.stat(statName);
          found = (statVal !== undefined) ? (val === statVal) : val;
        }
        if (found) {
          return report;
        }
      }
    }
  }
}

function computeE2EDelay(captureStart, remoteVideoCurrentTime) {
  // Computes end to end delay.
  if (captureStart) {
    // Adding offset to get NTP time.
    var nowNTP = Date.now() + 2208988800000;
    var e2eDelay = nowNTP - captureStart - remoteVideoCurrentTime * 1000;
    return e2eDelay.toFixed(0);
  }
  return null;
}
