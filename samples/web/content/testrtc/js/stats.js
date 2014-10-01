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

function StatisticsAggregate(rampUpThreshold) {
  this.startTime_ = 0;
  this.sum_ = 0;
  this.count_ = 0;
  this.max_ = 0;
  this.rampUpThreshold_ = rampUpThreshold;
  this.rampUpTime_ = Infinity;
}

StatisticsAggregate.prototype = {
  add: function (time, datapoint) {
    if (this.startTime_ == 0)
      this.startTime_ = time;
    this.sum_ += datapoint;
    this.max_ = Math.max(this.max_, datapoint);
    if (this.rampUpTime_ == Infinity &&
        datapoint > this.rampUpThreshold_)
      this.rampUpTime_ = time;
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
    return this.rampUpTime_ - this.startTime_;
  },
}
