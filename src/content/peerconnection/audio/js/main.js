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

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/gh-pages

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
<<<<<<< HEAD
  pc1.setLocalDescription(desc, function() {
    pc2.setRemoteDescription(desc, function() {
      // We configure VAD for the answer SDP here.
      var sdpConstraints = {
        'mandatory': {
          'VoiceActivityDetection': vadCheck.checked
        }
      };
      pc2.createAnswer(gotDescription2, onCreateSessionDescriptionError,
          sdpConstraints);
    });
  });
}

function gotDescription2(desc) {
  desc.sdp = applyParamsToSdp(desc.sdp);
  pc2.setLocalDescription(desc, function() {
    trace('Answer from pc2 \n' + desc.sdp);
    pc1.setRemoteDescription(desc);
  });
=======
  pc1.setLocalDescription(desc).then(
    function() {
      desc.sdp = forceChosenAudioCodec(desc.sdp);
      pc2.setRemoteDescription(desc).then(
        function() {
          pc2.createAnswer().then(
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
      desc.sdp = forceChosenAudioCodec(desc.sdp);
      pc1.setRemoteDescription(desc).then(
        function() {
        },
        onSetSessionDescriptionError
      );
    },
    onSetSessionDescriptionError
  );
>>>>>>> origin/gh-pages
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

<<<<<<< HEAD
// Sets m= codec ordering, b= bitrate, and a=ptime based on the in-page prefs.
function applyParamsToSdp(sdp) {
  var newSdp = maybePreferCodec(sdp, 'audio', 'send', codecSelector.value);
  if (bitRateField.value > 0) {
    newSdp = preferBitRate(newSdp, bitRateField.value / 1000, 'audio');
  }
  if (ptimeField.value > 0) {
    newSdp += ('a=ptime:' + ptimeField.value + '\r\n');
=======
function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function forceChosenAudioCodec(sdp) {
  return maybePreferCodec(sdp, 'audio', 'send', codecSelector.value);
}

// Copied from AppRTC's sdputils.js:

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function maybePreferCodec(sdp, type, dir, codec) {
  var str = type + ' ' + dir + ' codec';
  if (codec === '') {
    trace('No preference on ' + str + '.');
    return sdp;
  }

  trace('Prefer ' + str + ': ' + codec);

  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = findLine(sdpLines, 'm=', type);
  if (mLineIndex === null) {
    return sdp;
  }

  // If the codec is available, set it as the default in m line.
  var codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
  console.log('codecIndex', codecIndex);
  if (codecIndex) {
    var payload = getCodecPayloadType(sdpLines[codecIndex]);
    if (payload) {
      sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
    }
>>>>>>> origin/gh-pages
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
