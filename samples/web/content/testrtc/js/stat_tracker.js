/**
 * Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 * Use of this source code is governed by a BSD-style license
 * that can be found in the LICENSE file in the root of the source
 * tree. An additional intellectual property rights grant can be found
 * in the file PATENTS.  All contributing project authors may
 * be found in the AUTHORS file in the root of the source tree.
 */

StatisticsReport = function () {
  this.output_ = [];
  this.timer_;
}

StatisticsReport.prototype = {
  collectStatsFromPeerConnection: function (pc) {
    this.timer_ = setInterval(this.addPeerConnectionStats_.bind(this, pc), 100);
  },

  addPeerConnectionStats_: function (pc) {
    pc.getStats(this.onStatsReady_.bind(this));
  },

  onStatsReady_: function (stateResponse) {
    this.output_.push(stateResponse.result());
  },

  getStats: function() {
    return this.output_;
  },

  stop: function() {
    clearInterval(this.timer_);
  },
}
