/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const offscreenCanvas = new OffscreenCanvas(256, 256);
const ctx = offscreenCanvas.getContext('2d');


function transform(frame, controller) {
  if (offscreenCanvas.width !== frame.displayWidth) {
    offscreenCanvas.width = frame.displayWidth;
    offscreenCanvas.height = frame.displayHeight;
    ctx.translate(1280, 0);
    ctx.scale(-1, 1);
  }

  // Draw frame to offscreen canvas with flipped x-axis.
  ctx.drawImage(frame, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

  const newFrame = new VideoFrame(offscreenCanvas, {
    timestamp: frame.timestamp,
    duration: frame.duration,
  });
  controller.enqueue(newFrame);
  frame.close();
}

onmessage = async (event) => {
  const {operation} = event.data;
  if (operation === 'mirror') {
    const {readable, writable} = event.data;
    readable
        .pipeThrough(new TransformStream({transform}))
        .pipeTo(writable);
  } else {
    console.error('Unknown operation', operation);
  }
};
