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

StatisticsAggregate = function (ramp_up_threshold) {
  this.start_time_ = 0;
  this.sum_ = 0;
  this.count_ = 0;
  this.max_ = 0;
  this.ramp_up_threshold_ = ramp_up_threshold;
  this.ramp_up_time_ = Infinity;
}

StatisticsAggregate.prototype = {
  add: function (time, data_point) {
    if (this.start_time_ == 0)
      this.start_time_ = time;
    this.sum_ += data_point;
    this.max_ = Math.max(this.max_, data_point);
    if (this.ramp_up_time_ == Infinity &&
        data_point > this.ramp_up_threshold_)
      this.ramp_up_time_ = time;
    this.count_++;
  },

  getAverage: function () {
    if (this.count_ == 0)
      return 0;
    return Math.round(this.sum_ / this.count_);
  },

  getMax: function () {
    return this.max_;
  },

  getRampUpTime: function () {
    return this.ramp_up_time_ - this.start_time_;
  },
}
