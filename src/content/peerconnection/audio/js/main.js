/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* global TimelineDataSeries, TimelineGraphView */

/* globals maybePreferCodec, preferBitRate, setCodecParam*/
'use strict';

var audio2 = document.querySelector('audio#audio2');
var callButton = document.querySelector('button#callButton');
var hangupButton = document.querySelector('button#hangupButton');
var codecSelector = document.querySelector('select#codec');
var bitRateField = document.querySelector('input#bitrate');
var ptimeField = document.querySelector('input#ptime');
var vadCheck = document.querySelector('input#vad');
var codecDefaults = [
  { name: 'OPUS',       bitrate: 32000, ptime: 20, vbr: true },
  { name: 'ISAC/16000', bitrate: 32000, ptime: 30, vbr: true },
  { name: 'G722',       bitrate: 64000, ptime: 20 },
  { name: 'PCMU',       bitrate: 64000, ptime: 20 },
];
codecSelector.onchange = onCodecChange;
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.onclick = hangup;
onCodecChange();

var pc1;
var pc2;
var localStream;

var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var lastResult;

var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 0,
  voiceActivityDetection: false
};

// double-check this all works before submitting.
function onCodecChange() {
  var name = codecSelector.value;
  for (var i = 0; i < codecDefaults.length; ++i) {
    var entry = codecDefaults[i];
    if (name === entry.name) {
      bitRateField.placeholder = entry.bitrate;
      //bitRateField.disabled = !entry.vbr;
      ptimeField.placeholder = entry.ptime;
    }
  }
}

function gotStream(stream) {
  hangupButton.disabled = false;
  trace('Received local stream');
  localStream = stream;
  var audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    trace('Using Audio device: ' + audioTracks[0].label);
  }
  pc1.addStream(localStream);
  trace('Adding Local Stream to peer connection');

  pc1.createOffer(
    offerOptions
  ).then(
    gotDescription1,
    onCreateSessionDescriptionError
  );

  bitrateSeries = new TimelineDataSeries();
  bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
  bitrateGraph.updateEndDate();

  packetSeries = new TimelineDataSeries();
  packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
  packetGraph.updateEndDate();
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function call() {
  callButton.disabled = true;
  codecSelector.disabled = true;
  bitRateField.disabled = true;
  ptimeField.disabled = true;
  vadCheck.disabled = true;
  trace('Starting call');
  pc1 = new RTCPeerConnection(null, null);
  trace('Created local peer connection object pc1');
  pc1.onicecandidate = iceCallback1;
  pc2 = new RTCPeerConnection(null, null);
  trace('Created remote peer connection object pc2');
  pc2.onicecandidate = iceCallback2;
  pc2.onaddstream = gotRemoteStream;
  trace('Requesting local stream');
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotDescription1(desc) {
  trace('Offer from pc1 \n' + desc.sdp);
  pc1.setLocalDescription(desc).then(
    function() {
      desc.sdp = applyParamsToSdp(desc.sdp);
      pc2.setRemoteDescription(desc).then(
        function() {
          var sdpConstraints = {
            'VoiceActivityDetection': vadCheck.checked
          };
          pc2.createAnswer(sdpConstraints).then(
            gotDescription2,
            onCreateSessionDescriptionError
          );
        },
        onSetSessionDescriptionError
      );
    },
    onSetSessionDescriptionError
  );
}

function gotDescription2(desc) {
  trace('Answer from pc2 \n' + desc.sdp);
  pc2.setLocalDescription(desc).then(
    function() {
      desc.sdp = applyParamsToSdp(desc.sdp);
      pc1.setRemoteDescription(desc).then(
        function() {
        },
        onSetSessionDescriptionError
      );
    },
    onSetSessionDescriptionError
  );
}

function hangup() {
  trace('Ending call');
  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  codecSelector.disabled = false;
  bitRateField.disabled = false;
  ptimeField.disabled = false;
  vadCheck.disabled = false;
}

function gotRemoteStream(e) {
  audio2.srcObject = e.stream;
  trace('Received remote stream');
}

function iceCallback1(event) {
  if (event.candidate) {
    pc2.addIceCandidate(
      new RTCIceCandidate(event.candidate)
    ).then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event) {
  if (event.candidate) {
    pc1.addIceCandidate(
      new RTCIceCandidate(event.candidate)
    ).then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add ICE Candidate: ' + error.toString());
}

=======
function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function forceChosenAudioCodec(sdp) {
  return maybePreferCodec(sdp, 'audio', 'send', codecSelector.value);
}

// Sets m= codec ordering, b= bitrate, and a=ptime based on the in-page prefs.
function applyParamsToSdp(sdp) {
  var newSdp = maybePreferCodec(sdp, 'audio', 'send', codecSelector.value);
  if (bitRateField.value > 0) {
    newSdp = preferBitRate(newSdp, bitRateField.value / 1000, 'audio');
  }
  if (ptimeField.value > 0) {
    newSdp += ('a=ptime:' + ptimeField.value + '\r\n');
  }
  // Since Chrome doesn't currently set Opus DTX based on the
  // VoiceActivityDetection value, we can clumsily set it here.
  if (vadCheck.checked) {
    newSdp = setCodecParam(newSdp, 'opus/48000', 'usedtx', '1');
  }
  return newSdp;
}

// query getStats every second
window.setInterval(function() {
  if (!window.pc1) {
    return;
  }
  window.pc1.getStats(null).then(function(res) {
    Object.keys(res).forEach(function(key) {
      var report = res[key];
      var bytes;
      var packets;
      var now = report.timestamp;
      if ((report.type === 'outboundrtp') ||
          (report.type === 'outbound-rtp') ||
          (report.type === 'ssrc' && report.bytesSent)) {
        bytes = report.bytesSent;
        packets = report.packetsSent;
        if (lastResult && lastResult[report.id]) {
          // calculate bitrate
          var bitrate = 8 * (bytes - lastResult[report.id].bytesSent) /
              (now - lastResult[report.id].timestamp);

          // append to chart
          bitrateSeries.addPoint(now, bitrate);
          bitrateGraph.setDataSeries([bitrateSeries]);
          bitrateGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetSeries.addPoint(now, packets -
              lastResult[report.id].packetsSent);
          packetGraph.setDataSeries([packetSeries]);
          packetGraph.updateEndDate();
        }
      }
    });
    lastResult = res;
  });
}, 1000);
