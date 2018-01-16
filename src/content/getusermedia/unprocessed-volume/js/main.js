/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* global AudioContext, SoundMeter */

'use strict';

var instantMeter = document.querySelector('#instant meter');
var slowMeter = document.querySelector('#slow meter');
var unprocessedMeter = document.querySelector('#unprocessed meter');

var instantValueDisplay = document.querySelector('#instant .value');
var slowValueDisplay = document.querySelector('#slow .value');
var unprocessedValueDisplay = document.querySelector('#unprocessed .value');

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  window.audioContext = new AudioContext();
} catch (e) {
  alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
var constraints = window.constraints = {
  audio: {echoCancellation: true},
  video: false
};

function handleSuccess(stream) {
  // Put variables in global scope to make them available to the
  // browser console.
  window.stream = stream;
  var soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
  soundMeter.connectToSource(stream, function(e) {
    if (e) {
      alert(e);
      return;
    }
    setInterval(function() {
      instantMeter.value = instantValueDisplay.innerText =
          soundMeter.instant.toFixed(2);
      slowMeter.value = slowValueDisplay.innerText =
          soundMeter.slow.toFixed(2);
    }, 200);
  });
  console.log('First track settings:',
              JSON.stringify(stream.getAudioTracks()[0].getSettings()));
  // Set up second track with audio processing disabled
  constraints.audio = {echoCancellation: {exact: false}};
  console.log('Getting second audio stream');
  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleUnprocessedStream).catch(handleError);
}

function handleUnprocessedStream(stream) {
  console.log('Got second audio stream');
  console.log('Second track settings:',
              JSON.stringify(stream.getAudioTracks()[0].getSettings()));
  console.log('Second track constraints:',
              JSON.stringify(stream.getAudioTracks()[0].getConstraints()));
  var unprocMeter = window.unprocMeter = new SoundMeter(window.audioContext);
  unprocMeter.connectToSource(stream, function(e) {
    if (e) {
      alert(e);
      return;
    }
    setInterval(function() {
      unprocessedMeter.value = unprocessedValueDisplay.innerText =
          unprocMeter.slow.toFixed(2);
    }, 200);
  });
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(handleError);

