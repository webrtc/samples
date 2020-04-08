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

function VideoPipe(stream, sendTransform, receiveTransform, handler) {
  this.pc1 = new RTCPeerConnection({
    forceEncodedVideoInsertableStreams: !!sendTransform,
    forceEncodedAudioInsertableStreams: !!sendTransform,
  });
  this.pc2 = new RTCPeerConnection({
    forceEncodedVideoInsertableStreams: !!receiveTransform,
    forceEncodedAudioInsertableStreams: !!receiveTransform,
  });

  stream.getTracks().forEach((track) => {
    const sender = this.pc1.addTrack(track, stream);
    if (sendTransform) {
      const senderStreams = track.kind === 'video' ?
        sender.createEncodedVideoStreams() :
        sender.createEncodedAudioStreams();
      const senderTransformStream = new TransformStream({
        start() {},
        flush() {},
        transform: sendTransform
      });
      senderStreams.readableStream
          .pipeThrough(senderTransformStream)
          .pipeTo(senderStreams.writableStream);
    }
  });

  this.pc2.ontrack = e => {
    if (receiveTransform) {
      const transform = new TransformStream({
        start() {},
        flush() {},
        transform: receiveTransform
      });
      const receiverStreams = e.track.kind === 'video' ?
        e.receiver.createEncodedVideoStreams() :
        e.receiver.createEncodedAudioStreams();
      receiverStreams.readableStream
          .pipeThrough(transform)
          .pipeTo(receiverStreams.writableStream);
    }
    handler(e.streams[0]);
  };

  this.negotiate();
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
