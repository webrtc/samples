/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

// A "videopipe" abstraction on top of WebRTC.
//
// Usage:
//
// var pipe = new VideoPipe(mediastream, handlerFunction);
// handlerFunction = function(mediastream) {
//   // do something
// }
// pipe.close();
//
// The VideoPipe will set up two peer connections, connect them to each
// other, and call handlerFunction() when the stream is available in
// the second PeerConnection.

'use strict';

/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, indent:2, quotmark: single, undef: true, unused: strict */

function errorHandler(context) {
  return function(error) {
    trace('Failure in ' + context + ': ' + error.toString());
  };
}

function successHandler(context) {
  return function() {
    trace('Success in ' + context);
  };
}

function noAction() {}

function VideoPipe(stream, handler) {
  var servers = null;
  var pc1 = new RTCPeerConnection(servers);
  var pc2 = new RTCPeerConnection(servers);

  pc1.addStream(stream);
  pc1.onicecandidate = function(event) {
    if (event.candidate) {
      pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
        noAction, errorHandler('AddIceCandidate'));
    }
  };
  pc2.onicecandidate = function(event) {
    if (event.candidate) {
      pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
        noAction, errorHandler('AddIceCandidate'));
    }
  };
  pc2.onaddstream = function(e) {
    handler(e.stream);
  };
  pc1.createOffer(function(desc) {
    pc1.setLocalDescription(desc);
    pc2.setRemoteDescription(desc);
    pc2.createAnswer(function(desc2) {
      pc2.setLocalDescription(desc2);
      pc1.setRemoteDescription(desc2);
    }, errorHandler('pc2.createAnswer'));
  }, errorHandler('pc1.createOffer'));
  this.pc1 = pc1;
  this.pc2 = pc2;
}

VideoPipe.prototype.close = function() {
  this.pc1.close();
  this.pc2.close();
};