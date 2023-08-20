/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

const preferredDisplaySurface = document.getElementById('displaySurface');
const startStopButton = document.getElementById('startButton');
const videoElement = document.querySelector('video');

if (adapter.browserDetails.browser === 'chrome' &&
    adapter.browserDetails.version >= 107) {
  // See https://developer.chrome.com/docs/web-platform/screen-sharing-controls/
  document.getElementById('options').style.display = 'block';
} else if (adapter.browserDetails.browser === 'firefox') {
  // Polyfill in Firefox.
  // See https://blog.mozilla.org/webrtc/getdisplaymedia-now-available-in-adapter-js/
  adapter.browserShim.shimGetDisplayMedia(window, 'screen');
}

function handleSuccess(stream) {
  startStopButton.textContent = 'Stop';
  preferredDisplaySurface.disabled = true;
  videoElement.srcObject = stream;

  // demonstrates how to detect that the user has stopped
  // sharing the screen via the browser UI.
  stream.getVideoTracks()[0].addEventListener('ended', () => {
    errorMsg('The user has ended sharing the screen');
    startStopButton.textContent = 'Start';
    preferredDisplaySurface.disabled = false;
  });
}

function handleError(error) {
  errorMsg(`getDisplayMedia error: ${error.name}`, error);
}

function errorMsg(msg, error) {
  const errorElement = document.querySelector('#errorMsg');
  errorElement.innerHTML += `<p>${msg}</p>`;
  if (typeof error !== 'undefined') {
    console.error(error);
  }
}


startStopButton.addEventListener('click', () => {
  if (startStopButton.textContent === 'Start') {
    const options = {audio: true, video: true};
    const displaySurface = preferredDisplaySurface.options[preferredDisplaySurface.selectedIndex].value;
    if (displaySurface !== 'default') {
      options.video = {displaySurface};
    }
    navigator.mediaDevices.getDisplayMedia(options)
        .then(handleSuccess, handleError);
  }
  else {
    // demonstrates how to stop the stream from JavaScript
    errorMsg('JavaScript has ended sharing the screen');
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    startStopButton.textContent = 'Start';
  }
});

if ((navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)) {
  startStopButton.disabled = false;
} else {
  errorMsg('getDisplayMedia is not supported');
}
