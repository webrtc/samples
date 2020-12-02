/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global PeerConnectionPipe */ // defined in peer-connection-pipe.js
/* global VideoSink */ // defined in video-sink.js

/**
 * Sends the transformed video to one end of an RTCPeerConnection and displays
 * the remote end in a video element. In this sample, a PeerConnectionSink
 * represents processing the local user's camera input using a
 * MediaStreamTrackProcessor before sending it to a remote video call
 * participant. Contrast with a PeerConnectionSource.
 * @implements {MediaStreamSink} in pipeline.js
 */
class PeerConnectionSink { // eslint-disable-line no-unused-vars
  constructor() {
    /**
     * @private @const {!VideoSink} manages displaying the video stream in the
     *     page
     */
    this.videoSink_ = new VideoSink();
    /**
     * @private {?PeerConnectionPipe} handles piping the MediaStream through an
     *     RTCPeerConnection
     */
    this.pipe_ = null;
    /** @private {string} */
    this.debugPath_ = 'debug.pipeline.sink_';
    this.videoSink_.setDebugPath(`${this.debugPath_}.videoSink_`);
  }

  /** @override */
  async setMediaStream(stream) {
    console.log(
        '[PeerConnectionSink] Setting peer connection sink stream.', stream);
    if (this.pipe_) this.pipe_.destroy();
    this.pipe_ = new PeerConnectionPipe(stream, `${this.debugPath_}.pipe_`);
    const pipedStream = await this.pipe_.getOutputStream();
    console.log(
        '[PeerConnectionSink] Received callee peer connection stream.',
        pipedStream);
    await this.videoSink_.setMediaStream(pipedStream);
  }

  /** @override */
  destroy() {
    this.videoSink_.destroy();
    if (this.pipe_) this.pipe_.destroy();
  }
}
