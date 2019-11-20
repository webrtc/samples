/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const vid1 = document.getElementById('vid1');
const vid2 = document.getElementById('vid2');
const callButton = document.getElementById('callButton');
const acceptButton = document.getElementById('acceptButton');
const hangUpButton = document.getElementById('hangUpButton');

callButton.addEventListener('click', start);
acceptButton.addEventListener('click', accept);
hangUpButton.addEventListener('click', stop);

callButton.disabled = true;
acceptButton.disabled = true;
hangUpButton.disabled = true;

let pc1 = null;
let pc2 = null;
let localstream;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function gotStream(stream) {
  console.log('Received local stream');
  vid1.srcObject = stream;
  localstream = stream;
  callButton.disabled = false;
}

navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true
    })
    .then(gotStream)
    .catch(e => alert(`getUserMedia() error: ${e}`));

function start() {
  callButton.disabled = true;
  acceptButton.disabled = false;
  hangUpButton.disabled = false;
  console.log('Starting Call');
  const videoTracks = localstream.getVideoTracks();
  const audioTracks = localstream.getAudioTracks();
  if (videoTracks.length > 0) {
    console.log(`Using Video device: ${videoTracks[0].label}`);
  }
  if (audioTracks.length > 0) {
    console.log(`Using Audio device: ${audioTracks[0].label}`);
  }

  const servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = e => onIceCandidate(pc1, e);
  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = e => onIceCandidate(pc2, e);
  pc2.ontrack = gotRemoteStream;

  localstream.getTracks().forEach(track => pc1.addTrack(track, localstream));
  console.log('Adding Local Stream to peer connection');

  pc1.createOffer(offerOptions).then(gotDescription1, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
  stop();
}

function onCreateAnswerError(error) {
  console.log(`Failed to set createAnswer: ${error.toString()}`);
  stop();
}

function onSetLocalDescriptionError(error) {
  console.log(`Failed to set setLocalDescription: ${error.toString()}`);
  stop();
}

function onSetLocalDescriptionSuccess() {
  console.log('localDescription success.');
}

function gotDescription1(desc) {
  pc1.setLocalDescription(desc).then(
      onSetLocalDescriptionSuccess,
      onSetLocalDescriptionError
  );
  console.log(`Offer from pc1\n${desc.sdp}`);
  pc2.setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(desc) {
  // Provisional answer, set a=inactive & set sdp type to pranswer.
  desc.sdp = desc.sdp.replace(/a=recvonly/g, 'a=inactive');
  desc.type = 'pranswer';
  pc2.setLocalDescription(desc).then(onSetLocalDescriptionSuccess, onSetLocalDescriptionError);
  console.log(`Pranswer from pc2\n${desc.sdp}`);
  pc1.setRemoteDescription(desc);
}

function gotDescription3(desc) {
  // Final answer, setting a=recvonly & sdp type to answer.
  desc.sdp = desc.sdp.replace(/a=inactive/g, 'a=recvonly');
  desc.type = 'answer';
  pc2.setLocalDescription(desc).then(onSetLocalDescriptionSuccess, onSetLocalDescriptionError);
  console.log(`Answer from pc2\n${desc.sdp}`);
  pc1.setRemoteDescription(desc);
}

function accept() {
  pc2.createAnswer().then(gotDescription3, onCreateAnswerError);
  acceptButton.disabled = true;
  callButton.disabled = true;
}

function stop() {
  console.log('Ending Call' + '\n\n');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  acceptButton.disabled = true;
  callButton.disabled = false;
  hangUpButton.disabled = true;
}

function gotRemoteStream(e) {
  if (vid2.srcObject !== e.streams[0]) {
    vid2.srcObject = e.streams[0];
    console.log('Received remote stream');
  }
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function onIceCandidate(pc, event) {
  getOtherPc(pc)
      .addIceCandidate(event.candidate)
      .then(() => onAddIceCandidateSuccess(pc), err => onAddIceCandidateError(pc, err));
  console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}
