/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const getMediaButton = document.querySelector('button#getMedia');
const connectButton = document.querySelector('button#connect');
const hangupButton = document.querySelector('button#hangup');

getMediaButton.onclick = getMedia;
connectButton.onclick = createPeerConnection;
hangupButton.onclick = hangup;

const minWidthInput = document.querySelector('div#minWidth input');
const maxWidthInput = document.querySelector('div#maxWidth input');
const minHeightInput = document.querySelector('div#minHeight input');
const maxHeightInput = document.querySelector('div#maxHeight input');
const minFramerateInput = document.querySelector('div#minFramerate input');
const maxFramerateInput = document.querySelector('div#maxFramerate input');

minWidthInput.onchange = maxWidthInput.onchange =
  minHeightInput.onchange = maxHeightInput.onchange =
    minFramerateInput.onchange = maxFramerateInput.onchange = displayRangeValue;

const getUserMediaConstraintsDiv = document.querySelector('div#getUserMediaConstraints');
const bitrateDiv = document.querySelector('div#bitrate');
const peerDiv = document.querySelector('div#peer');
const senderStatsDiv = document.querySelector('div#senderStats');
const receiverStatsDiv = document.querySelector('div#receiverStats');

const localVideo = document.querySelector('div#localVideo video');
const remoteVideo = document.querySelector('div#remoteVideo video');
const localVideoStatsDiv = document.querySelector('div#localVideo div');
const remoteVideoStatsDiv = document.querySelector('div#remoteVideo div');

let localPeerConnection;
let remotePeerConnection;
let localStream;
let bytesPrev;
let timestampPrev;

main();

function main() {
  displayGetUserMediaConstraints();
}

function hangup() {
  console.log('Ending call');
  localPeerConnection.close();
  remotePeerConnection.close();

  // query stats one last time.
  Promise
      .all([
        remotePeerConnection
            .getStats(null)
            .then(showRemoteStats, err => console.log(err)),
        localPeerConnection
            .getStats(null)
            .then(showLocalStats, err => console.log(err))
      ])
      .then(() => {
        localPeerConnection = null;
        remotePeerConnection = null;
      });

  localStream.getTracks().forEach(track => track.stop());
  localStream = null;

  hangupButton.disabled = true;
  getMediaButton.disabled = false;
}

function getMedia() {
  getMediaButton.disabled = true;
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    const videoTracks = localStream.getVideoTracks();
    for (let i = 0; i !== videoTracks.length; ++i) {
      videoTracks[i].stop();
    }
  }
  navigator.mediaDevices.getUserMedia(getUserMediaConstraints())
      .then(gotStream)
      .catch(e => {
        const message = `getUserMedia error: ${e.name}\nPermissionDeniedError may mean invalid constraints.`;
        alert(message);
        console.log(message);
        getMediaButton.disabled = false;
      });
}

function gotStream(stream) {
  connectButton.disabled = false;
  console.log('GetUserMedia succeeded');
  localStream = stream;
  localVideo.srcObject = stream;
}

function getUserMediaConstraints() {
  const constraints = {};
  constraints.audio = true;
  constraints.video = {};
  if (minWidthInput.value !== '0') {
    constraints.video.width = {};
    constraints.video.width.min = minWidthInput.value;
  }
  if (maxWidthInput.value !== '0') {
    constraints.video.width = constraints.video.width || {};
    constraints.video.width.max = maxWidthInput.value;
  }
  if (minHeightInput.value !== '0') {
    constraints.video.height = {};
    constraints.video.height.min = minHeightInput.value;
  }
  if (maxHeightInput.value !== '0') {
    constraints.video.height = constraints.video.height || {};
    constraints.video.height.max = maxHeightInput.value;
  }
  if (minFramerateInput.value !== '0') {
    constraints.video.frameRate = {};
    constraints.video.frameRate.min = minFramerateInput.value;
  }
  if (maxFramerateInput.value !== '0') {
    constraints.video.frameRate = constraints.video.frameRate || {};
    constraints.video.frameRate.max = maxFramerateInput.value;
  }

  return constraints;
}

function displayGetUserMediaConstraints() {
  const constraints = getUserMediaConstraints();
  console.log('getUserMedia constraints', constraints);
  getUserMediaConstraintsDiv.textContent = JSON.stringify(constraints, null, '    ');
}

function createPeerConnection() {
  connectButton.disabled = true;
  hangupButton.disabled = false;

  bytesPrev = 0;
  timestampPrev = 0;
  localPeerConnection = new RTCPeerConnection(null);
  remotePeerConnection = new RTCPeerConnection(null);
  localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));
  console.log('localPeerConnection creating offer');
  localPeerConnection.onnegotiationeeded = () => console.log('Negotiation needed - localPeerConnection');
  remotePeerConnection.onnegotiationeeded = () => console.log('Negotiation needed - remotePeerConnection');
  localPeerConnection.onicecandidate = e => {
    console.log('Candidate localPeerConnection');
    remotePeerConnection
        .addIceCandidate(e.candidate)
        .then(onAddIceCandidateSuccess, onAddIceCandidateError);
  };
  remotePeerConnection.onicecandidate = e => {
    console.log('Candidate remotePeerConnection');
    localPeerConnection
        .addIceCandidate(e.candidate)
        .then(onAddIceCandidateSuccess, onAddIceCandidateError);
  };
  remotePeerConnection.ontrack = e => {
    if (remoteVideo.srcObject !== e.streams[0]) {
      console.log('remotePeerConnection got stream');
      remoteVideo.srcObject = e.streams[0];
    }
  };
  localPeerConnection.createOffer().then(
      desc => {
        console.log('localPeerConnection offering');
        localPeerConnection.setLocalDescription(desc);
        remotePeerConnection.setRemoteDescription(desc);
        remotePeerConnection.createAnswer().then(
            desc2 => {
              console.log('remotePeerConnection answering');
              remotePeerConnection.setLocalDescription(desc2);
              localPeerConnection.setRemoteDescription(desc2);
            },
            err => console.log(err)
        );
      },
      err => console.log(err)
  );
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

function showRemoteStats(results) {
  const statsString = dumpStats(results);
  receiverStatsDiv.innerHTML = `<h2>Receiver stats</h2>${statsString}`;
  // calculate video bitrate
  results.forEach(report => {
    const now = report.timestamp;

    let bitrate;
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      const bytes = report.bytesReceived;
      if (timestampPrev) {
        bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
        bitrate = Math.floor(bitrate);
      }
      bytesPrev = bytes;
      timestampPrev = now;
    }
    if (bitrate) {
      bitrate += ' kbits/sec';
      bitrateDiv.innerHTML = `<strong>Bitrate:</strong>${bitrate}`;
    }
  });

  // figure out the peer's ip
  let activeCandidatePair = null;
  let remoteCandidate = null;

  // Search for the candidate pair, spec-way first.
  results.forEach(report => {
    if (report.type === 'transport') {
      activeCandidatePair = results.get(report.selectedCandidatePairId);
    }
  });
  // Fallback for Firefox.
  if (!activeCandidatePair) {
    results.forEach(report => {
      if (report.type === 'candidate-pair' && report.selected) {
        activeCandidatePair = report;
      }
    });
  }
  if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
    remoteCandidate = results.get(activeCandidatePair.remoteCandidateId);
  }
  if (remoteCandidate) {
    if (remoteCandidate.address && remoteCandidate.port) {
      peerDiv.innerHTML = `<strong>Connected to:</strong>${remoteCandidate.address}:${remoteCandidate.port}`;
    } else if (remoteCandidate.ip && remoteCandidate.port) {
      peerDiv.innerHTML = `<strong>Connected to:</strong>${remoteCandidate.ip}:${remoteCandidate.port}`;
    } else if (remoteCandidate.ipAddress && remoteCandidate.portNumber) {
      // Fall back to old names.
      peerDiv.innerHTML = `<strong>Connected to:</strong>${remoteCandidate.ipAddress}:${remoteCandidate.portNumber}`;
    }
  }
}

function showLocalStats(results) {
  const statsString = dumpStats(results);
  senderStatsDiv.innerHTML = `<h2>Sender stats</h2>${statsString}`;
}

// Display statistics
setInterval(() => {
  if (localPeerConnection && remotePeerConnection) {
    remotePeerConnection
        .getStats(null)
        .then(showRemoteStats, err => console.log(err));
    localPeerConnection
        .getStats(null)
        .then(showLocalStats, err => console.log(err));
  } else {
    console.log('Not connected yet');
  }
  // Collect some stats from the video tags.
  if (localVideo.videoWidth) {
    const width = localVideo.videoWidth;
    const height = localVideo.videoHeight;
    localVideoStatsDiv.innerHTML = `<strong>Video dimensions:</strong> ${width}x${height}px`;
  }
  if (remoteVideo.videoWidth) {
    const rHeight = remoteVideo.videoHeight;
    const rWidth = remoteVideo.videoWidth;
    remoteVideoStatsDiv.innerHTML = `<strong>Video dimensions:</strong> ${rWidth}x${rHeight}px`;
  }
}, 1000);

// Dumping a stats variable as a string.
// might be named toString?
function dumpStats(results) {
  let statsString = '';
  results.forEach(res => {
    statsString += '<h3>Report type=';
    statsString += res.type;
    statsString += '</h3>\n';
    statsString += `id ${res.id}<br>`;
    statsString += `time ${res.timestamp}<br>`;
    Object.keys(res).forEach(k => {
      if (k !== 'timestamp' && k !== 'type' && k !== 'id') {
        statsString += `${k}: ${res[k]}<br>`;
      }
    });
  });
  return statsString;
}

// Utility to show the value of a range in a sibling span element
function displayRangeValue(e) {
  const span = e.target.parentElement.querySelector('span');
  span.textContent = e.target.value;
  displayGetUserMediaConstraints();
}
