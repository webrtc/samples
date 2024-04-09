/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global MediaStreamTrackProcessor, MediaStreamTrackGenerator, AudioData */
if (typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined') {
  alert(
      'Your browser does not support the experimental MediaStreamTrack API ' +
      'for Insertable Streams of Media. See the note at the bottom of the ' +
      'page.');
}

try {
  new MediaStreamTrackGenerator('audio');
  console.log('Audio insertable streams supported');
} catch (e) {
  alert(
      'Your browser does not support insertable audio streams. See the note ' +
        'at the bottom of the page.');
}

if (typeof AudioData === 'undefined') {
  alert(
      'Your browser does not support WebCodecs. See the note at the bottom ' +
      'of the page.');
}

// Put variables in global scope to make them available to the browser console.

// Audio element
let audio;

// Buttons
let startButton;
let stopButton;

// Transformation chain elements
let processor;
let generator;

// Stream from getUserMedia
let stream;
// Output from the transform
let processedStream;

// Worker for processing
let worker;

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
    const audioTracks = stream.getAudioTracks();
    console.log('Using audio device: ' + audioTracks[0].label);
    stream.oninactive = () => {
      console.log('Stream ended');
    };

    processor = new MediaStreamTrackProcessor(audioTracks[0]);
    generator = new MediaStreamTrackGenerator('audio');
    const source = processor.readable;
    const sink = generator.writable;
    worker = new Worker('js/worker.js');
    worker.postMessage({source: source, sink: sink}, [source, sink]);

    processedStream = new MediaStream();
    processedStream.addTrack(generator);
    audio.srcObject = processedStream;
    stopButton.disabled = false;
    await audio.play();
  } catch (error) {
    const errorMessage =
          'navigator.MediaDevices.getUserMedia error: ' + error.message + ' ' +
          error.name;
    document.getElementById('errorMsg').innerText = errorMessage;
    console.log(errorMessage);
  }
}

async function stop() {
  stopButton.disabled = true;
  audio.pause();
  audio.srcObject = null;
  stream.getTracks().forEach(track => {
    track.stop();
  });
  worker.postMessage({command: 'abort'});
  startButton.disabled = false;
}

window.onload = init;
