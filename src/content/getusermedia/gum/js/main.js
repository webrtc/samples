/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

// Put variables in global scope to make them available to the browser console.
window.audioConstraints = {
  audio: true,
  video: false
};
window.videoConstraints = {
  audio: false,
  video: true
};

function handleSuccess(constraints, stream) {
  if (constraints.audio) {
    console.log('Got audio stream with constraints:', constraints);

    window.audioStream = stream;  // make variable available to browser console
    const audioTracks = stream.getAudioTracks();
    console.log(`Using audio device: ${audioTracks[0].label}`);

    if (document.querySelector('#play-local-audio').checked) {
      const audio = document.querySelector('audio');
      audio.srcObject = stream;
    }
  }

  if (constraints.video) {
    console.log('Got video stream with constraints:', constraints);

    window.videoStream = stream;  // make variable available to browser console
    const videoTracks = stream.getVideoTracks();
    console.log(`Using video device: ${videoTracks[0].label}`);

    const video = document.querySelector('video');
    video.srcObject = stream;
  }
}

function handleError(constraints, error) {
  if (error.name === 'ConstraintNotSatisfiedError' ||
      error.name === 'OverconstrainedError') {
    errorMsg(`The constraints ${
        JSON.stringify(constraints)} are not supported by your device.`);
  } else if (
      error.name === 'NotAllowedError' ||
      error.name === 'PermissionDeniedError') {
    errorMsg(`Permissions have not been granted to use your ${
        JSON.stringify(constraints)} devices. You need to allow the page access
        to your devices in order for the demo to work.`);
  }
  errorMsg(`getUserMedia error: ${error.name}`, error);
}

function errorMsg(msg, error) {
  const errorElement = document.querySelector('#errorMsg');
  errorElement.innerHTML += `<p>${msg}</p>`;
  if (typeof error !== 'undefined') {
    console.error(error);
  }
}

function toggleAudioPlayout() {
  const audio = document.querySelector('audio');
  const shouldPlay = document.querySelector('#play-local-audio').checked;
  audio.srcObject =
      shouldPlay && window.audioStream ? window.audioStream : null;
}

async function init(e, constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(constraints, stream);
    e.target.disabled = true;
  } catch (e) {
    handleError(constraints, e);
  }
}

document.querySelector('#play-local-audio')
    .addEventListener('click', e => toggleAudioPlayout());
document.querySelector('#showAudio')
    .addEventListener('click', e => init(e, window.audioConstraints));
document.querySelector('#showVideo')
    .addEventListener('click', e => init(e, window.videoConstraints));
document.querySelector('#enumerateDevices').addEventListener('click', e => {
  navigator.mediaDevices.enumerateDevices().then(
      (devices) => {
        console.info('Enumerated devices:', devices);
      },
      (err) => {
        console.error('Failed to enumerate devices:', err);
      });
});
