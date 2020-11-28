/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Sends a MediaStream to one end of an RTCPeerConnection and provides the
 * remote end as the resulting MediaStream.
 * In an actual video calling app, the two RTCPeerConnection objects would be
 * instantiated on different devices. However, in this sample, both sides of the
 * peer connection are local to allow the sample to be self-contained.
 * For more detailed samples using RTCPeerConnection, take a look at
 * https://webrtc.github.io/samples/.
 */
class PeerConnectionPipe { // eslint-disable-line no-unused-vars
  /**
   * @param {!MediaStream} inputStream stream to pipe over the peer connection
   * @param {string} debugPath the path to this object from the debug global var
   */
  constructor(inputStream, debugPath) {
    /**
     * @private @const {!RTCPeerConnection} the calling side of the peer
     *     connection, connected to inputStream_.
     */
    this.caller_ = new RTCPeerConnection(null);
    /**
     * @private @const {!RTCPeerConnection} the answering side of the peer
     *     connection, providing the stream returned by getMediaStream.
     */
    this.callee_ = new RTCPeerConnection(null);
    /** @private {string} */
    this.debugPath_ = debugPath;
    /**
     * @private @const {!Promise<!MediaStream>} the stream containing tracks
     *     from callee_, returned by getMediaStream.
     */
    this.outputStreamPromise_ = this.init_(inputStream);
  }
  /**
   * Sets the path to this object from the debug global var.
   * @param {string} path
   */
  setDebugPath(path) {
    this.debugPath_ = path;
  }
  /**
   * @param {!MediaStream} inputStream stream to pipe over the peer connection
   * @return {!Promise<!MediaStream>}
   * @private
   */
  async init_(inputStream) {
    console.log(
        '[PeerConnectionPipe] Initiating peer connection.',
        `${this.debugPath_} =`, this);
    this.caller_.onicecandidate = (/** !RTCPeerConnectionIceEvent*/ event) => {
      if (event.candidate) this.callee_.addIceCandidate(event.candidate);
    };
    this.callee_.onicecandidate = (/** !RTCPeerConnectionIceEvent */ event) => {
      if (event.candidate) this.caller_.addIceCandidate(event.candidate);
    };
    const outputStream = new MediaStream();
    const receiverStreamPromise = new Promise(resolve => {
      this.callee_.ontrack = (/** !RTCTrackEvent */ event) => {
        outputStream.addTrack(event.track);
        if (outputStream.getTracks().length == inputStream.getTracks().length) {
          resolve(outputStream);
        }
      };
    });
    inputStream.getTracks().forEach(track => {
      this.caller_.addTransceiver(track, {direction: 'sendonly'});
    });
    await this.caller_.setLocalDescription();
    await this.callee_.setRemoteDescription(
        /** @type {!RTCSessionDescription} */ (this.caller_.localDescription));
    await this.callee_.setLocalDescription();
    await this.caller_.setRemoteDescription(
        /** @type {!RTCSessionDescription} */ (this.callee_.localDescription));
    await receiverStreamPromise;
    console.log(
        '[PeerConnectionPipe] Peer connection established.',
        `${this.debugPath_}.caller_ =`, this.caller_,
        `${this.debugPath_}.callee_ =`, this.callee_);
    return receiverStreamPromise;
  }

  /**
   * Provides the MediaStream that has been piped through a peer connection.
   * @return {!Promise<!MediaStream>}
   */
  getOutputStream() {
    return this.outputStreamPromise_;
  }

  /** Frees any resources used by this object. */
  destroy() {
    console.log('[PeerConnectionPipe] Closing peer connection.');
    this.caller_.close();
    this.callee_.close();
  }
}
