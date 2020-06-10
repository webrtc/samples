/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
hangupButton.addEventListener('click', hangup);

const smallButton = document.getElementById('size-small');
smallButton.addEventListener('click', () => {
  localStream.getVideoTracks()[0].applyConstraints({width: {exact: 180}});
});
const vgaButton = document.getElementById('size-vga');
vgaButton.addEventListener('click', () => {
  localStream.getVideoTracks()[0].applyConstraints({width: {exact: 640}});
});
const hdButton = document.getElementById('size-hd');
hdButton.addEventListener('click', () => {
  localStream.getVideoTracks()[0].applyConstraints({width: {exact: 1024}});
});


const banner = document.querySelector('#banner');


const supportsInsertableStreamsLegacy =
      !!RTCRtpSender.prototype.createEncodedVideoStreams;
const supportsInsertableStreams =
      !!RTCRtpSender.prototype.createEncodedStreams;

if (!(supportsInsertableStreams || supportsInsertableStreamsLegacy)) {
  banner.innerText = 'Your browser does not support Insertable Streams. ' +
  'This sample will not work.';
  startButton.disabled = true;
}

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function() {
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
});

let localStream;
let pc1;
let pc2;
const offerOptions = {
  offerToReceiveAudio: 0,
  offerToReceiveVideo: 1
};

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

async function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video: true});
    console.log('Received local stream');
    localVideo.srcObject = stream;
    localStream = stream;
    callButton.disabled = false;
    smallButton.disabled = false;
    vgaButton.disabled = false;
    hdButton.disabled = false;
  } catch (e) {
    alert(`getUserMedia() error: ${e.name}`);
  }
}

async function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  startTime = window.performance.now();
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  pc1 = new RTCPeerConnection();
  console.log('Created local peer connection object pc1');
  pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
  pc2 = new RTCPeerConnection({
    encodedInsertableStreams: true,
    forceEncodedVideoInsertableStreams: true,
  });
  console.log('Created remote peer connection object pc2');
  pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
  pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));
  pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e));
  pc2.addEventListener('track', gotRemoteTrack);

  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  console.log('Added local stream to pc1');

  try {
    console.log('pc1 createOffer start');
    const offer = await pc1.createOffer(offerOptions);
    await onCreateOfferSuccess(offer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

async function onCreateOfferSuccess(desc) {
  console.log(`Offer from pc1\n${desc.sdp}`);
  console.log('pc1 setLocalDescription start');
  try {
    await pc1.setLocalDescription(desc);
    onSetLocalSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('pc2 setRemoteDescription start');
  try {
    await pc2.setRemoteDescription({type: 'offer', sdp: desc.sdp.replace('red/90000', 'green/90000')});
    onSetRemoteSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('pc2 createAnswer start');
  try {
    const answer = await pc2.createAnswer();
    await onCreateAnswerSuccess(answer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${error.toString()}`);
}

function gotRemoteTrack(e) {
  console.log('pc2 received remote stream');
  const frameStreams = supportsInsertableStreams ? e.receiver.createEncodedStreams() : e.receiver.createEncodedVideoStreams();
  frameStreams.readableStream.pipeThrough(new TransformStream({
    transform: videoAnalyzer
  }))
      .pipeTo(frameStreams.writableStream);
  remoteVideo.srcObject = e.streams[0];
}

async function onCreateAnswerSuccess(desc) {
  console.log(`Answer from pc2:\n${desc.sdp}`);
  console.log('pc2 setLocalDescription start');
  try {
    await pc2.setLocalDescription(desc);
    onSetLocalSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
  console.log('pc1 setRemoteDescription start');
  try {
    await pc1.setRemoteDescription(desc);
    onSetRemoteSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
}

async function onIceCandidate(pc, event) {
  try {
    await (getOtherPc(pc).addIceCandidate(event.candidate));
    onAddIceCandidateSuccess(pc);
  } catch (e) {
    onAddIceCandidateError(pc, e);
  }
  console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess(pc) {
  console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}

const keyFrameCountDisplay = document.querySelector('#keyframe-count');
const keyFrameSizeDisplay = document.querySelector('#keyframe-size');
const interFrameCountDisplay = document.querySelector('#interframe-count');
const interFrameSizeDisplay = document.querySelector('#interframe-size');
const videoSizeDisplay = document.querySelector('#video-size');
const duplicateCountDisplay = document.querySelector('#duplicate-count');
let keyFrameCount = 0;
let interFrameCount = 0;
let keyFrameLastSize = 0;
let interFrameLastSize = 0;
let duplicateCount = 0;
let prevFrameType;
let prevFrameTimestamp;
let prevFrameSynchronizationSource;

function videoAnalyzer(encodedFrame, controller) {
  const view = new DataView(encodedFrame.data);
  // We assume that the video is VP8.
  // TODO: Check the codec to see that it is.
  // The lowest value bit in the first byte is the keyframe indicator.
  // https://tools.ietf.org/html/rfc6386#section-9.1
  const keyframeBit = view.getUint8(0) & 0x01;
  // console.log(view.getUint8(0).toString(16));
  if (keyframeBit === 0) {
    keyFrameCount++;
    keyFrameLastSize = encodedFrame.data.byteLength;
  } else {
    interFrameCount++;
    interFrameLastSize = encodedFrame.data.byteLength;
  }
  if (encodedFrame.type === prevFrameType &&
      encodedFrame.timestamp === prevFrameTimestamp &&
      encodedFrame.synchronizationSource === prevFrameSynchronizationSource) {
    duplicateCount++;
  }
  prevFrameType = encodedFrame.type;
  prevFrameTimestamp = encodedFrame.timestamp;
  prevFrameSynchronizationSource = encodedFrame.synchronizationSource;
  controller.enqueue(encodedFrame);
}

// Update the display of the counters once a second.
setInterval(() => {
  keyFrameCountDisplay.innerText = keyFrameCount;
  keyFrameSizeDisplay.innerText = keyFrameLastSize;
  interFrameCountDisplay.innerText = interFrameCount;
  interFrameSizeDisplay.innerText = interFrameLastSize;
  duplicateCountDisplay.innerText = duplicateCount;
}, 500);

remoteVideo.addEventListener('resize', () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  videoSizeDisplay.innerText = `${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`;
});
