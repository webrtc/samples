/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
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

function errorHandler(context) {
  return function(error) {
    trace('Failure in ' + context + ': ' + error.toString);
  };
}

// eslint-disable-next-line no-unused-vars
function successHandler(context) {
  return function() {
    trace('Success in ' + context);
  };
}

function noAction() {
}


function VideoPipe(stream, handler) {
  let servers = null;
  let pc1 = new RTCPeerConnection(servers);
  let pc2 = new RTCPeerConnection(servers);

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
