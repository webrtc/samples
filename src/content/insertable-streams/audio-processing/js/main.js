/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global MediaStreamTrackProcessor, MediaStreamTrackGenerator */
if (typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined') {
  alert(
      'Your browser does not support the experimental MediaStreamTrack API ' +
      'for Insertable Streams of Media. See the note at the bottom of the ' +
      'page.');
}

// Put variables in global scope to make them available to the browser console.

// audio element
let audio;

// Buttons
let startButton;
let stopButton;

// Stream from getUserMedia
let stream;

// Initialize on page load.
async function init() {
  audio = document.getElementById('audioOutput');
  startButton = document.getElementById('startButton');
  stopButton = document.getElementById('stopButton');

  startButton.onclick = start;
  stopButton.onclick = stop;
}

const constraints = window.constraints = {
  audio: true,
  video: false
};

async function start() {
  startButton.disabled = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    const errorMessage = 'navigator.MediaDevices.getUserMedia error: ' + error.message + ' ' + error.name;
    document.getElementById('errorMsg').innerText = errorMessage;
    console.log(errorMessage);
  }
  const audioTracks = stream.getAudioTracks();
  console.log('Using audio device: ' + audioTracks[0].label);
  stream.oninactive = () => {
    console.log('Stream ended');
  };
  audio.srcObject = stream;
  stopButton.disabled = false;
  await audio.play();
}

async function stop() {
  stopButton.disabled = true;
  audio.pause();
  audio.srcObject = null;
  stream.getTracks().forEach(track => {
    track.stop();
  });
  startButton.disabled = false;
}

window.onload = init;
