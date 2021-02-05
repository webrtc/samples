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

// Audio element
let audio;

// Buttons
let startButton;
let stopButton;

// Transformation chain elements
let processor;
let generator;
let transformer;

// Stream from getUserMedia
let stream;
// Output from the transform
let processedStream;

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

// Returns a low-pass transform function for use with TransformStream.
function lowPassFilter(cutoff = 100) {
  let lastValue = undefined;
  let alpha = undefined;
  return (frame, controller) => {
    const samples = frame.buffer.getChannelData(0);

    // Initialize based on the first AudioBuffer.
    if (lastValue == undefined) {
      const rc = 1.0 / (cutoff * 2 * Math.PI);
      const dt = 1.0 / frame.buffer.sampleRate;
      alpha = dt / (rc + dt);
      lastValue = samples[0];
    }

    // Apply low-pass filter to samples.
    for (let i = 0; i < samples.length; ++i) {
      lastValue = lastValue + alpha * (samples[i] - lastValue);
      samples[i] = lastValue;
    }

    frame.buffer.copyToChannel(samples, 0);
    controller.enqueue(frame);
  };
}

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

  processor = new MediaStreamTrackProcessor(audioTracks[0]);
  generator = new MediaStreamTrackGenerator('audio');
  const source = processor.readable;
  const sink = generator.writable;
  transformer = new TransformStream({transform: lowPassFilter()});
  const promise = source.pipeThrough(transformer).pipeTo(sink);
  promise.catch((e) => {
    console.error('Error from transform:', e);
    source.cancel(e);
    sink.abort(e);
  });

  processedStream = new MediaStream();
  processedStream.addTrack(generator);
  audio.srcObject = processedStream;
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
