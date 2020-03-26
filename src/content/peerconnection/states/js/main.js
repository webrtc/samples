/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const video1 = document.querySelector('video#video1');
const video2 = document.querySelector('video#video2');

const startButton = document.querySelector('button#startButton');
const callButton = document.querySelector('button#callButton');
const hangupButton = document.querySelector('button#hangupButton');
startButton.disabled = false;
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

const pc1StateDiv = document.querySelector('div#pc1State');
const pc1IceStateDiv = document.querySelector('div#pc1IceState');
const pc1ConnStateDiv = document.querySelector('div#pc1ConnState');
const pc2StateDiv = document.querySelector('div#pc2State');
const pc2IceStateDiv = document.querySelector('div#pc2IceState');
const pc2ConnStateDiv = document.querySelector('div#pc2ConnState');

let localstream;
let pc1;
let pc2;

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function gotStream(stream) {
  console.log('Received local stream');
  video1.srcObject = stream;
  localstream = stream;
  callButton.disabled = false;
}

function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true
      })
      .then(gotStream)
      .catch(e => alert('getUserMedia() error: ', e.name));
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
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
  pc1StateDiv.textContent = pc1.signalingState || pc1.readyState;
  pc1.onsignalingstatechange = stateCallback1;

  pc1IceStateDiv.textContent = pc1.iceConnectionState;
  pc1.oniceconnectionstatechange = iceStateCallback1;
  pc1.onconnectionstatechange = connStateCallback1;
  pc1.onicecandidate = e => onIceCandidate(pc1, e);

  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2StateDiv.textContent = pc2.signalingState || pc2.readyState;
  pc2.onsignalingstatechange = stateCallback2;

  pc2IceStateDiv.textContent = pc2.iceConnectionState;
  pc2.oniceconnectionstatechange = iceStateCallback2;
  pc2.onconnectionstatechange = connStateCallback2;
  pc2.onicecandidate = e => onIceCandidate(pc2, e);
  pc2.ontrack = gotRemoteStream;
  localstream.getTracks().forEach(track => pc1.addTrack(track, localstream));
  console.log('Adding Local Stream to peer connection');
  pc1.createOffer(offerOptions).then(gotDescription1, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function gotDescription1(description) {
  pc1.setLocalDescription(description);
  console.log(`Offer from pc1:\n${description.sdp}`);
  pc2.setRemoteDescription(description);
  pc2.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(description) {
  pc2.setLocalDescription(description);
  console.log(`Answer from pc2\n${description.sdp}`);
  pc1.setRemoteDescription(description);
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1StateDiv.textContent += ` => ${pc1.signalingState}` || pc1.readyState;
  pc2StateDiv.textContent += ` => ${pc2.signalingState}` || pc2.readyState;
  pc1IceStateDiv.textContent += ` => ${pc1.iceConnectionState}`;
  pc2IceStateDiv.textContent += ` => ${pc2.iceConnectionState}`;
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}

function gotRemoteStream(e) {
  if (video2.srcObject !== e.streams[0]) {
    video2.srcObject = e.streams[0];
    console.log('Got remote stream');
  }
}

function stateCallback1() {
  let state;
  if (pc1) {
    state = pc1.signalingState || pc1.readyState;
    console.log(`pc1 state change callback, state: ${state}`);
    pc1StateDiv.textContent += ` => ${state}`;
  }
}

function stateCallback2() {
  let state;
  if (pc2) {
    state = pc2.signalingState || pc2.readyState;
    console.log(`pc2 state change callback, state: ${state}`);
    pc2StateDiv.textContent += ` => ${state}`;
  }
}

function iceStateCallback1() {
  let iceState;
  if (pc1) {
    iceState = pc1.iceConnectionState;
    console.log(`pc1 ICE connection state change callback, state: ${iceState}`);
    pc1IceStateDiv.textContent += ` => ${iceState}`;
  }
}

function iceStateCallback2() {
  let iceState;
  if (pc2) {
    iceState = pc2.iceConnectionState;
    console.log(`pc2 ICE connection state change callback, state: ${iceState}`);
    pc2IceStateDiv.textContent += ` => ${iceState}`;
  }
}

function connStateCallback1() {
  if (pc1) {
    const {connectionState} = pc1;
    console.log(`pc1 connection state change callback, state: ${connectionState}`);
    pc1ConnStateDiv.textContent += ` => ${connectionState}`;
  }
}

function connStateCallback2() {
  if (pc2) {
    const {connectionState} = pc2;
    console.log(`pc2 connection state change callback, state: ${connectionState}`);
    pc2ConnStateDiv.textContent += ` => ${connectionState}`;
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
