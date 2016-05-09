/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var vid1 = document.getElementById('vid1');
var vid2 = document.getElementById('vid2');
var btn1 = document.getElementById('btn1');
var btn2 = document.getElementById('btn2');
var btn3 = document.getElementById('btn3');

btn1.addEventListener('click', start);
btn2.addEventListener('click', accept);
btn3.addEventListener('click', stop);

btn1.disabled = true;
btn2.disabled = true;
btn3.disabled = true;

var pc1 = null;
var pc2 = null;
var localstream;
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function gotStream(stream) {
  trace('Received local stream');
  vid1.srcObject = stream;
  localstream = stream;
  btn1.disabled = false;
}

navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e);
});

function start() {
  btn1.disabled = true;
  btn2.disabled = false;
  btn3.disabled = false;
  trace('Starting Call');
  var videoTracks = localstream.getVideoTracks();
  var audioTracks = localstream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace('Using Video device: ' + videoTracks[0].label);
  }
  if (audioTracks.length > 0) {
    trace('Using Audio device: ' + audioTracks[0].label);
  }

  var servers = null;
  pc1 = new RTCPeerConnection(servers);
  trace('Created local peer connection object pc1');
  pc1.onicecandidate = iceCallback1;
  pc2 = new RTCPeerConnection(servers);
  trace('Created remote peer connection object pc2');
  pc2.onicecandidate = iceCallback2;
  pc2.onaddstream = gotRemoteStream;

  pc1.addStream(localstream);
  trace('Adding Local Stream to peer connection');

  pc1.createOffer(
    offerOptions
  ).then(
    gotDescription1,
    onCreateSessionDescriptionError
  );
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
  stop();
}

function onCreateAnswerError(error) {
  trace('Failed to set createAnswer: ' + error.toString());
  stop();
}

function onSetLocalDescriptionError(error) {
  trace('Failed to set setLocalDescription: ' + error.toString());
  stop();
}

function onSetLocalDescriptionSuccess() {
  trace('localDescription success.');
}

function gotDescription1(desc) {
  pc1.setLocalDescription(desc).then(
    onSetLocalDescriptionSuccess,
    onSetLocalDescriptionError
  );
  trace('Offer from pc1 \n' + desc.sdp);
  pc2.setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function gotDescription2(desc) {
  // Provisional answer, set a=inactive & set sdp type to pranswer.
  desc.sdp = desc.sdp.replace(/a=recvonly/g, 'a=inactive');
  desc.type = 'pranswer';
  pc2.setLocalDescription(desc).then(
    onSetLocalDescriptionSuccess,
    onSetLocalDescriptionError
  );
  trace('Pranswer from pc2 \n' + desc.sdp);
  pc1.setRemoteDescription(desc);
}

function gotDescription3(desc) {
  // Final answer, setting a=recvonly & sdp type to answer.
  desc.sdp = desc.sdp.replace(/a=inactive/g, 'a=recvonly');
  desc.type = 'answer';
  pc2.setLocalDescription(desc).then(
    onSetLocalDescriptionSuccess,
    onSetLocalDescriptionError
  );
  trace('Answer from pc2 \n' + desc.sdp);
  pc1.setRemoteDescription(desc);
}

function accept() {
  pc2.createAnswer().then(
    gotDescription3,
    onCreateAnswerError
  );
  btn2.disabled = true;
  btn1.disabled = false;
}

function stop() {
  trace('Ending Call' + '\n\n');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  btn2.disabled = true;
  btn1.disabled = false;
  btn3.disabled = true;
}

function gotRemoteStream(e) {
  vid2.srcObject = e.stream;
  trace('Received remote stream');
}

function iceCallback1(event) {
  if (event.candidate) {
    pc2.addIceCandidate(
      new RTCIceCandidate(event.candidate)
    ).then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event) {
  if (event.candidate) {
    pc1.addIceCandidate(
      new RTCIceCandidate(event.candidate)
    ).then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}
