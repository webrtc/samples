/*
 *  Copyright (c) 2026 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const renegotiateButton = document.getElementById('renegotiateButton');
const hangupButton = document.getElementById('hangupButton');
const negotiateCheckbox = document.getElementById('negotiateDataChannel');
startButton.onclick = start;
callButton.onclick = call;
renegotiateButton.onclick = renegotiate;
hangupButton.onclick = hangup;

let localStream;
let pc1;
let pc2;

function log(text) {
  document.getElementById('log').innerText += text + '\n';
}
function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

async function start() {
  startButton.disabled = true;
  negotiateCheckbox.disabled = true;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true,
  });
  localVideo.srcObject = stream;
  localStream = stream;
  callButton.disabled = false;
  negotiateCheckbox.disabled = false;
}

async function call() {
  callButton.disabled = true;
  negotiateCheckbox.disabled = true;
  renegotiateButton.disabled = false;
  hangupButton.disabled = false;
  console.log('Starting call');
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  const config = {
    alwaysNegotiateDataChannels: negotiateCheckbox.checked,
  };
  pc1 = new RTCPeerConnection(config);
  // Use pc.getConfiguration to detect whether the feature is supported.
  if (pc1.getConfiguration().alwaysNegotiateDataChannels === undefined) {
    log('RTCConfiguration.alwaysNegotiateDataChannel is not supported in this browser (' + adapter.browserDetails.browser + '/' + adapter.browserDetails.version + ')');
  } else {
    log('RTCConfiguration.alwaysNegotiateDataChannel is supported in this browser (' + adapter.browserDetails.browser + '/' + adapter.browserDetails.version + ')');
  }
  pc1.onicecandidate = e => onIceCandidate(pc1, e);
  pc2 = new RTCPeerConnection();
  pc2.onicecandidate = e => onIceCandidate(pc2, e);
  pc2.ontrack = gotRemoteStream;

  // Create an audio transceiver which serves as transport.
  pc1.addTransceiver('audio');
  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));

  await pc1.setLocalDescription();
  await pc2.setRemoteDescription(pc1.localDescription);
  await pc2.setLocalDescription();
  await pc1.setRemoteDescription(pc2.localDescription);
  renegotiateButton.disabled = false;
}

function gotRemoteStream(e) {
  remoteVideo.srcObject = e.streams[0];
}

function onIceCandidate(pc, event) {
  getOtherPc(pc)
      .addIceCandidate(event.candidate)
      .catch(err => onAddIceCandidateError(pc, err));
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

async function renegotiate() {
  renegotiateButton.disabled = true;
  hangupButton.disabled = true;
  pc1.getTransceivers()[0].stop(); // stops the first transceiver.
  if (negotiateCheckbox.checked) {
    log('Stopped transceiver, the right video should not freeze (if always negotiating data channels is supported)');
  } else {
    log('Stopped transceiver, the right video will freeze for ~4 seconds');
  }
  await pc1.setLocalDescription();
  await pc2.setRemoteDescription(pc1.localDescription);
  await new Promise(r => setTimeout(r, 4000)); // wait 4 seconds.
  console.log('renegotiated');
  await pc2.setLocalDescription();
  await pc1.setRemoteDescription(pc2.localDescription);
  await new Promise(r => setTimeout(r, 1000)); // wait 1 seconds.
  const stats = await pc2.getStats();
  const freezes = [...stats.values()].filter(s => s.type === 'inbound-rtp' && s.kind === 'video').map(s => s.totalFreezesDuration);
  log('Renegotiation done, the getStats() API detected a freeze lasting ' + freezes + ' seconds');
  log('Flip the "always negotiate data channels" box and try again');
  hangupButton.disabled = false;
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;

  hangupButton.disabled = true;
  callButton.disabled = false;
  negotiateCheckbox.disabled = false;
}
