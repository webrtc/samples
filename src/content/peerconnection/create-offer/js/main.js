/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var audioInput = document.querySelector('input#audio');
var restartInput = document.querySelector('input#restart');
var vadInput = document.querySelector('input#vad');
var videoInput = document.querySelector('input#video');

var numAudioTracksInput = document.querySelector('div#numAudioTracks input');
var numAudioTracksDisplay =
    document.querySelector('span#numAudioTracksDisplay');
var outputTextarea = document.querySelector('textarea#output');
var createOfferButton = document.querySelector('button#createOffer');

createOfferButton.onclick = createOffer;

numAudioTracksInput.onchange = function() {
  numAudioTracksDisplay.textContent = this.value;
};

var pc = new RTCPeerConnection(null);
var acx = new AudioContext();

function createOffer() {
  if (pc) {
    pc.close();
    pc = null;
    pc = new RTCPeerConnection(null);
  }
  var numRequestedAudioTracks = numAudioTracksInput.value;
  while (numRequestedAudioTracks < pc.getLocalStreams().length) {
    pc.removeStream(pc.getLocalStreams()[pc.getLocalStreams().length - 1]);
  }
  while (numRequestedAudioTracks > pc.getLocalStreams().length) {
    // Create some dummy audio streams using Web Audio.
    // Note that this fails if you try to do more than one track in Chrome
    // right now.
    var dst = acx.createMediaStreamDestination();
    dst.stream.getTracks().forEach(
      function(track) {
        pc.addTrack(
          track,
          dst.stream
        );
      }
    );
  }

  var offerOptions = {
    // New spec states offerToReceiveAudio/Video are of type long (due to
    // having to tell how many "m" lines to generate).
    // http://w3c.github.io/webrtc-pc/#idl-def-RTCOfferAnswerOptions.
    offerToReceiveAudio: (audioInput.checked) ? 1 : 0,
    offerToReceiveVideo: (videoInput.checked) ? 1 : 0,
    iceRestart: restartInput.checked,
    voiceActivityDetection: vadInput.checked
  };

  pc.createOffer(offerOptions)
  .then(function(desc) {
    pc.setLocalDescription(desc);
    outputTextarea.value = desc.sdp;
  })
  .catch(function(error) {
    outputTextarea.value = 'Failed to createOffer: ' + error;
  });
}
