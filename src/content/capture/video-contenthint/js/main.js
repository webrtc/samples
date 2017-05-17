/*
*  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

var srcVideo = document.getElementById('srcVideo');
var motionVideo = document.getElementById('motionVideo');
var detailVideo = document.getElementById('detailVideo');

var srcStream;
var motionStream;
var detailStream;

var offerOptions = {
  offerToReceiveAudio: 0,
  offerToReceiveVideo: 1
};

function maybeCreateStream() {
  if (srcStream) {
    return;
  }
  if (srcVideo.captureStream) {
    srcStream = srcVideo.captureStream();
    call();
  } else {
    trace('captureStream() not supported');
  }
}

// Video tag capture must be set up after video tracks are enumerated.
srcVideo.oncanplay = maybeCreateStream;
if (srcVideo.readyState >= 3) {  // HAVE_FUTURE_DATA
  // Video is already ready to play, call maybeCreateStream in case oncanplay
  // fired before we registered the event handler.
  maybeCreateStream();
}

srcVideo.play();

function setVideoTrackContentHints(stream, hint) {
  var tracks = stream.getVideoTracks();
  tracks.forEach(function(track) {
    if ('contentHint' in track) {
      track.contentHint = hint;
      if (track.contentHint !== hint) {
        trace('Invalid video track contentHint: \'' + hint + '\'');
      }
    } else {
      trace('MediaStreamTrack contentHint attribute not supported');
    }
  });
}

function call() {
  // This creates multiple independent PeerConnections instead of multiple
  // streams on a single PeerConnection object so that b=AS (the bitrate
  // constraints) can be applied independently.
  motionStream = srcStream.clone();
  // TODO(pbos): Remove fluid when no clients use it, motion is the newer name.
  setVideoTrackContentHints(motionStream, 'fluid');
  setVideoTrackContentHints(motionStream, 'motion');
  establishPC(motionVideo, motionStream);
  detailStream = srcStream.clone();
  // TODO(pbos): Remove detailed when no clients use it, detail is the newer
  // name.
  setVideoTrackContentHints(detailStream, 'detailed');
  setVideoTrackContentHints(detailStream, 'detail');
  establishPC(detailVideo, detailStream);
}

function establishPC(videoTag, stream) {
  var pc1 = new RTCPeerConnection(null);
  var pc2 = new RTCPeerConnection(null);
  pc1.onicecandidate = function(e) {
    onIceCandidate(pc1, pc2, e);
  };
  pc2.onicecandidate = function(e) {
    onIceCandidate(pc2, pc1, e);
  };
  pc2.ontrack = function(event) {
    if (videoTag.srcObject !== event.streams[0]) {
      videoTag.srcObject = event.streams[0];
    }
  };

  stream.getTracks().forEach(
    function(track) {
      pc1.addTrack(
        track,
        stream
      );
    }
  );
  pc1.createOffer(offerOptions).then(function(desc) {
    pc1.setLocalDescription(desc).then(function() {
      return pc2.setRemoteDescription(desc);
    }).then(function() {
      return pc2.createAnswer();
    }).then(function(answerDesc) {
      onCreateAnswerSuccess(pc1, pc2, answerDesc);
    }).catch(onSetSessionDescriptionError);
  }).catch(function(e) {
    trace('Failed to create session description: ' + e.toString());
  });
}

function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function onCreateAnswerSuccess(pc1, pc2, desc) {
  // Hard-code video bitrate to 50kbps.
  desc.sdp = desc.sdp.replace(/a=mid:video\r\n/g,
                              'a=mid:video\r\nb=AS:' + 50 + '\r\n');
  pc2.setLocalDescription(desc).then(function() {
    return pc1.setRemoteDescription(desc);
  }).catch(onSetSessionDescriptionError);
}

function onIceCandidate(pc, otherPc, event) {
  otherPc.addIceCandidate(event.candidate);
}
