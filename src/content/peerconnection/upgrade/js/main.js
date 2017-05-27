/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var upgradeButton = document.getElementById('upgradeButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
upgradeButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
upgradeButton.onclick = upgrade;
hangupButton.onclick = hangup;

var startTime;
var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function() {
  trace('Local video videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.addEventListener('loadedmetadata', function() {
  trace('Remote video videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.onresize = function() {
  trace('Remote video size changed to ' +
    remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight);
  console.warn('RESIZE', remoteVideo.videoWidth, remoteVideo.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    var elapsedTime = window.performance.now() - startTime;
    trace('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
};

var localStream;
var pc1;
var pc2;
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 0
};

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

function gotStream(stream) {
  trace('Received local stream');
  localVideo.srcObject = stream;
  localStream = stream;
  callButton.disabled = false;
}

function start() {
  trace('Requesting local stream');
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function call() {
  callButton.disabled = true;
  upgradeButton.disabled = false;
  hangupButton.disabled = false;
  trace('Starting call');
  startTime = window.performance.now();
  var audioTracks = localStream.getAudioTracks();
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

  localStream.getTracks().forEach(
    function(track) {
      pc1.addTrack(
        track,
        localStream
      );
    }
  );
  trace('Added local stream to pc1');

  trace('pc1 createOffer start');
  pc1.createOffer(
    offerOptions
  ).then(
    onCreateOfferSuccess,
    onCreateSessionDescriptionError
  );
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
  trace('Offer from pc1\n' + desc.sdp);
  trace('pc1 setLocalDescription start');
  pc1.setLocalDescription(desc).then(
    function() {
      onSetLocalSuccess(pc1);
    },
    onSetSessionDescriptionError
  );
  trace('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc).then(
    function() {
      onSetRemoteSuccess(pc2);
    },
    onSetSessionDescriptionError
  );
  trace('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer().then(
    onCreateAnswerSuccess,
    onCreateSessionDescriptionError
  );
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

function gotRemoteStream(e) {
  console.log('gotRemoteStream', e.track, e.streams[0]);

  // reset srcObject to work around minor bugs in Chrome and Edge.
  remoteVideo.srcObject = null;
  remoteVideo.srcObject = e.streams[0];
}

function onCreateAnswerSuccess(desc) {
  trace('Answer from pc2:\n' + desc.sdp);
  trace('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc).then(
    function() {
      onSetLocalSuccess(pc2);
    },
    onSetSessionDescriptionError
  );
  trace('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc).then(
    function() {
      onSetRemoteSuccess(pc1);
    },
    onSetSessionDescriptionError
  );
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

function upgrade() {
  upgradeButton.disabled = true;
  navigator.mediaDevices.getUserMedia({video: true})
  .then(function(stream) {
    var videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      trace('Using video device: ' + videoTracks[0].label);
    }
    localStream.addTrack(videoTracks[0]);
    localVideo.srcObject = null;
    localVideo.srcObject = localStream;
    pc1.addTrack(
      videoTracks[0],
      localStream
    );
    return pc1.createOffer();
  })
  .then(function(offer) {
    return pc1.setLocalDescription(offer);
  })
  .then(function() {
    return pc2.setRemoteDescription(pc1.localDescription);
  })
  .then(function() {
    return pc2.createAnswer();
  })
  .then(function(answer) {
    return pc2.setLocalDescription(answer);
  })
  .then(function() {
    return pc1.setRemoteDescription(pc2.localDescription);
  });
}

function hangup() {
  trace('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;

  var videoTracks = localStream.getVideoTracks();
  videoTracks.forEach(function(videoTrack) {
    videoTrack.stop();
    localStream.removeTrack(videoTrack);
  });
  localVideo.srcObject = null;
  localVideo.srcObject = localStream;

  hangupButton.disabled = true;
  callButton.disabled = false;
}
