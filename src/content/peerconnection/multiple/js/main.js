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
const videoCountInput = document.getElementById('videoCountInput');
const videoCodecSelect = document.getElementById('videoCodecSelect');
const remoteVideosDiv = document.getElementById('remoteVideos');
const statusDiv = document.getElementById('status');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

const video1 = document.querySelector('video#video1');

let preferredVideoCodecMimeType;

let localStream;
let peerPairs = [];
let remoteVideos = [];
let connectionStates = [];

const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
  'setCodecPreferences' in window.RTCRtpTransceiver.prototype;
initCodecSelect();
videoCodecSelect.onchange = () => {
  preferredVideoCodecMimeType = videoCodecSelect.value;
};

function initCodecSelect() {
  const codecMimeTypes = getSupportedVideoCodecMimeTypes();
  videoCodecSelect.textContent = '';
  if (codecMimeTypes.length === 0) {
    videoCodecSelect.disabled = true;
    preferredVideoCodecMimeType = undefined;
    return;
  }
  codecMimeTypes.forEach(mimeType => {
    const option = document.createElement('option');
    option.value = mimeType;
    option.textContent = mimeType;
    videoCodecSelect.appendChild(option);
  });
  const h264MimeType = codecMimeTypes.find(mimeType => mimeType.toLowerCase() === 'video/h264');
  preferredVideoCodecMimeType = h264MimeType || codecMimeTypes[0];
  videoCodecSelect.value = preferredVideoCodecMimeType;
}

function getSupportedVideoCodecMimeTypes() {
  if (!window.RTCRtpSender || !RTCRtpSender.getCapabilities) {
    return [];
  }
  const capabilities = RTCRtpSender.getCapabilities('video');
  if (!capabilities || !capabilities.codecs) {
    return [];
  }
  const seen = new Set();
  return capabilities.codecs
      .map(codec => codec.mimeType)
      .filter(mimeType => {
        if (!mimeType) return false;
        const normalizedMimeType = mimeType.toLowerCase();
        if (normalizedMimeType === 'video/rtx' ||
            normalizedMimeType === 'video/red' ||
            normalizedMimeType === 'video/ulpfec' ||
            normalizedMimeType === 'video/flexfec-03') {
          return false;
        }
        if (seen.has(normalizedMimeType)) return false;
        seen.add(normalizedMimeType);
        return true;
      });
}

function maybeSetCodecPreferences(pc, displayIndex) {
  if (!supportsSetCodecPreferences || !preferredVideoCodecMimeType) {
    return;
  }
  const videoTransceiver = pc.getTransceivers().find(transceiver =>
    transceiver.sender &&
    transceiver.sender.track &&
    transceiver.sender.track.kind === 'video');
  if (!videoTransceiver) {
    return;
  }
  const capabilities = RTCRtpSender.getCapabilities('video');
  if (!capabilities || !capabilities.codecs) {
    return;
  }
  const codecs = capabilities.codecs.slice();
  const selectedCodecIndex = codecs.findIndex(codec =>
    codec.mimeType &&
    codec.mimeType.toLowerCase() === preferredVideoCodecMimeType.toLowerCase());
  if (selectedCodecIndex < 0) {
    return;
  }
  const selectedCodec = codecs[selectedCodecIndex];
  codecs.splice(selectedCodecIndex, 1);
  codecs.unshift(selectedCodec);
  videoTransceiver.setCodecPreferences(codecs);
  console.log(`pc${displayIndex}: preferred video codec ${preferredVideoCodecMimeType}`);
}

async function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });
  video1.srcObject = localStream;
  callButton.disabled = false;
}

async function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  videoCountInput.disabled = true;
  videoCodecSelect.disabled = true;
  const receiveVideoCount = getRequestedVideoCount();
  console.log(`Starting ${receiveVideoCount} call(s)`);
  const audioTracks = localStream.getAudioTracks();
  const videoTracks = localStream.getVideoTracks();
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  resetRemoteVideos(receiveVideoCount);
  peerPairs = [];
  connectionStates = new Array(receiveVideoCount).fill('new');
  updateStatus();
  const negotiationPromises = [];
  for (let i = 0; i < receiveVideoCount; i++) {
    const displayIndex = i + 1;
    const localPc = new RTCPeerConnection();
    const remotePc = new RTCPeerConnection();
    remotePc.ontrack = e => gotRemoteStream(e, remoteVideos[i], displayIndex);
    remotePc.onconnectionstatechange = () => {
      setConnectionState(i, remotePc.connectionState);
    };
    localStream.getTracks().forEach(track => {
      localPc.addTrack(track, localStream);
    });
    maybeSetCodecPreferences(localPc, displayIndex);
    console.log(`pc${displayIndex}: created local and remote peer connection objects`);
    peerPairs.push({localPc, remotePc});
    negotiationPromises.push(negotiate(localPc, remotePc, displayIndex));
  }
  const results = await Promise.allSettled(negotiationPromises);
  const failedCount = results.filter(result => result.status === 'rejected').length;
  if (failedCount > 0) {
    console.warn(`${failedCount} negotiation(s) failed`);
  }
  updateStatus();
}

async function negotiate(localPc, remotePc, displayIndex) {
  localPc.onicecandidate = e => {
    if (e.candidate) {
      remotePc.addIceCandidate(e.candidate).catch(err => {
        console.warn(`pc${displayIndex}: remotePc.addIceCandidate failed`, err);
      });
    }
  };
  remotePc.onicecandidate = e => {
    if (e.candidate) {
      localPc.addIceCandidate(e.candidate).catch(err => {
        console.warn(`pc${displayIndex}: localPc.addIceCandidate failed`, err);
      });
    }
  };

  await localPc.setLocalDescription();
  await remotePc.setRemoteDescription(localPc.localDescription);
  await remotePc.setLocalDescription();
  await localPc.setRemoteDescription(remotePc.localDescription);
  console.log(`pc${displayIndex}: negotiation completed`);
}

function hangup() {
  console.log('Ending calls');
  peerPairs.forEach(pair => {
    pair.localPc.close();
    pair.remotePc.close();
  });
  peerPairs = [];
  resetRemoteVideos(0);
  connectionStates = [];
  statusDiv.textContent = '';
  hangupButton.disabled = true;
  callButton.disabled = false;
  videoCountInput.disabled = false;
  videoCodecSelect.disabled = false;
}

function gotRemoteStream(e, videoObject, index) {
  if (videoObject.srcObject !== e.streams[0]) {
    videoObject.srcObject = e.streams[0];
    console.log(`pc${index}: received remote stream`);
  }
}

function getRequestedVideoCount() {
  const min = Number(videoCountInput.min) || 1;
  const max = Number(videoCountInput.max) || 16;
  const parsed = Number(videoCountInput.value);
  const safeValue = Number.isFinite(parsed) ? parsed : 2;
  return Math.max(min, Math.min(max, Math.trunc(safeValue)));
}

function resetRemoteVideos(count) {
  remoteVideos.forEach(video => {
    video.srcObject = null;
  });
  remoteVideos = [];
  remoteVideosDiv.textContent = '';
  for (let i = 0; i < count; i++) {
    const video = document.createElement('video');
    video.id = `remoteVideo${i + 1}`;
    video.autoplay = true;
    video.playsInline = true;
    remoteVideos.push(video);
    remoteVideosDiv.appendChild(video);
  }
}

function setConnectionState(index, state) {
  connectionStates[index] = state;
  console.log(`pc${index + 1}: remote connection state ${state}`);
  updateStatus();
}

function updateStatus() {
  statusDiv.textContent = connectionStates.map((state, i) => `#${i + 1}:${state}`).join(' ');
}
