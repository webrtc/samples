/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

// Meter class that generates a number correlated to audio volume.
// The meter class itself displays nothing, but it makes the
// instantaneous and time-decaying volumes available for inspection.
// It also reports on the fraction of samples that were at or near
// the top of the measurement range.
function SoundMeter(context) {
  this.context = context;
  this.instant = 0.0;
  this.slow = 0.0;
  this.clip = 0.0;
  this.node = null;
}

SoundMeter.prototype.connectToSource = async function(stream, callback) {
  console.log('SoundMeter connecting');
  try {
    await this.context.audioWorklet.addModule('js/volume-meter-processor.js');
    this.mic = this.context.createMediaStreamSource(stream);
    this.node = new AudioWorkletNode(this.context, 'volume-meter-processor');
    this.node.port.onmessage = (event) => {
      const {instant, clip} = event.data;
      this.instant = instant;
      this.clip = clip;
      this.slow = 0.95 * this.slow + 0.05 * this.instant;
    };
    this.mic.connect(this.node);
    if (typeof callback !== 'undefined') {
      callback(null);
    }
  } catch (e) {
    console.error(e);
    if (typeof callback !== 'undefined') {
      callback(e);
    }
  }
};

SoundMeter.prototype.stop = function() {
  console.log('SoundMeter stopping');
  this.mic.disconnect();
  this.node.disconnect();
};
