/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
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

  const getUserMediaConstraintsDiv =
    document.querySelector('div#getUserMediaConstraints');
  // const bitrateDiv = document.querySelector('div#bitrate');
  // const peerDiv = document.querySelector('div#peer');
  const senderStatsDiv = document.querySelector('div#senderStats');
  const receiverStatsDiv = document.querySelector('div#receiverStats');

  const localVideo = document.querySelector('div#localVideo video');
  const remoteVideo = document.querySelector('div#remoteVideo video');
  const localVideoStatsDiv = document.querySelector('div#localVideo div');
  const remoteVideoStatsDiv = document.querySelector('div#remoteVideo div');

  let localPeerConnection;
  let remotePeerConnection;
  let localStream;
  // let bytesPrev;
  // let timestampPrev;

  function hangup() {
    console.log('Ending call');
    localPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;

    localStream.getTracks().forEach(track => track.stop());
    localStream = null;

    hangupButton.disabled = true;
    getMediaButton.disabled = false;
  }

  async function getMedia() {
    getMediaButton.disabled = true;
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      const videoTracks = localStream.getVideoTracks();
      for (let i = 0; i !== videoTracks.length; ++i) {
        videoTracks[i].stop();
      }
    }

    try {
      const userMedia = await navigator.mediaDevices.getUserMedia(getUserMediaConstraints());
      gotStream(userMedia);
    } catch (e) {
      const message = `getUserMedia error: ${e.name}\nPermissionDeniedError may mean invalid constraints.`;
      alert(message);
      console.log(message);
      getMediaButton.disabled = false;
    }
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

  async function createPeerConnection() {
    connectButton.disabled = true;
    hangupButton.disabled = false;

    // bytesPrev = 0;
    // timestampPrev = 0;
    localPeerConnection = new RTCPeerConnection(null);
    remotePeerConnection = new RTCPeerConnection(null);
    localStream.getTracks().forEach(track => localPeerConnection.addTrack(track, localStream));
    console.log('localPeerConnection creating offer');
    localPeerConnection.onnegotiationeeded = () => {
      console.log('Negotiation needed - localPeerConnection');
    };
    remotePeerConnection.onnegotiationeeded = () => {
      console.log('Negotiation needed - remotePeerConnection');
    };

    localPeerConnection.onicecandidate = async event => {
      console.log('Candidate localPeerConnection');
      try {
        // eslint-disable-next-line no-unused-vars
        const ignore = await remotePeerConnection.addIceCandidate(event.candidate);
        onAddIceCandidateSuccess();
      } catch (e) {
        onAddIceCandidateError(e);
      }
    };
    remotePeerConnection.onicecandidate = async event => {
      console.log('Candidate remotePeerConnection');
      try {
        // eslint-disable-next-line no-unused-vars
        const ignore = await localPeerConnection.addIceCandidate(event.candidate);
        onAddIceCandidateSuccess();
      } catch (e) {
        onAddIceCandidateError(e);
      }
    };
    remotePeerConnection.ontrack = e => {
      if (remoteVideo.srcObject !== e.streams[0]) {
        console.log('remotePeerConnection got stream');
        remoteVideo.srcObject = e.streams[0];
      }
    };

    try {
      const offer = await localPeerConnection.createOffer();
      console.log('localPeerConnection offering');
      localPeerConnection.setLocalDescription(offer);
      remotePeerConnection.setRemoteDescription(offer);

      const answer = await remotePeerConnection.createAnswer();
      console.log('remotePeerConnection answering');
      remotePeerConnection.setLocalDescription(answer);
      localPeerConnection.setRemoteDescription(answer);
    } catch (e) {
      console.log(e);
    }
  }

  function onAddIceCandidateSuccess() {
    console.log('AddIceCandidate success.');
  }

  function onAddIceCandidateError(error) {
    console.log('Failed to add Ice Candidate: ' + error.toString());
  }

  // Display statistics
  setInterval(() => {
    if (localPeerConnection && remotePeerConnection) {
      // Dump old statistics to the right
      localPeerConnection.getStats(results => {
        const statsString = dumpOldStats(results);
        receiverStatsDiv.innerHTML = '<h2>Old stats - local</h2>' + statsString;
      });
      remotePeerConnection.getStats(results => {
        const statsString = dumpOldStats(results);
        receiverStatsDiv.innerHTML += '<p>END</p><h2>Old stats - remote</h2>' + statsString;
      });
      // Display new-style getstats to the left
      localPeerConnection.getStats(null)
          .then(results => {
            const statsString = dumpStats(results);
            senderStatsDiv.innerHTML = '<h2>New stats</h2>' + statsString;
          }, err => {
            console.log(err);
          });
    } else {
      console.log('Not connected yet');
    }
    // Collect some stats from the video tags.
    if (localVideo.videoWidth) {
      localVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
        localVideo.videoWidth + 'x' + localVideo.videoHeight + 'px';
    }
    if (remoteVideo.videoWidth) {
      remoteVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
        remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
    }
  }, 1000);

  function dumpStats(results) {
    let statsString = '';
    results.forEach(res => {
      statsString += '<h3>Report type=';
      statsString += res.type;
      statsString += '</h3>\n';
      statsString += 'id ' + res.id + '<br>\n';
      statsString += 'time ' + res.timestamp + '<br>\n';
      Object.keys(res).forEach(k => {
        if (k !== 'timestamp' && k !== 'type' && k !== 'id') {
          statsString += k + ': ' + res[k] + '<br>\n';
        }
      });
    });
    return statsString;
  }

  function dumpOldStats(results) {
    let statsString = '';
    console.log(JSON.stringify(results));
    results.result().forEach(res => {
      console.log(JSON.stringify(res));
      statsString += '<h3>Report type=';
      statsString += res.type;
      statsString += '</h3>\n';
      statsString += 'id ' + res.id + '<br>\n';
      statsString += 'time ' + res.timestamp + '<br>\n';
      res.names().forEach(k => {
        statsString += k + ': ' + res.stat(k) + '<br>\n';
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

  // Start it all up
  displayGetUserMediaConstraints();
});