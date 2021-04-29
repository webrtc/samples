/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Decodes and plays a video.
 * @implements {MediaStreamSource} in pipeline.js
 */
class VideoSource { // eslint-disable-line no-unused-vars
  constructor() {
    /** @private {boolean} */
    this.visibility_ = false;
    /** @private {?HTMLVideoElement} video element providing the MediaStream */
    this.video_ = null;
    /**
     * @private {?Promise<!MediaStream>} a Promise that resolves to the
     *     MediaStream from captureStream. Set iff video_ is set.
     */
    this.stream_ = null;
    /** @private {string} */
    this.debugPath_ = '<unknown>';
  }
  /** @override */
  setDebugPath(path) {
    this.debugPath_ = path;
  }
  /** @override */
  setVisibility(visible) {
    this.visibility_ = visible;
    if (this.video_) {
      this.updateVideoVisibility();
    }
  }
  /** @private */
  updateVideoVisibility() {
    if (this.video_.parentNode && !this.visibility_) {
      if (!this.video_.paused) {
        // Video playback is automatically paused when the element is removed
        // from the DOM. That is not the behavior we want.
        this.video_.onpause = async () => {
          this.video_.onpause = null;
          await this.video_.play();
        };
      }
      this.video_.parentNode.removeChild(this.video_);
    } else if (!this.video_.parentNode && this.visibility_) {
      console.log(
          '[VideoSource] Adding source video element to page.',
          `${this.debugPath_}.video_ =`, this.video_);
      const outputVideoContainer =
          document.getElementById('outputVideoContainer');
      outputVideoContainer.parentNode.insertBefore(
          this.video_, outputVideoContainer);
    }
  }
  /** @override */
  async getMediaStream() {
    if (this.stream_) return this.stream_;

    console.log('[VideoSource] Loading video');

    this.video_ =
      /** @type {!HTMLVideoElement} */ (document.createElement('video'));
    this.video_.classList.add('video', 'sourceVideo');
    this.video_.controls = true;
    this.video_.loop = true;
    this.video_.muted = true;
    // All browsers that support insertable streams also support WebM/VP8.
    this.video_.src = '../../../video/chrome.webm';
    this.video_.load();
    this.video_.play();
    this.updateVideoVisibility();
    this.stream_ = new Promise((resolve, reject) => {
      this.video_.oncanplay = () => {
        if (!resolve || !reject) return;
        console.log('[VideoSource] Obtaining video capture stream');
        if (this.video_.captureStream) {
          resolve(this.video_.captureStream());
        } else if (this.video_.mozCaptureStream) {
          resolve(this.video_.mozCaptureStream());
        } else {
          const e = new Error('Stream capture is not supported');
          console.error(e);
          reject(e);
        }
        resolve = null;
        reject = null;
      };
    });
    await this.stream_;
    console.log(
        '[VideoSource] Received source video stream.',
        `${this.debugPath_}.stream_ =`, this.stream_);
    return this.stream_;
  }
  /** @override */
  destroy() {
    if (this.video_) {
      console.log('[VideoSource] Stopping source video');
      this.video_.pause();
      if (this.video_.parentNode) {
        this.video_.parentNode.removeChild(this.video_);
      }
    }
  }
}
