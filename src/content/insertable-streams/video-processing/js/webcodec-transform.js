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
    // Encoder and decoder are initialized in init()
    this.decoder_ = null;
    this.encoder_ = null;
    this.controller_ = null;
  }
  /** @override */
  async init() {
    console.log('[WebCodecTransform] Initializing encoder and decoder');
    this.decoder_ = new VideoDecoder({
      output: frame => this.handleDecodedFrame(frame),
      error: this.error
    });
    this.encoder_ = new VideoEncoder({
      output: frame => this.handleEncodedFrame(frame),
      error: this.error
    });
    this.encoder_.configure({codec: 'vp8', width: 640, height: 480});
    this.decoder_.configure({codec: 'vp8', width: 640, height: 480});
  }

  /** @override */
  async transform(frame, controller) {
    if (!this.encoder_) {
      frame.close();
      return;
    }
    try {
      this.controller_ = controller;
      this.encoder_.encode(frame);
    } finally {
      frame.close();
    }
  }

  /** @override */
  destroy() {}

  /* Helper functions */
  handleEncodedFrame(encodedFrame) {
    this.decoder_.decode(encodedFrame);
  }

  handleDecodedFrame(videoFrame) {
    if (!this.controller_) {
      videoFrame.close();
      return;
    }
    this.controller_.enqueue(videoFrame);
  }

  error(e) {
    console.log('[WebCodecTransform] Bad stuff happened: ' + e);
  }
}
