/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* global TimelineDataSeries, TimelineGraphView */

'use strict';

const remoteVideo = document.querySelector('video#remoteVideo');
const localVideo = document.querySelector('video#localVideo');
const callButton = document.querySelector('button#callButton');
const hangupButton = document.querySelector('button#hangupButton');
const bandwidthSelector = document.querySelector('select#bandwidth');
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.onclick = hangup;

if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
  document.getElementById('notsupported').style.display = 'block';
  callButton.disabled = true;
}

let localDelayGraph;
let localDelaySeries;

let maxLocalDelay = -1;
localVideo.requestVideoFrameCallback(function rVFC(now, metaData) {
  // For graph purposes, take the maximum over a window.
  maxLocalDelay = Math.max(1000 * (metaData.expectedDisplayTime - metaData.captureTime), maxLocalDelay);

  if (metaData.presentedFrames % windowSize !== 0) {
    localVideo.requestVideoFrameCallback(rVFC);
    return;
  }
  // The graph library does not like the performance.now() style `now`.
  localDelaySeries.addPoint(Date.now(), maxLocalDelay);
  localDelayGraph.setDataSeries([localDelaySeries]);
  localDelayGraph.updateEndDate();

  maxLocalDelay = -1;

  localVideo.requestVideoFrameCallback(rVFC);
});

let processingGraph;
let processingSeries;

let timeGraph;
let timeSeries;

let networkDelayGraph;
let networkDelaySeries;

let maxProcessingDuration = -1;
let maxRenderTime = -1;
let maxNetworkDelay = -1;
const windowSize = 30;
remoteVideo.requestVideoFrameCallback(function rVFC(now, metaData) {
  // For graph purposes, take the maximum over a window.
  maxProcessingDuration = Math.max(1000 * metaData.processingDuration, maxProcessingDuration);
  maxRenderTime = Math.max(metaData.expectedDisplayTime - metaData.receiveTime, maxRenderTime);
  // Note: captureTime is currently only present when there are bidirectional streams.
  maxNetworkDelay = Math.max(metaData.receiveTime - metaData.captureTime, maxNetworkDelay);

  if (metaData.presentedFrames % windowSize !== 0) {
    remoteVideo.requestVideoFrameCallback(rVFC);
    return;
  }
  // The graph library does not like the performance.now() style `now`.
  processingSeries.addPoint(Date.now(), maxProcessingDuration);
  processingGraph.setDataSeries([processingSeries]);
  processingGraph.updateEndDate();

  timeSeries.addPoint(Date.now(), maxRenderTime);
  timeGraph.setDataSeries([timeSeries]);
  timeGraph.updateEndDate();

  networkDelaySeries.addPoint(Date.now(), maxNetworkDelay);
  networkDelayGraph.setDataSeries([networkDelaySeries]);
  networkDelayGraph.updateEndDate();

  maxProcessingDuration = -1;
  maxRenderTime = -1;
  maxNetworkDelay = -1;
  maxLocalDelay = -1;

  remoteVideo.requestVideoFrameCallback(rVFC);
});

// Mostly copied from pc1/bandwidth sample.
let pc1;
let pc2;
let localStream;

function gotStream(stream) {
  hangupButton.disabled = false;
  console.log('Received local stream');
  localStream = stream;
  localVideo.srcObject = stream;
  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  // Currently the captureTime on the remote end requires bidirectional video.
  localStream.getTracks().forEach(track => pc2.addTrack(track, localStream));
  console.log('Adding Local Stream to peer connection');

  pc1.createOffer().then(
      gotDescription1,
      onCreateSessionDescriptionError
  );

  processingSeries = new TimelineDataSeries();
  processingGraph = new TimelineGraphView('processingGraph', 'processingCanvas');
  processingGraph.updateEndDate();

  timeSeries = new TimelineDataSeries();
  timeGraph = new TimelineGraphView('timeGraph', 'timeCanvas');
  timeGraph.updateEndDate();

  networkDelaySeries = new TimelineDataSeries();
  networkDelayGraph = new TimelineGraphView('networkDelayGraph', 'networkDelayCanvas');
  networkDelayGraph.updateEndDate();

  localDelaySeries = new TimelineDataSeries();
  localDelayGraph = new TimelineGraphView('localDelayGraph', 'localDelayCanvas');
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function call() {
  callButton.disabled = true;
  console.log('Starting call');
  pc1 = new RTCPeerConnection();
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = onIceCandidate.bind(pc1);

  pc2 = new RTCPeerConnection();
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = onIceCandidate.bind(pc2);
  pc2.ontrack = gotRemoteStream;

  console.log('Requesting local stream');
  navigator.mediaDevices.getUserMedia({video: true})
      .then(gotStream)
      .catch(e => alert('getUserMedia() error: ' + e.name));
}

function gotDescription1(desc) {
  console.log('Offer from pc1 \n' + desc.sdp);
  pc1.setLocalDescription(desc).then(
      () => {
        pc2.setRemoteDescription(desc)
            .then(() => pc2.createAnswer().then(gotDescription2, onCreateSessionDescriptionError),
                onSetSessionDescriptionError);
      }, onSetSessionDescriptionError
  );
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc).then(
      () => {
        console.log('Answer from pc2 \n' + desc.sdp);
        return pc1.setRemoteDescription(desc);
      },
      onSetSessionDescriptionError
  );
}

function hangup() {
  console.log('Ending call');
  localStream.getTracks().forEach(track => track.stop());
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  bandwidthSelector.disabled = true;
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log('Received remote stream');
  }
}

function getOtherPc(pc) {
  return pc === pc1 ? pc2 : pc1;
}

function getName(pc) {
  return pc === pc1 ? 'pc1' : 'pc2';
}

function onIceCandidate(event) {
  getOtherPc(this)
      .addIceCandidate(event.candidate)
      .then(onAddIceCandidateSuccess)
      .catch(onAddIceCandidateError);

  console.log(`${getName(this)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log('Failed to add ICE Candidate: ' + error.toString());
}

function onSetSessionDescriptionError(error) {
  console.log('Failed to set session description: ' + error.toString());
}
