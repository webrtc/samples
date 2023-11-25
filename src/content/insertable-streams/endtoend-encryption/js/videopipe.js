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

// Preferring a certain codec is an expert option without GUI.
// Use opus by default.
// eslint-disable-next-line prefer-const
let preferredAudioCodecMimeType = 'audio/opus';
// Use VP8 by default to limit depacketization issues.
// eslint-disable-next-line prefer-const
let preferredVideoCodecMimeType = 'video/VP8';

function VideoPipe(stream, forceSend, forceReceive, handler) {
  this.pc1 = new RTCPeerConnection({
    encodedInsertableStreams: forceSend,
  });
  this.pc2 = new RTCPeerConnection({
    encodedInsertableStreams: forceReceive,
  });
  if ('setCodecPreferences' in window.RTCRtpTransceiver.prototype) {
    this.pc2.ontrack = (e) => {
      if (e.track.kind === 'audio' && preferredAudioCodecMimeType ) {
        const {codecs} = RTCRtpReceiver.getCapabilities('audio');
        const selectedCodecIndex = codecs.findIndex(c => c.mimeType === preferredAudioCodecMimeType);
        const selectedCodec = codecs[selectedCodecIndex];
        codecs.splice(selectedCodecIndex, 1);
        codecs.unshift(selectedCodec);
        e.transceiver.setCodecPreferences(codecs);
      } else if (e.track.kind === 'video' && preferredVideoCodecMimeType) {
        const {codecs} = RTCRtpReceiver.getCapabilities('video');
        const selectedCodecIndex = codecs.findIndex(c => c.mimeType === preferredVideoCodecMimeType);
        const selectedCodec = codecs[selectedCodecIndex];
        codecs.splice(selectedCodecIndex, 1);
        codecs.unshift(selectedCodec);
        e.transceiver.setCodecPreferences(codecs);
      }
      handler(e);
    };
  } else {
    this.pc2.ontrack = handler;
  }
  stream.getTracks().forEach((track) => this.pc1.addTrack(track, stream));
}

VideoPipe.prototype.negotiate = async function() {
  this.pc1.onicecandidate = e => this.pc2.addIceCandidate(e.candidate);
  this.pc2.onicecandidate = e => this.pc1.addIceCandidate(e.candidate);

  const offer = await this.pc1.createOffer();
  // Disable video/red to allow for easier inspection in Wireshark.
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
