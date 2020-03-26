/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const callButton = document.querySelector('button#callButton');
const sendTonesButton = document.querySelector('button#sendTonesButton');
const hangupButton = document.querySelector('button#hangupButton');
const durationInput = document.querySelector('input#duration');
const gapInput = document.querySelector('input#gap');
const tonesInput = document.querySelector('input#tones');
const durationValue = document.querySelector('span#durationValue');
const gapValue = document.querySelector('span#gapValue');
const sentTonesInput = document.querySelector('input#sentTones');
const dtmfStatusDiv = document.querySelector('div#dtmfStatus');
const audio = document.querySelector('audio');

let pc1;
let pc2;
let localStream;
let dtmfSender;

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 0
};

durationInput.oninput = () => {
  durationValue.textContent = durationInput.value;
};

gapInput.oninput = () => {
  gapValue.textContent = gapInput.value;
};

async function main() {
  addDialPadHandlers();

  sendTonesButton.disabled = true;
  hangupButton.disabled = true;

  callButton.addEventListener('click', e => call());
  sendTonesButton.addEventListener('click', e => handleSendTonesClick());
  hangupButton.addEventListener('click', e => hangup());
}

async function gotStream(stream) {
  console.log('Received local stream');
  localStream = stream;
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    console.log(`Using Audio device: ${audioTracks[0].label}`);
  }
  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  console.log('Adding Local Stream to peer connection');
  try {
    const offer = await pc1.createOffer(offerOptions);
    await gotLocalOffer(offer);
  } catch (e) {
    console.log('Failed to create session description:', e);
  }
}

async function call() {
  console.log('Starting call');
  const servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
  pc2.addEventListener('track', e => gotRemoteStream(e));

  console.log('Requesting local stream');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
    await gotStream(stream);
  } catch (e) {
    console.log('getUserMedia() error:', e);
  }

  callButton.disabled = true;
  hangupButton.disabled = false;
  sendTonesButton.disabled = false;
}

async function gotLocalOffer(desc) {
  console.log(`Offer from pc1\n${desc.sdp}`);
  pc1.setLocalDescription(desc);
  pc2.setRemoteDescription(desc);
  try {
    const answer = await pc2.createAnswer();
    gotRemoteAnswer(answer);
  } catch (e) {
    console.log('Failed to create session description:', e);
  }
}

function gotRemoteAnswer(desc) {
  pc2.setLocalDescription(desc);
  console.log(`Answer from pc2:\n${desc.sdp}`);
  pc1.setRemoteDescription(desc);
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  localStream = null;
  dtmfSender = null;
  callButton.disabled = false;
  hangupButton.disabled = true;
  sendTonesButton.disabled = true;
  dtmfStatusDiv.textContent = 'DTMF deactivated';
}

function gotRemoteStream(e) {
  if (audio.srcObject !== e.streams[0]) {
    audio.srcObject = e.streams[0];
    console.log('Received remote stream');

    if (!pc1.getSenders) {
      alert('This demo requires the RTCPeerConnection method getSenders() which is not support by this browser.');
      return;
    }
    const senders = pc1.getSenders();
    const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');
    if (!audioSender) {
      console.log('No local audio track to send DTMF with\n');
      return;
    }
    if (!audioSender.dtmf) {
      alert('This demo requires DTMF which is not support by this browser.');
      return;
    }
    dtmfSender = audioSender.dtmf;
    dtmfStatusDiv.textContent = 'DTMF available';
    console.log('Got DTMFSender\n');
    dtmfSender.ontonechange = dtmfOnToneChange;
  }
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

async function onIceCandidate(pc, event) {
  try {
    await getOtherPc(pc).addIceCandidate(event.candidate);
    console.log(`${getName(pc)} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`);
  } catch (e) {
    console.log('Error adding ice candidate:', e);
  }
}

function dtmfOnToneChange(tone) {
  if (tone) {
    console.log(`Sent DTMF tone: ${tone.tone}`);
    sentTonesInput.value += `${tone.tone} `;
  }
}

function sendTones(tones) {
  if (dtmfSender && dtmfSender.canInsertDTMF) {
    const duration = durationInput.value;
    const gap = gapInput.value;
    console.log('Tones, duration, gap: ', tones, duration, gap);
    dtmfSender.insertDTMF(tones, duration, gap);
  }
}

function handleSendTonesClick() {
  sendTones(tonesInput.value);
}

function addDialPadHandlers() {
  const dialPad = document.querySelector('div#dialPad');
  const buttons = dialPad.querySelectorAll('button');
  for (let i = 0; i !== buttons.length; ++i) {
    buttons[i].addEventListener('click', (event) => sendTones(event.target.textContent));
  }
}

main();