/*
 *  Copyright (c) 2022 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* global TimelineDataSeries, TimelineGraphView */
'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
hangupButton.addEventListener('click', hangup);

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function() {
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('resize', () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
});

const codecPreferences = document.querySelector('#codecPreferences');
const scalabilityMode = document.querySelector('#scalabilityMode');
const supportsSetCodecPreferences = window.RTCRtpTransceiver &&
  'setCodecPreferences' in window.RTCRtpTransceiver.prototype;

const scalabilityModes = [
  'L1T1',
  'L1T2',
  'L1T3',
  'L2T1',
  'L2T2',
  'L2T3',
  'L3T1',
  'L3T2',
  'L3T3',
  'L2T1h',
  'L2T2h',
  'L2T3h',
  'S2T1',
  'S2T2',
  'S2T3',
  'S2T1h',
  'S2T2h',
  'S2T3h',
  'S3T1',
  'S3T2',
  'S3T3',
  'S3T1h',
  'S3T2h',
  'S3T3h',
  'L2T2_KEY',
  'L2T3_KEY',
  'L3T2_KEY',
  'L3T3_KEY'
];

let localStream;
let pc1;
let pc2;

let bitrateGraph;
let bitrateSeries;
let headerrateSeries;

let packetGraph;
let packetSeries;

let lastResult;

const offerOptions = {
  offerToReceiveAudio: 1,
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
    const stream = await navigator.mediaDevices.getUserMedia({audio: false, video: true});
    console.log('Received local stream');
    localVideo.srcObject = stream;
    localStream = stream;
    callButton.disabled = false;
  } catch (e) {
    alert(`getUserMedia() error: ${e.name}`);
  }
  if (supportsSetCodecPreferences) {
    const {codecs} = RTCRtpSender.getCapabilities('video');
    codecs.forEach(codec => {
      if (['video/red', 'video/ulpfec', 'video/rtx'].includes(codec.mimeType)) {
        return;
      }
      const option = document.createElement('option');
      option.value = (codec.mimeType + ' ' + (codec.sdpFmtpLine || '')).trim();
      option.innerText = option.value;
      codecPreferences.appendChild(option);
    });
    codecPreferences.addEventListener('change', async (event) => {
      const [mimeType] = event.target.value.split(' ');
      while (scalabilityMode.firstChild) {
        scalabilityMode.firstChild.remove();
      }
      const option = document.createElement('option');
      option.value = '';
      option.innerText = 'NONE';
      scalabilityMode.appendChild(option);

      const capabilityPromises = [];
      for (const mode of scalabilityModes) {
        capabilityPromises.push(navigator.mediaCapabilities.encodingInfo({
          type: 'webrtc',
          video: {
            contentType: mimeType,
            width: 640,
            height: 480,
            bitrate: 10000,
            framerate: 29.97,
            scalabilityMode: mode
          }}));
      }
      const capabilityResults = await Promise.all(capabilityPromises);
      for (let i = 0; i < scalabilityModes.length; ++i) {
        if (capabilityResults[i].supported) {
          const option = document.createElement('option');
          option.value = scalabilityModes[i];
          option.innerText = scalabilityModes[i];
          scalabilityMode.appendChild(option);
        }
      }

      if (scalabilityMode.childElementCount > 1) {
        scalabilityMode.disabled = false;
      } else {
        scalabilityMode.disabled = true;
      }
    });
    codecPreferences.disabled = false;
  }

  bitrateSeries = new TimelineDataSeries();
  bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
  bitrateGraph.updateEndDate();

  headerrateSeries = new TimelineDataSeries();
  headerrateSeries.setColor('green');

  packetSeries = new TimelineDataSeries();
  packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
  packetGraph.updateEndDate();
}

async function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  startTime = window.performance.now();
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  const configuration = {};
  console.log('RTCPeerConnection configuration:', configuration);
  pc1 = new RTCPeerConnection(configuration);
  console.log('Created local peer connection object pc1');
  pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
  pc2 = new RTCPeerConnection(configuration);
  console.log('Created remote peer connection object pc2');
  pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
  pc2.addEventListener('track', gotRemoteStream);
  const mode = scalabilityMode.value;
  localStream.getTracks().forEach((track) =>{
    if (track.kind == 'video' && mode) {
      pc1.addTransceiver(track, {
        streams: [localStream],
        sendEncodings: [
          {scalabilityMode: mode}
        ]
      });
    } else {
      pc1.addTrack(track, localStream);
    }
  });
  console.log('Added local stream to pc1');
  if (supportsSetCodecPreferences) {
    const preferredCodec = codecPreferences.options[codecPreferences.selectedIndex];
    if (preferredCodec.value !== '') {
      const [mimeType, sdpFmtpLine] = preferredCodec.value.split(' ');
      const {codecs} = RTCRtpSender.getCapabilities('video');
      const selectedCodecIndex = codecs.findIndex(c => c.mimeType === mimeType && c.sdpFmtpLine === sdpFmtpLine);
      const selectedCodec = codecs[selectedCodecIndex];
      codecs.splice(selectedCodecIndex, 1);
      codecs.unshift(selectedCodec);
      console.log(codecs);
      const transceiver = pc1.getTransceivers().find(t => t.sender && t.sender.track === localStream.getVideoTracks()[0]);
      transceiver.setCodecPreferences(codecs);
      console.log('Preferred video codec', selectedCodec);
    }
  }
  codecPreferences.disabled = true;
  scalabilityMode.disabled = true;

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
    await pc2.setRemoteDescription(desc);
    onSetRemoteSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
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

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log('pc2 received remote stream');
  }
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

    // Display the video codec that is actually used.
    setTimeout(async () => {
      const stats = await pc1.getStats();
      stats.forEach(stat => {
        if (!(stat.type === 'outbound-rtp' && stat.kind === 'video')) {
          return;
        }
        const codec = stats.get(stat.codecId);
        document.getElementById('actualCodec').innerText = 'Using ' + codec.mimeType +
            ' ' + (codec.sdpFmtpLine ? codec.sdpFmtpLine + ' ' : '') +
            ', payloadType=' + codec.payloadType + '.';
      });
    }, 1000);
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

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  codecPreferences.disabled = false;
  scalabilityMode.disabled = false;
}

// query getStats every second
window.setInterval(() => {
  if (!pc1) {
    return;
  }
  const sender = pc1.getSenders()[0];
  if (!sender) {
    return;
  }
  sender.getStats().then(res => {
    res.forEach(report => {
      let bytes;
      let headerBytes;
      let packets;
      if (report.type === 'outbound-rtp') {
        if (report.isRemote) {
          return;
        }
        const now = report.timestamp;
        bytes = report.bytesSent;
        headerBytes = report.headerBytesSent;

        packets = report.packetsSent;
        if (lastResult && lastResult.has(report.id)) {
          // calculate bitrate
          const bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) /
            (now - lastResult.get(report.id).timestamp);
          const headerrate = 8 * (headerBytes - lastResult.get(report.id).headerBytesSent) /
            (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateSeries.addPoint(now, bitrate);
          headerrateSeries.addPoint(now, headerrate);
          bitrateGraph.setDataSeries([bitrateSeries, headerrateSeries]);
          bitrateGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetSeries.addPoint(now, packets -
            lastResult.get(report.id).packetsSent);
          packetGraph.setDataSeries([packetSeries]);
          packetGraph.updateEndDate();
        }
      }
    });
    lastResult = res;
  });
}, 1000);
