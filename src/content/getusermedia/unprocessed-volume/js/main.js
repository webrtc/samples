/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* global AudioContext, SoundMeter */

'use strict';

const instantMeter = document.querySelector('#instant meter');
const slowMeter = document.querySelector('#slow meter');
const unprocessedMeter = document.querySelector('#unprocessed meter');

const instantValueDisplay = document.querySelector('#instant .value');
const slowValueDisplay = document.querySelector('#slow .value');
const unprocessedValueDisplay = document.querySelector('#unprocessed .value');
const errorMsg = document.querySelector('#errorMsg');

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
};

async function handleSuccess(stream) {
  // Put variables in global scope to make them available to the
  // browser console.
  window.stream = stream;
  const soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
  errorMsg.innerText = '';

  try {
    // eslint-disable-next-line no-unused-vars
    const ignored = await soundMeter.connectToSource(stream);
    setInterval(function() {
      instantMeter.value = instantValueDisplay.innerText =
        soundMeter.instant.toFixed(2);
      slowMeter.value = slowValueDisplay.innerText =
        soundMeter.slow.toFixed(2);
    }, 200);
  } catch (e) {
    handleError(e);
  }

  const audioSettings = JSON.stringify(stream.getAudioTracks()[0].getSettings());
  console.log('First track settings:', audioSettings);

  // Set up second track with audio processing disabled
  constraints.audio = {echoCancellation: {exact: false}};
  trace('Getting second audio stream');
  try {
    const secondStream = await navigator.mediaDevices.getUserMedia(constraints);
    // eslint-disable-next-line no-unused-vars
    const ignore = await handleUnprocessedStream(secondStream);
  } catch (e) {
    handleError(e);
  }
}

async function handleUnprocessedStream(stream) {
  trace('Got second audio stream');
  trace('Second track settings: ',
    JSON.stringify(stream.getAudioTracks()[0].getSettings()));
  trace('Second track constraints: ',
    JSON.stringify(stream.getAudioTracks()[0].getConstraints()));
  const unprocMeter = window.unprocMeter = new SoundMeter(window.audioContext);
  try {
    // eslint-disable-next-line no-unused-vars
    const ignored = await unprocMeter.connectToSource(stream);
    setInterval(function() {
      unprocessedMeter.value = unprocessedValueDisplay.innerText =
        unprocMeter.slow.toFixed(2);
    }, 200);
  } catch (e) {
    handleError(e);
  }
}

function handleError(error) {
  trace('navigator.getUserMedia error: ', error);
  errorMsg.innerText = `navigator.getUserMedia error: ${error}`;
}

async function init() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // eslint-disable-next-line no-unused-vars
    const ignored = await handleSuccess(stream);
  } catch (e) {
    handleError(e);
  }
}

// noinspection JSIgnoredPromiseFromCall
init();
