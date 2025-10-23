/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
//
// A "videopipe" abstraction on top of WebRTC.
//
// The usage of this abstraction:
// var pipe = new VideoPipe(mediastream, handlerFunction);
// handlerFunction = function(MediaStreamTrackEvent) {
//   do_something
// }
// pipe.close();
//
// The VideoPipe will set up 2 PeerConnections, connect them to each
// other, and call HandlerFunction when the stream's track is available
// in the second PeerConnection.
//
'use strict';

function VideoPipe(stream, forceSend, forceReceive, handler) {
  this.pc1 = new RTCPeerConnection();
  this.pc2 = new RTCPeerConnection();
  this.pc2.ontrack = handler;
  stream.getTracks().forEach((track) => this.pc1.addTrack(track, stream));
}

VideoPipe.prototype.negotiate = async function() {
  this.pc1.onicecandidate = e => this.pc2.addIceCandidate(e.candidate);
  this.pc2.onicecandidate = e => this.pc1.addIceCandidate(e.candidate);

  await this.pc1.setLocalDescription();
  await this.pc2.setRemoteDescription(this.pc1.localDescription);
  await this.pc2.setLocalDescription();
  await this.pc1.setRemoteDescription(this.pc2.localDescription);
};

VideoPipe.prototype.close = function() {
  this.pc1.close();
  this.pc2.close();
};
