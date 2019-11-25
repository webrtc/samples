/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global WebAudioExtended */

const audioElement = document.querySelector('audio');

const startButton = document.querySelector('button#start');
const stopButton = document.querySelector('button#stop');
startButton.onclick = start;
stopButton.onclick = stop;

const renderLocallyCheckbox = document.querySelector('input#renderLocally');
renderLocallyCheckbox.onclick = toggleRenderLocally;

document.addEventListener('keydown', handleKeyDown, false);

let localStream;
let pc1;
let pc2;

const webAudio = new WebAudioExtended();
webAudio.loadSound('audio/Shamisen-C4.wav');

function start() {
  webAudio.start();
  const constraints = {
    audio: true,
    video: false
  };
  navigator.mediaDevices
      .getUserMedia(constraints)
      .then(handleSuccess)
      .catch(handleFailure);
  startButton.disabled = true;
  stopButton.disabled = false;
}

function stop() {
  webAudio.stop();
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  startButton.enabled = true;
  stopButton.enabled = false;
  renderLocallyCheckbox.disabled = true;
  localStream.getTracks().forEach(track => track.stop());
}

function handleSuccess(stream) {
  renderLocallyCheckbox.disabled = false;
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 1) {
    console.log('Got one audio track:', audioTracks);
    const filteredStream = webAudio.applyFilter(stream);
    const servers = null;
    pc1 = new RTCPeerConnection(servers); // eslint-disable-line new-cap
    console.log('Created local peer connection object pc1');
    pc1.onicecandidate = e => onIceCandidate(pc1, e);
    pc2 = new RTCPeerConnection(servers); // eslint-disable-line new-cap
    console.log('Created remote peer connection object pc2');
    pc2.onicecandidate = e => onIceCandidate(pc2, e);
    pc2.ontrack = gotRemoteStream;
    filteredStream.getTracks().forEach(track => pc1.addTrack(track, filteredStream));
    pc1.createOffer().then(gotDescription1).catch(error => console.log(`createOffer failed: ${error}`));

    stream.oninactive = () => {
      console.log('Stream inactive:', stream);
      startButton.disabled = false;
      stopButton.disabled = true;
    };

    localStream = stream;
  } else {
    logError('The media stream contains an invalid number of audio tracks.');
    stream.getTracks().forEach(track => track.stop());
  }
}

function handleFailure(error) {
  startButton.disabled = false;
  stopButton.disabled = true;
  logError(`Failed to get access to local media. Error: ${error.name}`);
}

function gotDescription1(desc) {
  console.log(`Offer from pc1\n${desc.sdp}`);

  pc1.setLocalDescription(desc);
  console.log(`Offer from pc1\n${desc.sdp}`);
  pc2.setRemoteDescription(desc);
  pc2.createAnswer()
      .then(gotDescription2)
      .catch(error => logError(`createAnswer failed: ${error}`));
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc);
  console.log(`Answer from pc2\n${desc.sdp}`);
  pc1.setRemoteDescription(desc);
}

function gotRemoteStream(e) {
  if (audioElement.srcObject !== e.streams[0]) {
    audioElement.srcObject = e.streams[0];
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
  logError(`Failed to add Ice Candidate: ${error.toString()}`);
}

function handleKeyDown() {
  webAudio.addEffect();
}

function toggleRenderLocally() {
  console.log('Render locally: ', renderLocallyCheckbox.checked);
  webAudio.renderLocally(renderLocallyCheckbox.checked);
}

function logError(error) {
  document.querySelector('#errorMsg').innerHTML = error;
}
