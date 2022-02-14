/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Applies a picture-frame effect using CanvasRenderingContext2D.
 * @implements {FrameTransform} in pipeline.js
 */
class CanvasTransform { // eslint-disable-line no-unused-vars
  constructor() {
    /**
     * @private {?OffscreenCanvas} canvas used to create the 2D context.
     *     Initialized in init.
     */
    this.canvas_ = null;
    /**
     * @private {?CanvasRenderingContext2D} the 2D context used to draw the
     *     effect. Initialized in init.
     */
    this.ctx_ = null;
    /** @private {string} */
    this.debugPath_ = 'debug.pipeline.frameTransform_';
  }
  /** @override */
  async init() {
    console.log('[CanvasTransform] Initializing 2D context for transform');
    this.canvas_ = new OffscreenCanvas(1, 1);
    this.ctx_ = /** @type {?CanvasRenderingContext2D} */ (
      this.canvas_.getContext('2d', {alpha: false, desynchronized: true}));
    if (!this.ctx_) {
      throw new Error('Unable to create CanvasRenderingContext2D');
    }
    console.log(
        '[CanvasTransform] CanvasRenderingContext2D initialized.',
        `${this.debugPath_}.canvas_ =`, this.canvas_,
        `${this.debugPath_}.ctx_ =`, this.ctx_);
  }

  /** @override */
  async transform(frame, controller) {
    const ctx = this.ctx_;
    if (!this.canvas_ || !ctx) {
      frame.close();
      return;
    }
    const width = frame.displayWidth;
    const height = frame.displayHeight;
    this.canvas_.width = width;
    this.canvas_.height = height;
    const timestamp = frame.timestamp;

    ctx.drawImage(frame, 0, 0);
    frame.close();

    ctx.shadowColor = '#000';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 50;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(0, 0, width, height);

    // alpha: 'discard' is needed in order to send frames to a PeerConnection.
    controller.enqueue(new VideoFrame(this.canvas_, {timestamp, alpha: 'discard'}));
  }

  /** @override */
  destroy() {}
}
