/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const gumAudio = document.querySelector('audio.gum');
gumAudio.addEventListener('play', () => {
  gumAudio.volume = 0.1;
  console.log('Audio lowered to reduce feedback from local gUM stream');
});
const gumVideo = document.querySelector('video.gum');
gumVideo.addEventListener('play', () => {
  gumVideo.volume = 0.1;
  console.log('Audio lowered to reduce feedback from local gUM stream');
});

function gotDevices(deviceInfos) {
  const masterOutputSelector = document.createElement('select');

  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audiooutput') {
      console.info('Found audio output device: ', deviceInfo.label);
      option.text = deviceInfo.label || `speaker ${masterOutputSelector.length + 1}`;
      masterOutputSelector.appendChild(option);
    } else {
      console.log('Found non audio output device: ', deviceInfo.label);
    }
  }

  // Clone the master outputSelector and replace outputSelector placeholders.
  const allOutputSelectors = document.querySelectorAll('select');
  for (let selector = 0; selector < allOutputSelectors.length; selector++) {
    const newOutputSelector = masterOutputSelector.cloneNode(true);
    newOutputSelector.addEventListener('change', changeAudioDestination);
    allOutputSelectors[selector].parentNode.replaceChild(newOutputSelector,
        allOutputSelectors[selector]);
  }
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

// Attach audio output device to the provided media element using the deviceId.
function attachSinkId(element, sinkId, outputSelector) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
        .then(() => {
          console.log(`Success, audio output device attached: ${sinkId} to element with ${element.title} as source.`);
        })
        .catch(error => {
          let errorMessage = error;
          if (error.name === 'SecurityError') {
            errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
          }
          console.error(errorMessage);
          // Jump back to first output device in the list as it's the default.
          outputSelector.selectedIndex = 0;
        });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination(event) {
  const deviceId = event.target.value;
  const outputSelector = event.target;
  // FIXME: Make the media element lookup dynamic.
  const element = event.path[2].childNodes[1];
  attachSinkId(element, deviceId, outputSelector);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  gumAudio.srcObject = stream;
  gumVideo.srcObject = stream;
}

function start() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const constraints = {
    audio: true,
    video: true
  };
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
}

start();

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

