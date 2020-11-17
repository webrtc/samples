/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global VideoMirrorHelper */ // defined in video-mirror-helper.js

/**
 * Opens the device's camera with getUserMedia.
 * @implements {MediaStreamSource} in pipeline.js
 */
class CameraSource { // eslint-disable-line no-unused-vars
  constructor() {
    /**
     * @private @const {!VideoMirrorHelper} manages displaying the video stream
     *     in the page
     */
    this.videoMirrorHelper_ = new VideoMirrorHelper();
    /** @private {?MediaStream} camera stream, initialized in getMediaStream */
    this.stream_ = null;
    /** @private {string} */
    this.debugPath_ = '<unknown>';
  }
  /** @override */
  setDebugPath(path) {
    this.debugPath_ = path;
    this.videoMirrorHelper_.setDebugPath(`${path}.videoMirrorHelper_`);
  }
  /** @override */
  setVisibility(visible) {
    this.videoMirrorHelper_.setVisibility(visible);
  }
  /** @override */
  async getMediaStream() {
    if (this.stream_) return this.stream_;
    console.log('[CameraSource] Requesting camera.');
    this.stream_ =
        await navigator.mediaDevices.getUserMedia({audio: false, video: true});
    console.log(
        '[CameraSource] Received camera stream.',
        `${this.debugPath_}.stream_ =`, this.stream_);
    this.videoMirrorHelper_.setStream(this.stream_);
    return this.stream_;
  }
  /** @override */
  destroy() {
    console.log('[CameraSource] Stopping camera');
    this.videoMirrorHelper_.destroy();
    if (this.stream_) {
      this.stream_.getTracks().forEach(t => t.stop());
    }
  }
}
