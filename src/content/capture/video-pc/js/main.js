/*
*  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

var leftVideo = document.getElementById('leftVideo');
var rightVideo = document.getElementById('rightVideo');

var stream;

var pc1;
var pc2;
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

var startTime;

function maybeCreateStream() {
  if (stream) {
    return;
  }
  if (leftVideo.captureStream) {
    stream = leftVideo.captureStream();
    console.log('Captured stream from leftVideo with captureStream',
      stream);
    call();
  } else if (leftVideo.mozCaptureStream) {
    stream = leftVideo.mozCaptureStream();
    console.log('Captured stream from leftVideo with mozCaptureStream()',
      stream);
    call();
  } else {
    trace('captureStream() not supported');
  }
}

// Video tag capture must be set up after video tracks are enumerated.
leftVideo.oncanplay = maybeCreateStream;
if (leftVideo.readyState >= 3) {  // HAVE_FUTURE_DATA
  // Video is already ready to play, call maybeCreateStream in case oncanplay
  // fired before we registered the event handler.
  maybeCreateStream();
}

leftVideo.play();

rightVideo.onloadedmetadata = function() {
  trace('Remote video videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
};

rightVideo.onresize = function() {
  trace('Remote video size changed to ' +
    rightVideo.videoWidth + 'x' + rightVideo.videoHeight);
  // We'll use the first onresize callback as an indication that
  // video has started playing out.
  if (startTime) {
    var elapsedTime = window.performance.now() - startTime;
    trace('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
};

function call() {
  trace('Starting call');
  startTime = window.performance.now();
  var videoTracks = stream.getVideoTracks();
  var audioTracks = stream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace('Using video device: ' + videoTracks[0].label);
  }
  if (audioTracks.length > 0) {
    trace('Using audio device: ' + audioTracks[0].label);
  }
  var servers = null;
  pc1 = new RTCPeerConnection(servers);
  trace('Created local peer connection object pc1');
  pc1.onicecandidate = function(e) {
    onIceCandidate(pc1, e);
  };
  pc2 = new RTCPeerConnection(servers);
  trace('Created remote peer connection object pc2');
  pc2.onicecandidate = function(e) {
    onIceCandidate(pc2, e);
  };
  pc1.oniceconnectionstatechange = function(e) {
    onIceStateChange(pc1, e);
  };
  pc2.oniceconnectionstatechange = function(e) {
    onIceStateChange(pc2, e);
  };
  pc2.ontrack = gotRemoteStream;

  stream.getTracks().forEach(
    function(track) {
      pc1.addTrack(
        track,
        stream
      );
    }
  );
  trace('Added local stream to pc1');

  trace('pc1 createOffer start');
  pc1.createOffer(onCreateOfferSuccess, onCreateSessionDescriptionError,
    offerOptions);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
  trace('Offer from pc1\n' + desc.sdp);
  trace('pc1 setLocalDescription start');
  pc1.setLocalDescription(desc, function() {
    onSetLocalSuccess(pc1);
  }, onSetSessionDescriptionError);
  trace('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc, function() {
    onSetRemoteSuccess(pc2);
  }, onSetSessionDescriptionError);
  trace('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer(onCreateAnswerSuccess, onCreateSessionDescriptionError);
}

function onSetLocalSuccess(pc) {
  trace(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
  trace(getName(pc) + ' setRemoteDescription complete');
}

function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function gotRemoteStream(event) {
  if (rightVideo.srcObject !== event.streams[0]) {
    rightVideo.srcObject = event.streams[0];
    console.log('pc2 received remote stream', event);
  }
}

function onCreateAnswerSuccess(desc) {
  trace('Answer from pc2:\n' + desc.sdp);
  trace('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc, function() {
    onSetLocalSuccess(pc2);
  }, onSetSessionDescriptionError);
  trace('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc, function() {
    onSetRemoteSuccess(pc1);
  }, onSetSessionDescriptionError);
}

function onIceCandidate(pc, event) {
  getOtherPc(pc).addIceCandidate(event.candidate)
  .then(
    function() {
      onAddIceCandidateSuccess(pc);
    },
    function(err) {
      onAddIceCandidateError(pc, err);
    }
  );
  trace(getName(pc) + ' ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));
}

function onAddIceCandidateSuccess(pc) {
  trace(getName(pc) + ' addIceCandidate success');
}

function onAddIceCandidateError(pc, error) {
  trace(getName(pc) + ' failed to add ICE Candidate: ' + error.toString());
}

function onIceStateChange(pc, event) {
  if (pc) {
    trace(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
    console.log('ICE state change event: ', event);
  }
}

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}
