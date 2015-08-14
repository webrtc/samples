/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
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
var wacx = new AudioContext();

function createOffer() {
  var numRequestedAudioTracks = numAudioTracksInput.value;
  while (numRequestedAudioTracks < pc.getLocalStreams().length) {
    pc.removeStream(pc.getLocalStreams()[pc.getLocalStreams().length - 1]);
  }
  while (numRequestedAudioTracks > pc.getLocalStreams().length) {
    // Create some dummy audio streams using Web Audio.
    // Note that this fails if you try to do more than one track in Chrome
    // right now.
    var dst = wacx.createMediaStreamDestination();
    pc.addStream(dst.stream);
  }
  var offerConstraints = {
    'optional': [{
      'OfferToReceiveAudio': audioInput.checked
    }, {
      'OfferToReceiveVideo': videoInput.checked
    }]
  };
  // These constraints confuse Firefox, even if declared as optional.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1184712
  if (webrtcDetectedBrowser !== 'firefox') {
    offerConstraints.optional.push({
      'VoiceActivityDetection': vadInput.checked
    });
    offerConstraints.optional.push({
      'IceRestart': restartInput.checked
    });
  }
  pc.createOffer(gotDescription, null, offerConstraints);
}

function gotDescription(desc) {
  pc.setLocalDescription(desc);
  outputTextarea.value = desc.sdp;
}
