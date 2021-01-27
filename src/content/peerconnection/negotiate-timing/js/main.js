/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const renegotiateButton = document.getElementById('renegotiateButton');
const hangupButton = document.getElementById('hangupButton');
const log = document.getElementById('log');
const videoSectionsField = document.getElementById('videoSections');

callButton.disabled = true;
hangupButton.disabled = true;
renegotiateButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
renegotiateButton.onclick = renegotiate;
hangupButton.onclick = hangup;

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function() {
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.onresize = () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
  console.warn('RESIZE', remoteVideo.videoWidth, remoteVideo.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log(`Setup time: ${elapsedTime.toFixed(3)}ms`);
    startTime = null;
  }
};

let localStream;
let pc1;
let pc2;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 0
};

function logToScreen(text) {
  log.append(document.createElement('br'));
  log.append(text);
}

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

async function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  const stream = await navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true
      });
  console.log('Received local stream');
  localVideo.srcObject = stream;
  localStream = stream;
  callButton.disabled = false;
}

async function call() {
  callButton.disabled = true;
  renegotiateButton.disabled = false;
  hangupButton.disabled = false;
  console.log('Starting call');
  startTime = window.performance.now();
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  const servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = e => onIceCandidate(pc1, e);
  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = e => onIceCandidate(pc2, e);
  pc1.oniceconnectionstatechange = e => onIceStateChange(pc1, e);
  pc2.oniceconnectionstatechange = e => onIceStateChange(pc2, e);
  pc2.ontrack = gotRemoteStream;

  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  console.log('Added local stream to pc1');

  console.log('pc1 createOffer start');
  const offer = await pc1.createOffer(offerOptions);
  console.log(`Offer from pc1\n${offer.sdp}`);
  console.log('pc1 setLocalDescription start');
  await Promise.all([pc1.setLocalDescription(offer), pc2.setRemoteDescription(offer)]);
  console.log(`setLocalDescription offer complete`);
  const answer = await pc2.createAnswer();
  await pc1.setRemoteDescription(answer);
  await pc2.setLocalDescription(answer);
  console.log('set*Description(answer) complete');
}

function gotRemoteStream(e) {
  console.log('gotRemoteStream', e.track, e.streams[0]);

  // reset srcObject to work around minor bugs in Chrome and Edge.
  remoteVideo.srcObject = null;
  remoteVideo.srcObject = e.streams[0];
}

async function onIceCandidate(pc, event) {
  console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
  await getOtherPc(pc).addIceCandidate(event.candidate);
  console.log(`${getName(pc)} addIceCandidate success`);
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event, state: ', pc.iceConnectionState);
  }
}

function adjustTransceiverCounts(pc, videoCount) {
  const currentVideoCount = pc.getTransceivers().filter(tr => tr.receiver.track.kind == 'video').length;
  if (currentVideoCount < videoCount) {
    console.log('Adding ' + (videoCount - currentVideoCount) + ' transceivers');
    for (let i = currentVideoCount; i < videoCount; ++i) {
      console.log('Adding transceiver ' + i);
      pc.addTransceiver('video');
    }
  } else {
    console.log(`No adjustment, video count is ${currentVideoCount}, target was ${videoCount}`);
  }
}

async function renegotiate() {
  adjustTransceiverCounts(pc1, parseInt(videoSectionsField.value));
  renegotiateButton.disabled = true;
  const startTime = performance.now();
  const offer = await pc1.createOffer();
  await pc1.setLocalDescription(offer);
  await pc2.setRemoteDescription(offer);
  const answer = await pc2.createAnswer();
  await pc1.setRemoteDescription(answer);
  await pc2.setLocalDescription(answer);
  const elapsedTime = performance.now() - startTime;
  console.log(`Renegotiate finished after ${elapsedTime} milliseconds`);
  renegotiateButton.disabled = false;
  const fixedTime = elapsedTime.toFixed(2);
  logToScreen(`Negotiation took ${elapsedTime.toFixed(2)} milliseconds`);
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;

  const videoTracks = localStream.getVideoTracks();
  videoTracks.forEach(videoTrack => {
    videoTrack.stop();
    localStream.removeTrack(videoTrack);
  });
  localVideo.srcObject = null;
  localVideo.srcObject = localStream;

  hangupButton.disabled = true;
  callButton.disabled = false;
}
