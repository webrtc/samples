/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Drops frames at random.
 * @implements {FrameTransform} in pipeline.js
 */
class DropTransform { // eslint-disable-line no-unused-vars
  /** @override */
  async init() {}
  /** @override */
  async transform(frame, controller) {
    if (Math.random() < 0.5) {
      controller.enqueue(frame);
    } else {
      frame.destroy();
    }
  }
  /** @override */
  destroy() {}
}

/**
 * Delays all frames by 100ms.
 * TODO(benjaminwagner): Should the timestamp be adjusted?
 * @implements {FrameTransform} in pipeline.js
 */
class DelayTransform { // eslint-disable-line no-unused-vars
  /** @override */
  async init() {}
  /** @override */
  async transform(frame, controller) {
    // TODO(benjaminwagner): why is there a difference between await vs.
    // callback?
    await new Promise(resolve => setTimeout(resolve, 100));
    controller.enqueue(frame);
  }
  /** @override */
  destroy() {}
}
