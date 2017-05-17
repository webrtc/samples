/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

var video1 = document.querySelector('video#video1');
var video2 = document.querySelector('video#video2');
var video3 = document.querySelector('video#video3');

var pc1Local;
var pc1Remote;
var pc2Local;
var pc2Remote;
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function gotStream(stream) {
  trace('Received local stream');
  video1.srcObject = stream;
  window.localStream = stream;
  callButton.disabled = false;
}

function start() {
  trace('Requesting local stream');
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    console.log('getUserMedia() error: ', e);
  });
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  trace('Starting calls');
  var audioTracks = window.localStream.getAudioTracks();
  var videoTracks = window.localStream.getVideoTracks();
  if (audioTracks.length > 0) {
    trace('Using audio device: ' + audioTracks[0].label);
  }
  if (videoTracks.length > 0) {
    trace('Using video device: ' + videoTracks[0].label);
  }
  // Create an RTCPeerConnection via the polyfill.
  var servers = null;
  pc1Local = new RTCPeerConnection(servers);
  pc1Remote = new RTCPeerConnection(servers);
  pc1Remote.ontrack = gotRemoteStream1;
  pc1Local.onicecandidate = iceCallback1Local;
  pc1Remote.onicecandidate = iceCallback1Remote;
  trace('pc1: created local and remote peer connection objects');

  pc2Local = new RTCPeerConnection(servers);
  pc2Remote = new RTCPeerConnection(servers);
  pc2Remote.ontrack = gotRemoteStream2;
  pc2Local.onicecandidate = iceCallback2Local;
  pc2Remote.onicecandidate = iceCallback2Remote;
  trace('pc2: created local and remote peer connection objects');

  window.localStream.getTracks().forEach(
    function(track) {
      pc1Local.addTrack(
        track,
        window.localStream
      );
    }
  );
  trace('Adding local stream to pc1Local');
  pc1Local.createOffer(
    offerOptions
  ).then(
    gotDescription1Local,
    onCreateSessionDescriptionError
  );

  window.localStream.getTracks().forEach(
    function(track) {
      pc2Local.addTrack(
        track,
        window.localStream
      );
    }
  );
  trace('Adding local stream to pc2Local');
  pc2Local.createOffer(
    offerOptions
  ).then(
    gotDescription2Local,
    onCreateSessionDescriptionError
  );
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function gotDescription1Local(desc) {
  pc1Local.setLocalDescription(desc);
  trace('Offer from pc1Local \n' + desc.sdp);
  pc1Remote.setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc1Remote.createAnswer().then(
    gotDescription1Remote,
    onCreateSessionDescriptionError
  );
}

function gotDescription1Remote(desc) {
  pc1Remote.setLocalDescription(desc);
  trace('Answer from pc1Remote \n' + desc.sdp);
  pc1Local.setRemoteDescription(desc);
}

function gotDescription2Local(desc) {
  pc2Local.setLocalDescription(desc);
  trace('Offer from pc2Local \n' + desc.sdp);
  pc2Remote.setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2Remote.createAnswer().then(
    gotDescription2Remote,
    onCreateSessionDescriptionError
  );
}

function gotDescription2Remote(desc) {
  pc2Remote.setLocalDescription(desc);
  trace('Answer from pc2Remote \n' + desc.sdp);
  pc2Local.setRemoteDescription(desc);
}

function hangup() {
  trace('Ending calls');
  pc1Local.close();
  pc1Remote.close();
  pc2Local.close();
  pc2Remote.close();
  pc1Local = pc1Remote = null;
  pc2Local = pc2Remote = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}

function gotRemoteStream1(e) {
  if (video2.srcObject !== e.streams[0]) {
    video2.srcObject = e.streams[0];
    trace('pc1: received remote stream');
  }
}

function gotRemoteStream2(e) {
  if (video3.srcObject !== e.streams[0]) {
    video3.srcObject = e.streams[0];
    trace('pc2: received remote stream');
  }
}

function iceCallback1Local(event) {
  handleCandidate(event.candidate, pc1Remote, 'pc1: ', 'local');
}

function iceCallback1Remote(event) {
  handleCandidate(event.candidate, pc1Local, 'pc1: ', 'remote');
}

function iceCallback2Local(event) {
  handleCandidate(event.candidate, pc2Remote, 'pc2: ', 'local');
}

function iceCallback2Remote(event) {
  handleCandidate(event.candidate, pc2Local, 'pc2: ', 'remote');
}

function handleCandidate(candidate, dest, prefix, type) {
  dest.addIceCandidate(candidate)
  .then(
    onAddIceCandidateSuccess,
    onAddIceCandidateError
  );
  trace(prefix + 'New ' + type + ' ICE candidate: ' +
      (candidate ? candidate.candidate : '(null)'));
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add ICE candidate: ' + error.toString());
}
