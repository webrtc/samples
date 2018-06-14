/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* global AudioContext, SoundMeter */

'use strict';

const instantMeter = document.querySelector('#instant meter')
const slowMeter = document.querySelector('#slow meter')
const unprocessedMeter = document.querySelector('#unprocessed meter')

const instantValueDisplay = document.querySelector('#instant .value')
const slowValueDisplay = document.querySelector('#slow .value')
const unprocessedValueDisplay = document.querySelector('#unprocessed .value')
const errorMsg = document.querySelector('#errorMsg')

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  window.audioContext = new AudioContext();
} catch (e) {
  alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
let constraints = window.constraints = {
  audio: {echoCancellation: true},
  video: false
}

function handleSuccess(stream) {
  // Put variables in global scope to make them available to the
  // browser console.
  window.stream = stream;
  const soundMeter = window.soundMeter = new SoundMeter(window.audioContext)
  errorMsg.innerText = ''
  soundMeter.connectToSource(stream, function(error) {
    if (error) {
      handleError(error)
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
  trace(`Getting second audio stream`);
  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleUnprocessedStream).catch(handleError);
}

function handleUnprocessedStream(stream) {
  trace('Got second audio stream');
  trace(`Second track settings: `,
              JSON.stringify(stream.getAudioTracks()[0].getSettings()));
  trace(`Second track constraints: `,
              JSON.stringify(stream.getAudioTracks()[0].getConstraints()));
  const unprocMeter = window.unprocMeter = new SoundMeter(window.audioContext);
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
  trace(`navigator.getUserMedia error: `, error);
  errorMsg.innerText = `navigator.getUserMedia error: ${error}`
}

navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(handleError);

