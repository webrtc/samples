/*
 *  Copyright (c) 2023 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

// Meter class that generates a number correlated to audio volume.
// The meter class itself displays nothing, but it makes the
// instantaneous and time-decaying volumes available for inspection.
// It also reports on the fraction of samples that were at or near
// the top of the measurement range.
class SoundMeter extends AudioWorkletProcessor {
  _instant
  _slow
  _clip
  _updateIntervalInMS
  _nextUpdateFrame

  constructor() {
    super();

    this._instant=0.0;
    this._slow=0.0;
    this._clip=0.0;
    this._updateIntervalInMS = 50;
    this._nextUpdateFrame = this._updateIntervalInMS;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];
      let sum = 0.0;
      let clipcount = 0;
      for (let i = 0; i < samples.length; ++i) {
	sum += samples[i] * samples[i];
	if (Math.abs(samples[i]) > 0.99) {
	  clipcount += 1;
	}
      }
      this._instant = Math.sqrt(sum / samples.length);
      this._slow = 0.95 * this._slow + 0.05 * this._instant;
      this._clip = clipcount / samples.length;

      this._nextUpdateFrame -= samples.length;
      if (this._nextUpdateFrame < 0) {
	this._nextUpdateFrame += this._updateIntervalInMS / 1000 * sampleRate;
	this.port.postMessage({instant: this._instant, slow: this._slow, clip: this._clip});
      }
    }
    return true;
  }
}

registerProcessor("soundmeter", SoundMeter);
