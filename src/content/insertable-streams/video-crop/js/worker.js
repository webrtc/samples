/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

function transform(frame, controller) {
  // Cropping from an existing video frame is supported by the API in Chrome 94+.
  const newFrame = new VideoFrame(frame, {
    visibleRect: {
      x: 320,
      width: 640,
      y: 180,
      height: 360,
    }
  });
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
