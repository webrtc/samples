/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

const sharingPreference = document.getElementById('preference');

if (adapter.browserDetails.browser === 'chrome' && adapter.browserDetails.version >= 107) {
  // See https://developer.chrome.com/docs/web-platform/screen-sharing-controls/
  sharingPreference.style.display = 'block';
} else if (adapter.browserDetails.browser === 'firefox') {
  // Polyfill in Firefox.
  // See https://blog.mozilla.org/webrtc/getdisplaymedia-now-available-in-adapter-js/
  adapter.browserShim.shimGetDisplayMedia(window, 'screen');
}

function handleSuccess(stream) {
  startButton.disabled = true;
  const video = document.querySelector('video');
  video.srcObject = stream;

  // demonstrates how to detect that the user has stopped
  // sharing the screen via the browser UI.
  stream.getVideoTracks()[0].addEventListener('ended', () => {
    errorMsg('The user has ended sharing the screen');
    startButton.disabled = false;
    sharingPreference.disabled = false;
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

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', () => {
  const options = {audio: true, video: {}};
  const displaySurface = sharingPreference.options[sharingPreference.selectedIndex];
  if (displaySurface.value !== '') {
    options.video.displaySurface = displaySurface.value;
  }
  sharingPreference.disabled = true;
  navigator.mediaDevices.getDisplayMedia(options)
      .then(handleSuccess, handleError);
});

if ((navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)) {
  startButton.disabled = false;
} else {
  errorMsg('getDisplayMedia is not supported');
}
