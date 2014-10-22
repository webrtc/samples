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
var SignalingManager = apprtc.SignalingManager;

/*
 * Provides statistics data.
 */
var Stats = apprtc.Stats = function(signalingManager) {
  this.signalingManager = signalingManager;
  this.stats = null;
  this.pollTimer = null;
  this.gatheredIceCandidateTypes = {
    'local': {},
    'remote': {}
  };

  // Subscribe to relevant topics.
  this.subscriptions = {};
  this.subscriptions[SignalingManager.SIGNALING_STATE_TOPIC] =
      this.onSignalingState.bind(this);
  this.subscriptions[SignalingManager.ICE_CANDIDATE_TOPIC] =
      this.onIceCandidate.bind(this);
  this.subscriptions[SignalingManager.ICE_STATE_TOPIC] =
      this.onIceState.bind(this);
  apprtc.pubsub.subscribeAll(this.subscriptions);
};

// Cleanup.
Stats.prototype.shutdown = function() {
  apprtc.pubsub.unsubscribeAll(this.subscriptions);
  this.stopPolling();
  this.signalingManager = null;
  this.subscriptions = null;
};

Stats.UPDATED_TOPIC = 'STATS_UPDATED';

// Begins polling for statistics every 1s.
Stats.prototype.startPolling = function() {
  this.pollTimer = setInterval(this.refresh.bind(this), 1000);
};

// Stops polling for statistics.
Stats.prototype.stopPolling = function() {
  if (!this.pollTimer) {
    return;
  }
  clearInterval(this.pollTimer);
  this.pollTimer = null;
};

// Returns if we have stats available for query.
Stats.prototype.hasStats = function() {
  return this.signalingManager.peerConnection !== null;
};

// Refreshes statistics.
Stats.prototype.refresh = function() {
  if (!this.signalingManager.peerConnection) {
    return;
  }
  this.signalingManager.peerConnection.getStats((function(response) {
    this.stats = response.result();
    apprtc.pubsub.publish(Stats.UPDATED_TOPIC);
  }).bind(this));
};

// Returns call setup time.
Stats.prototype.getCallSetupTime = function() {
  return apprtc.perf.getTime(apprtc.perf.PEER_CONNECTION_SCENARIO);
};

// Returns round trip time.
Stats.prototype.getRtt = function() {
  return this.extractStatAsInt('ssrc', 'googRtt');
};

// Returns end to end delay by looking at the playback time of the remote vide
// and the capture start time.
Stats.prototype.getE2EDelay = function() {
  var captureStart =
      this.extractStatAsInt('ssrc', 'googCaptureStartNtpTimeMs');
  if (!captureStart) {
    return null;
  }
  // TODO(tkchin): find better way to get this.
  var remoteVideoElt = document.getElementById('remoteVideo');
  if (!remoteVideoElt) {
    return null;
  }
  var remoteVideoCurrentTime = remoteVideoElt.currentTime;
  // Adding offset to get NTP time.
  var nowNTP = Date.now() + 2208988800000;
  var e2eDelay = nowNTP - captureStart - remoteVideoCurrentTime * 1000;
  return e2eDelay.toFixed(0);  
};

// Returns local address for active connection.
Stats.prototype.getLocalAddress = function() {
  var candidatePair =
      this.getStatsReport('googCandidatePair', 'googActiveConnection', 'true');
  if (!candidatePair) {
    return null;
  }
  return candidatePair.stat('googLocalAddress');
};

// Returns remote address for active connection.
Stats.prototype.getRemoteAddress = function() {
  var candidatePair =
      this.getStatsReport('googCandidatePair', 'googActiveConnection', 'true');
  if (!candidatePair) {
    return null;
  }
  return candidatePair.stat('googRemoteAddress');
};

// Returns signaling state.
Stats.prototype.getSignalingState = function() {
  if (!this.signalingManager.peerConnection) {
    return null;
  }
  return this.signalingManager.peerConnection.signalingState;
};

// Returns ICE gathering state.
Stats.prototype.getIceGatheringState = function() {
  if (!this.signalingManager.peerConnection) {
    return null;
  }
  return this.signalingManager.peerConnection.iceGatheringState;
};

// Returns ICE connection state.
Stats.prototype.getIceConnectionState = function() {
  if (!this.signalingManager.peerConnection) {
    return null;
  }
  return this.signalingManager.peerConnection.iceConnectionState;
};

// Returns local endpoint candidate types.
Stats.prototype.getLocalCandidateTypes = function() {
  var types = [];
  for (var type in this.gatheredIceCandidateTypes.local) {
    types.push(type + ':' + this.gatheredIceCandidateTypes.local[type]);
  }
  types.sort();
  return types.join(' ');
};

// Returns remote endpoint candidate types.
Stats.prototype.getRemoteCandidateTypes = function() {
  var types = [];
  for (var type in this.gatheredIceCandidateTypes.remote) {
    types.push(type + ':' + this.gatheredIceCandidateTypes.remote[type]);
  }
  types.sort();
  return types.join(' ');
};

// Return the integer stat |statName| from the object with type |stat| in
// |stats|, or null if not present.
Stats.prototype.extractStatAsInt = function(stat, statName) {
  // Ignore stats that have a 'nullish' value.
  // The correct fix is indicated in
  // https://code.google.com/p/webrtc/issues/detail?id=3377.
  var str = this.extractStat(stat, statName);
  if (str) {
    var val = parseInt(str);
    if (val !== -1) {
      return val;
    }
  }
  return null;
};

// Return the stat |statName| from the object with type |stat| in |stats|
// as a string, or null if not present.
Stats.prototype.extractStat = function(stat, statName) {
  var report = this.getStatsReport(stat, statName);
  if (report && report.names().indexOf(statName) !== -1) {
    return report.stat(statName);
  }
  return null;
};

// Return the stats report with type |stat| in |stats|, with the stat
// |statName| (if specified), and value |statVal| (if specified). Return
// null if not present.
Stats.prototype.getStatsReport = function(stat, statName, statVal) {
  var stats = this.stats;
  if (stats) {
    for (var i = 0; i < stats.length; ++i) {
      var report = stats[i];
      if (report.type === stat) {
        var found = true;
        // If |statName| is present, ensure |report| has that stat.
        // If |statVal| is present, ensure the value matches.
        if (statName) {
          var val = report.stat(statName);
          found = statVal !== undefined ? val === statVal : val;
        }
        if (found) {
          return report;
        }
      }
    }
  }
  return null;
};

//
// Topic handlers.
//

Stats.prototype.onSignalingState = function(data) {
  Log.info('Signaling state changed to: ' + data.state);
  apprtc.pubsub.publish(Stats.UPDATED_TOPIC);
};

Stats.prototype.onIceState = function(data) {
  Log.info('ICE connection state changed to: ' + data.state);
  apprtc.pubsub.publish(Stats.UPDATED_TOPIC);
};

Stats.prototype.onIceCandidate = function(data) {
  var location = data.local ? 'local' : 'remote';
  var type = data.type;
  var types = this.gatheredIceCandidateTypes[location];
  if (!types[type]) {
    types[type] = 1;
  } else {
    ++types[type];
  }
  apprtc.pubsub.publish(Stats.UPDATED_TOPIC);
};

})();
