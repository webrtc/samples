/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Encodes and decodes frames using the WebCodec API.
 * @implements {FrameTransform} in pipeline.js
 */
class WebCodecTransform { // eslint-disable-line no-unused-vars
  constructor() {
    // All fields are initialized in init()
    this.debugPath_ = 'debug.pipeline.frameTransform_';
  }
  /** @override */
  async init() {
    console.log('[WebCodecTransform] Initializing encoder and decoder');
    this.decoder_ = new VideoDecoder({ output: this.enqueueDecoded.bind(this), error: this.error });
    this.encoder_ = new VideoEncoder({ output: this.decodeEncoded.bind(this), error: this.error });
    this.encoder_.configure({codec: 'vp8', width: 640, height:480});
    this.decoder_.configure({codec: 'vp8', width: 640, height:480});
    this.controller_ = null;
  }

  /** @override */
  async transform(frame, controller) {
    const ctx = this.ctx_;
    if (!this.encoder_) {
      frame.destroy();
      return;
    }
    this.controller_ = controller;
    this.encoder_.encode(frame);
  }

  /** @override */
  destroy() {}

  /* Helper functions */
  enqueueDecoded(videoFrame) {
    if (!this.controller_) {
      videoFrame.destroy();
      return;
    }
    this.controller_.enqueue(videoFrame);
  }

  decodeEncoded(encodedFrame) {
    this.decoder_.decode(encodedFrame);
  }

  error(e) {
    console.log('[WebCodecTransform] Bad stuff happened: ' + e);
  }
}
