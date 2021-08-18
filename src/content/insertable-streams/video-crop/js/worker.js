/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const canvas = new OffscreenCanvas(640, 360);
const ctx = canvas.getContext('2d', {desynchronized: true});

function transform(frame, controller) {
  // Cropping is a bit too complex. See https://github.com/w3c/webcodecs/issues/281
  // See https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
  ctx.drawImage(frame,
      320, 180,
      640, 360,
      0, 0, 640, 360);
  const newFrame = new VideoFrame(canvas);
  controller.enqueue(newFrame);
  frame.close();
}

onmessage = async (event) => {
  const {operation} = event.data;
  if (operation === 'crop') {
    const {readable, writable} = event.data;
    readable
        .pipeThrough(new TransformStream({transform}))
        .pipeTo(writable);
  } else {
    console.error('Unknown operation', operation);
  }
};
