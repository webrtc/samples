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
    /**
     * @private {boolean} If false, pass VideoFrame directly to
     * CanvasRenderingContext2D.drawImage and create VideoFrame directly from
     * this.canvas_. If either of these operations fail (it's not supported in
     * Chrome <90 and broken in Chrome 90: https://crbug.com/1184128), we set
     * this field to true; in that case we create an ImageBitmap from the
     * VideoFrame and pass the ImageBitmap to drawImage on the input side and
     * create the VideoFrame using an ImageBitmap of the canvas on the output
     * side.
     */
    this.use_image_bitmap_ = false;
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

    if (!this.use_image_bitmap_) {
      try {
        // Supported for Chrome 90+.
        ctx.drawImage(frame, 0, 0);
      } catch (e) {
        // This should only happen on Chrome <90.
        console.log(
            '[CanvasTransform] Failed to draw VideoFrame directly. Falling ' +
                'back to ImageBitmap.',
            e);
        this.use_image_bitmap_ = true;
      }
    }
    if (this.use_image_bitmap_) {
      // Supported for Chrome <92.
      const inputBitmap = await frame.createImageBitmap();
      ctx.drawImage(inputBitmap, 0, 0);
      inputBitmap.close();
    }
    frame.close();

    ctx.shadowColor = '#000';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 50;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(0, 0, width, height);

    if (!this.use_image_bitmap_) {
      try {
        controller.enqueue(new VideoFrame(this.canvas_, {timestamp}));
      } catch (e) {
        // This should only happen on Chrome <91.
        console.log(
            '[CanvasTransform] Failed to create VideoFrame from ' +
                'OffscreenCanvas directly. Falling back to ImageBitmap.',
            e);
        this.use_image_bitmap_ = true;
      }
    }
    if (this.use_image_bitmap_) {
      const outputBitmap = await createImageBitmap(this.canvas_);
      const outputFrame = new VideoFrame(outputBitmap, {timestamp});
      outputBitmap.close();
      controller.enqueue(outputFrame);
    }
  }

  /** @override */
  destroy() {}
}
