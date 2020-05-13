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
// handlerFunction = function(mediastream) {
//   do_something
// }
// pipe.close();
//
// The VideoPipe will set up 2 PeerConnections, connect them to each
// other, and call HandlerFunction when the stream is available in the
// second PeerConnection.
//
'use strict';

function VideoPipe(stream, forceSend, forceReceive, handler) {
  this.pc1 = new RTCPeerConnection({
    encodedInsertableStreams: forceSend,
    forceEncodedVideoInsertableStreams: forceSend, // legacy, to be removed in M85.
    forceEncodedAudioInsertableStreams: forceSend, // legacy, to be removed in M85.
  });
  this.pc2 = new RTCPeerConnection({
    encodedInsertableStreams: forceReceive,
    forceEncodedVideoInsertableStreams: forceReceive, // legacy, to be removed in M85.
    forceEncodedAudioInsertableStreams: forceReceive, // legacy, to be removed in M85.
  });

  stream.getTracks().forEach((track) => this.pc1.addTrack(track, stream));
  this.pc2.ontrack = handler;
}

VideoPipe.prototype.negotiate = async function() {
  this.pc1.onicecandidate = e => this.pc2.addIceCandidate(e.candidate);
  this.pc2.onicecandidate = e => this.pc1.addIceCandidate(e.candidate);

  const offer = await this.pc1.createOffer();
  await this.pc2.setRemoteDescription({type: 'offer', sdp: offer.sdp.replace('red/90000', 'green/90000')});
  await this.pc1.setLocalDescription(offer);

  const answer = await this.pc2.createAnswer();
  await this.pc1.setRemoteDescription(answer);
  await this.pc2.setLocalDescription(answer);
};

VideoPipe.prototype.close = function() {
  this.pc1.close();
  this.pc2.close();
};
