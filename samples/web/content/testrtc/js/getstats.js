/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';
/* exported GetStats */

// Description:
// This class sets up a loopback peerconnection and attaches the provided gum
//    video stream then collects data using the getStats API using the provided
//    statName string. After the provided timeout expires a callback is fired
//    returning this.stat array containing collected data for said stat.

// Limitations:
// Currently it checks if googFrameRateInput is > 0 to make sure the encoder
//    and camera has started however this means it assumes the gum stream has
//    a video track.

// GetStats.start() parameters:
// stream = getUserMedia video stream.
// statName = string matching a stat in the getStats API, currently only ones
//    belonging to report type SSRC.
// getStatCallback = callback with this.stat array contain data for statName.
// timeout = Time in ms dictates how long it should gather stats in an array.

function GetStats() {
  this.stat = [];
  this.timeout = null;
  this.statName = null;
  this.callback = null;
  this.startTime = null;
  this.pc1 = null;
  this.pc2 = null;
}

GetStats.prototype = {
  start: function(stream, statName, getStatCallback, timeout) {
    this.timeout = timeout;
    this.statName = statName;
    this.callback = getStatCallback;
    this.startTime = window.performance.now();
    this.setupLoopbackPeerconnection_(stream);
    this.gatherStats_();
  },

  setupLoopbackPeerconnection_: function(stream) {
    this.pc1 = new RTCPeerConnection();
    this.pc2 = new RTCPeerConnection();
    // Add a stream to one peerconnection due to measuring encode time only.
    this.pc1.addStream(stream);

    this.pc2.onicecandidate = function(event) {
      if (event.candidate) {
        var candidate = new RTCIceCandidate(event.candidate);
        this.pc1.addIceCandidate(candidate);
      }
    }.bind(this);

    this.pc1.onicecandidate = function(event) {
      if (event.candidate) {
        var candidate = new RTCIceCandidate(event.candidate);
        this.pc2.addIceCandidate(candidate);
      }
    }.bind(this);
    // Setup loopback.
    this.pc1.createOffer(function(offer) {
      this.pc1.setLocalDescription(offer);
      this.pc2.setRemoteDescription(offer);
      this.pc2.createAnswer(function(answer) {
        this.pc2.setLocalDescription(answer);
        this.pc1.setRemoteDescription(answer);
      }.bind(this));
    }.bind(this));
  },

  gatherStats_: function() {
    var now = window.performance.now();
    if (now > this.startTime + this.timeout) {
      this.pc1.close();
      this.pc2.close();
      this.callback(this.stat);
      return;
    }
    this.pc1.getStats(this.gotStats_.bind(this));
  },

  gotStats_: function(response) {
    for (var index in response.result()) {
      var report = response.result()[index];
      if (report.type === 'ssrc') {
        // Make sure to only capture stats after the encoder is setup.
        // TODO(jansson) expand to cover audio as well.
        if (parseInt(report.stat('googFrameRateInput')) > 0) {
            this.stat.push(parseInt(report.stat(this.statName)));
        }
      }
    }
    this.gatherStats_();
  }
};
