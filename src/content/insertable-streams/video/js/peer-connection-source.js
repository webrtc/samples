/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global PeerConnectionPipe */ // defined in peer-connection-pipe.js
/* global VideoMirrorHelper */ // defined in video-mirror-helper.js

/**
 * Sends the original source video to one end of an RTCPeerConnection and
 * provides the remote end as the final source.
 * In this sample, a PeerConnectionSource represents receiving video from a
 * remote participant and locally processing it using a
 * MediaStreamTrackProcessor before displaying it on the screen. Contrast with a
 * PeerConnectionSink.
 * @implements {MediaStreamSource} in pipeline.js
 */
class PeerConnectionSource { // eslint-disable-line no-unused-vars
  /**
   * @param {!MediaStreamSource} originalSource original stream source, whose
   *     output is sent over the peer connection
   */
  constructor(originalSource) {
    /**
     * @private @const {!VideoMirrorHelper} manages displaying the video stream
     *     in the page
     */
    this.videoMirrorHelper_ = new VideoMirrorHelper();
    /**
     * @private @const {!MediaStreamSource} original stream source, whose output
     *     is sent on the sender peer connection. In an actual video calling
     *     app, this stream would be generated from the remote participant's
     *     camera. However, in this sample, both sides of the peer connection
     *     are local to allow the sample to be self-contained.
     */
    this.originalStreamSource_ = originalSource;
    /**
     * @private {?PeerConnectionPipe} handles piping the MediaStream through an
     *     RTCPeerConnection
     */
    this.pipe_ = null;
    /** @private {string} */
    this.debugPath_ = '<unknown>';
  }
  /** @override */
  setDebugPath(path) {
    this.debugPath_ = path;
    this.videoMirrorHelper_.setDebugPath(`${path}.videoMirrorHelper_`);
    this.originalStreamSource_.setDebugPath(`${path}.originalStreamSource_`);
    if (this.pipe_) this.pipe_.setDebugPath(`${path}.pipe_`);
  }
  /** @override */
  setVisibility(visible) {
    this.videoMirrorHelper_.setVisibility(visible);
  }

  /** @override */
  async getMediaStream() {
    if (this.pipe_) return this.pipe_.getOutputStream();

    console.log(
        '[PeerConnectionSource] Obtaining original source media stream.',
        `${this.debugPath_}.originalStreamSource_ =`,
        this.originalStreamSource_);
    const originalStream = await this.originalStreamSource_.getMediaStream();
    this.pipe_ =
        new PeerConnectionPipe(originalStream, `${this.debugPath_}.pipe_`);
    const outputStream = await this.pipe_.getOutputStream();
    console.log(
        '[PeerConnectionSource] Received callee peer connection stream.',
        outputStream);
    this.videoMirrorHelper_.setStream(outputStream);
    return outputStream;
  }

  /** @override */
  destroy() {
    this.videoMirrorHelper_.destroy();
    if (this.pipe_) this.pipe_.destroy();
    this.originalStreamSource_.destroy();
  }
}
