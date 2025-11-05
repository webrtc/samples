/*
 *  Copyright (c) 2025 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';

let oneTimeBurnMs = 0;
let continuousBurn = false;
let continuousBurnMean = 0;
let continuousBurnStdDev = 0;

function burnCpu(durationMs) {
  const start = performance.now();
  while (performance.now() - start < durationMs) {
    // Busy wait
  }
}

// Box-Muller transform to get a random number from a standard normal distribution.
function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function processFrame(frame) {
  if (oneTimeBurnMs > 0) {
    burnCpu(oneTimeBurnMs);
    oneTimeBurnMs = 0; // Burn only once, then reset.
  }

  if (continuousBurn) {
    if (continuousBurnMean > 0 || continuousBurnStdDev > 0) {
      let burnDuration = continuousBurnMean + gaussianRandom() * continuousBurnStdDev;
      if (burnDuration < 0) {
        burnDuration = 0;
      }
      burnCpu(burnDuration);
    }
  }
  return frame;
}

self.onmessage = (e) => {
  const { type, readable, writable, burnOptions } = e.data;

  if (type === 'init') {
    const transformStream = new TransformStream({
      transform(frame, controller) {
        controller.enqueue(processFrame(frame));
      },
    });
    readable.pipeThrough(transformStream).pipeTo(writable);
  } else if (type === 'update') {
    ({ oneTimeBurnMs, continuousBurn, continuousBurnMean, continuousBurnStdDev } = burnOptions);
  }
};
