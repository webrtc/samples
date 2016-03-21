/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global WebAudioExtended, webkitRTCPeerConnection */

var audioElement = document.querySelector('audio');
var statusDiv = document.querySelector('div#status');

var startButton = document.querySelector('button#start');
var stopButton = document.querySelector('button#stop');
startButton.onclick = start;
stopButton.onclick = stop;

var renderLocallyCheckbox = document.querySelector('input#renderLocally');
renderLocallyCheckbox.onclick = toggleRenderLocally;

document.addEventListener('keydown', handleKeyDown, false);

var localStream;
var pc1;
var pc2;

var webAudio = new WebAudioExtended();
webAudio.loadSound('audio/Shamisen-C4.wav');

function trace(txt) {
  statusDiv.innerHTML += '<p>' + txt + '</p>';
}

function start() {
  webAudio.start();
  var constraints = {
    audio: true,
    video: false
  };
  navigator.mediaDevices.getUserMedia(constraints)
  .then(gotStream)
  .catch(gotStreamFailed);
  startButton.disabled = true;
  stopButton.disabled = false;
}

function stop() {
  webAudio.stop();
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  startButton.enabled = true;
  stopButton.enabled = false;
  renderLocallyCheckbox.disabled = true;
  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
}

function gotStream(stream) {
  renderLocallyCheckbox.disabled = false;
  var audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 1) {
    console.log('gotStream({audio:true, video:false})');

    var filteredStream = webAudio.applyFilter(stream);

    var servers = null;
    pc1 = new webkitRTCPeerConnection(servers); // eslint-disable-line new-cap
    console.log('Created local peer connection object pc1');
    pc1.onicecandidate = iceCallback1;
    pc2 = new webkitRTCPeerConnection(servers); // eslint-disable-line new-cap
    console.log('Created remote peer connection object pc2');
    pc2.onicecandidate = iceCallback2;
    pc2.onaddstream = gotRemoteStream;

    pc1.addStream(filteredStream);
    pc1.createOffer()
    .then(gotDescription1)
    .catch(function(error) {
      console.log('createOffer failed: ' + error);
    });

    stream.onended = function() {
      console.log('stream.onended');
      startButton.disabled = false;
      stopButton.disabled = true;
    };

    localStream = stream;
  } else {
    alert('The media stream contains an invalid amount of audio tracks.');
    stream.getTracks().forEach(function(track) {
      track.stop();
    });
  }
}

function gotStreamFailed(error) {
  startButton.disabled = false;
  stopButton.disabled = true;
  alert('Failed to get access to local media. Error: ' +
    error.name);
}

function forceOpus(sdp) {
  // Remove all other codecs (not the video codecs though).
  sdp = sdp.replace(/m=audio (\d+) RTP\/SAVPF.*\r\n/g,
      'm=audio $1 RTP/SAVPF 111\r\n');
  sdp = sdp.replace(/a=rtpmap:(?!111)\d{1,3} (?!VP8|red|ulpfec).*\r\n/g, '');
  return sdp;
}

function gotDescription1(desc) {
  console.log('Offer from pc1 \n' + desc.sdp);
  var modifiedOffer = new RTCSessionDescription({
    type: 'offer',
    sdp: forceOpus(desc.sdp)
  });

  pc1.setLocalDescription(modifiedOffer);
  console.log('Offer from pc1 \n' + modifiedOffer.sdp);
  pc2.setRemoteDescription(modifiedOffer);
  pc2.createAnswer()
  .then(gotDescription2)
  .catch(function(error) {
    console.log('createAnswer failed: ' + error);
  });
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc);
  console.log('Answer from pc2 \n' + desc.sdp);
  pc1.setRemoteDescription(desc);
}

function gotRemoteStream(e) {
  audioElement.srcObject = e.stream;
}

function iceCallback1(event) {
  if (event.candidate) {
    pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
        onAddIceCandidateSuccess, onAddIceCandidateError);
    console.log('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event) {
  if (event.candidate) {
    pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
        onAddIceCandidateSuccess, onAddIceCandidateError);
    console.log('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function handleKeyDown() {
  webAudio.addEffect();
}

function toggleRenderLocally() {
  console.log('Render locally: ', renderLocallyCheckbox.checked);
  webAudio.renderLocally(renderLocallyCheckbox.checked);
}
