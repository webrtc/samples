/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

const videoElement = document.querySelector('video');
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];
let hasMic = false;
let hasCamera = false;
let openMic = undefined;
let openCamera = undefined;
let hasPermission = false;

audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype);

function getDevices() {
  navigator.mediaDevices.enumerateDevices().then(gotDevices, handleError);
}

function gotDevices(deviceInfos) {
  console.log('gotDevices', deviceInfos);
  hasMic = false;
  hasCamera = false;
  hasPermission = false;
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    if (deviceInfo.deviceId == '') {
      continue;
    }
    // If we get at least one deviceId, that means user has granted user
    // media permissions.
    hasPermission = true;
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      hasMic = true;
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
      hasCamera = true;
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
  start();
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
        .then(() => {
          console.log(`Success, audio output device attached: ${sinkId}`);
        }, handleSinkError);
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function handleSinkError(error) {
  let errorMessage = error;
  if (error.name === 'SecurityError') {
    errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
  }
  console.error(errorMessage);
  // Jump back to first output device in the list as it's the default.
  audioOutputSelect.selectedIndex = 0;
}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(videoElement, audioDestination);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoElement.srcObject = stream;
  if (stream.getVideoTracks()[0]) {
    openCamera = stream.getVideoTracks()[0].getSettings().deviceId;
  }
  if (stream.getAudioTracks()[0]) {
    openMic = stream.getAudioTracks()[0].getSettings().deviceId;
  }
  // Refresh list in case labels have become available
  return getDevices();
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

function start() {
  const audioSource = audioInputSelect.value || undefined;
  const videoSource = videoSelect.value || undefined;
  // Don't open the same devices again.
  if (hasPermission && openMic == audioSource && openCamera == videoSource) {
    return;
  }
  // Close existng streams.
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
    openCamera = undefined;
    openMic = undefined;
  }
  const constraints = {
    audio: true,
    video: true
  };
  if (hasMic) {
    constraints['audio'] = {deviceId: audioSource ? {exact: audioSource} : undefined};
  }
  if (hasCamera) {
    constraints['video'] = {deviceId: videoSource ? {exact: videoSource} : undefined};
  }
  console.log('start', constraints);
  if (!hasPermission || hasCamera || hasMic) {
    navigator.mediaDevices.getUserMedia(constraints).then(gotStream, handleError);
  }
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;
videoSelect.onchange = start;
navigator.mediaDevices.ondevicechange = getDevices;

getDevices();
