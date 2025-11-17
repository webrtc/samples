/*
 *  Copyright (c) 2025 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

// This class is used to compute the volume of the input audio stream.
class VolumeMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._lastUpdate = Date.now();
  }
  process(inputs) {
    // This example only supports mono channel.
    const input = inputs[0][0];
    if (!input) {
      return true;
    }
    let sum = 0.0;
    let clipcount = 0;
    for (let i = 0; i < input.length; ++i) {
      sum += input[i] * input[i];
      if (Math.abs(input[i]) > 0.99) {
        clipcount += 1;
      }
    }
    const instant = Math.sqrt(sum / input.length);
    this.port.postMessage({
      instant: instant,
      clip: clipcount / input.length,
    });
    return true;
  }
}

registerProcessor('volume-meter-processor', VolumeMeterProcessor);
