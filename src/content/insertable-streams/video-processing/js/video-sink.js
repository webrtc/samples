/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Displays the output stream in a video element.
 * @implements {MediaStreamSink} in pipeline.js
 */
class VideoSink { // eslint-disable-line no-unused-vars
  constructor() {
    /**
     * @private {?HTMLVideoElement} output video element
     */
    this.video_ = null;
    /** @private {string} */
    this.debugPath_ = 'debug.pipeline.sink_';
  }
  /**
   * Sets the path to this object from the debug global var.
   * @param {string} path
   */
  setDebugPath(path) {
    this.debugPath_ = path;
  }
  /** @override */
  async setMediaStream(stream) {
    console.log('[VideoSink] Setting sink stream.', stream);
    if (!this.video_) {
      this.video_ =
        /** @type {!HTMLVideoElement} */ (document.createElement('video'));
      this.video_.classList.add('video', 'sinkVideo');
      document.getElementById('outputVideoContainer').appendChild(this.video_);
      console.log(
          '[VideoSink] Added video element to page.',
          `${this.debugPath_}.video_ =`, this.video_);
    }
    this.video_.srcObject = stream;
    this.video_.play();
  }
  /** @override */
  destroy() {
    if (this.video_) {
      console.log('[VideoSink] Stopping sink video');
      this.video_.pause();
      this.video_.srcObject = null;
      this.video_.parentNode.removeChild(this.video_);
    }
  }
}
