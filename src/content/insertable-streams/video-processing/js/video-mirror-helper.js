/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Helper to display a MediaStream in an HTMLVideoElement, based on the
 * visibility setting.
 */
class VideoMirrorHelper { // eslint-disable-line no-unused-vars
  constructor() {
    /** @private {boolean} */
    this.visibility_ = false;
    /** @private {?MediaStream} the stream to display */
    this.stream_ = null;
    /**
     * @private {?HTMLVideoElement} video element mirroring the camera stream.
     *    Set if visibility_ is true and stream_ is set.
     */
    this.video_ = null;
    /** @private {string} */
    this.debugPath_ = '<unknown>';
  }
  /**
   * Sets the path to this object from the debug global var.
   * @param {string} path
   */
  setDebugPath(path) {
    this.debugPath_ = path;
  }
  /**
   * Indicates if the video should be mirrored/displayed on the page.
   * @param {boolean} visible whether to add the video from the source stream to
   *     the page
   */
  setVisibility(visible) {
    this.visibility_ = visible;
    if (this.video_ && !this.visibility_) {
      this.video_.parentNode.removeChild(this.video_);
      this.video_ = null;
    }
    this.maybeAddVideoElement_();
  }

  /**
   * @param {!MediaStream} stream
   */
  setStream(stream) {
    this.stream_ = stream;
    this.maybeAddVideoElement_();
  }

  /** @private */
  maybeAddVideoElement_() {
    if (!this.video_ && this.visibility_ && this.stream_) {
      this.video_ =
        /** @type {!HTMLVideoElement} */ (document.createElement('video'));
      console.log(
          '[VideoMirrorHelper] Adding source video mirror.',
          `${this.debugPath_}.video_ =`, this.video_);
      this.video_.classList.add('video', 'sourceVideo');
      this.video_.srcObject = this.stream_;
      const outputVideoContainer =
          document.getElementById('outputVideoContainer');
      outputVideoContainer.parentNode.insertBefore(
          this.video_, outputVideoContainer);
      this.video_.play();
    }
  }

  /** Frees any resources used by this object. */
  destroy() {
    if (this.video_) {
      this.video_.pause();
      this.video_.srcObject = null;
      this.video_.parentNode.removeChild(this.video_);
    }
  }
}
