/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* global AudioContext, SoundMeter */

'use strict';

const instantMeter = document.querySelector('#instant meter');
const slowMeter = document.querySelector('#slow meter');
const clipMeter = document.querySelector('#clip meter');

const instantValueDisplay = document.querySelector('#instant .value');
const slowValueDisplay = document.querySelector('#slow .value');
const clipValueDisplay = document.querySelector('#clip .value');

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  window.audioContext = new AudioContext();
} catch (e) {
  alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
const constraints = window.constraints = {
  audio: true,
  video: false
};

async function handleSuccess(stream) {
  // Put variables in global scope to make them available to the
  // browser console.
  window.stream = stream;
  const soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
  try {
    // eslint-disable-next-line no-unused-vars
    const ignored = await soundMeter.connectToSource(stream);
    setInterval(() => {
      instantMeter.value = instantValueDisplay.innerText =
        soundMeter.instant.toFixed(2);
      slowMeter.value = slowValueDisplay.innerText =
        soundMeter.slow.toFixed(2);
      clipMeter.value = clipValueDisplay.innerText =
        soundMeter.clip;
    }, 200);
  } catch (e) {
    handleError(e);
  }
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
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
