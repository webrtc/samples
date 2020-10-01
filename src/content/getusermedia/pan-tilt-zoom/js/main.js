/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

// Put variables in global scope to make them available to the browser console.
const constraints = window.constraints = {
  video: {
    pan: true, tilt: true, zoom: true
  }
};

function handleSuccess(stream) {
  const video = document.querySelector('video');
  const videoTracks = stream.getVideoTracks();
  console.log('Got stream with constraints:', constraints);
  console.log(`Using video device: ${videoTracks[0].label}`);
  video.srcObject = stream;

  // make track variable available to browser console.
  const [track] = [window.track] = stream.getVideoTracks();
  const capabilities = track.getCapabilities();
  const settings = track.getSettings();

  for (const ptz of ['pan', 'tilt', 'zoom']) {
    // Check whether camera supports pan/tilt/zoom.
    if (!(ptz in settings)) {
      errorMsg(`Camera does not support ${ptz}.`);
      continue;
    }

    // Map it to a slider element.
    const input = document.querySelector(`input[name=${ptz}]`);
    input.min = capabilities[ptz].min;
    input.max = capabilities[ptz].max;
    input.step = capabilities[ptz].step;
    input.value = settings[ptz];
    input.disabled = false;
    input.oninput = async event => {
      try {
        const constraints = {advanced: [{[ptz]: input.value}]};
        await track.applyConstraints(constraints);
      } catch (err) {
        console.error('applyConstraints() failed: ', err);
      }
    };
  }
}

function handleError(error) {
  if (error.name === 'NotAllowedError') {
    errorMsg('Permissions have not been granted to use your camera, ' +
      'you need to allow the page access to your devices in ' +
      'order for the demo to work.');
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

async function init(e) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(stream);
    e.target.disabled = true;
  } catch (e) {
    handleError(e);
  }
}

document.querySelector('#showVideo').addEventListener('click', e => init(e));
