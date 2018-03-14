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
function WasmSoundMeter(context) {
  this.context = context;
  this.instant = 0.0;
  this.slow = 0.0;
  this.clip = 0.0;
  this.script = context.createScriptProcessor(2048, 1, 1);
  this.measurer = new Module.SoundMeter(2048);
  var that = this;
  this.script.onaudioprocess = function(event) {
    var inputbuf = event.inputBuffer.getChannelData(0);
    var asmbuf = that.measurer.data_buffer();
    for (let i = 0; i < inputbuf.length; i++) {
      asmbuf.set(i, inputbuf[i]);
    }
    that.measurer.process_data_buffer();
    that.instant = that.measurer.get_fast_volume();
    that.slow = that.measurer.get_slow_volume();
  };
}

WasmSoundMeter.prototype.connectToSource = function(stream, callback) {
  console.log('WASM SoundMeter connecting');
  try {
    this.mic = this.context.createMediaStreamSource(stream);
    this.mic.connect(this.script);
    // necessary to make sample run, but should not be.
    this.script.connect(this.context.destination);
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

WasmSoundMeter.prototype.stop = function() {
  this.mic.disconnect();
  this.script.disconnect();
};
