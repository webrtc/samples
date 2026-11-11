/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

const videoElement = document.querySelector('video');
// Plays the microphone. The <video> element gets only the camera: in Chrome,
// when the microphone track ends, e.g. because the sound server restarted,
// the element playing it stops until srcObject is set again, which would
// also make the picture blink.
const audioElement = new Audio();
audioElement.autoplay = true;
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];
let hasMic = false;
let hasCamera = false;
// The devices of window.stream. They stay set while reopenTrack() gets back a
// track that the browser ended, so that start() leaves that to it.
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
    // Until the user grants permission, the browser lists at most one device
    // of each kind, without an id. That is still enough to know which kinds
    // of devices there are.
    if (deviceInfo.kind === 'audioinput') {
      hasMic = true;
    } else if (deviceInfo.kind === 'videoinput') {
      hasCamera = true;
    }
    if (deviceInfo.deviceId == '') {
      continue;
    }
    // If we get at least one deviceId, that means user has granted user
    // media permissions.
    hasPermission = true;
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
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
  attachSinkId(audioElement, audioDestination);
}

function gotStream(stream) {
  // start() can run again before getUserMedia() of its previous run has
  // finished: keep only one stream.
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  window.stream = stream; // make stream available to console
  videoElement.srcObject = new MediaStream(stream.getVideoTracks());
  audioElement.srcObject = new MediaStream(stream.getAudioTracks());
  // An ended track may not report its device; then keep the one asked for.
  if (stream.getVideoTracks()[0]) {
    openCamera = stream.getVideoTracks()[0].getSettings().deviceId || openCamera;
  }
  if (stream.getAudioTracks()[0]) {
    openMic = stream.getAudioTracks()[0].getSettings().deviceId || openMic;
  }
  stream.getTracks().forEach(watchTrack);
  // Refresh list in case labels have become available
  return getDevices();
}

// stop() does not fire 'ended', so 'ended' means that the browser ended the
// track itself: the device went away, or the browser lost its connection to
// it, e.g. because the sound server was restarted. Ask for that device again,
// and keep the other track running.
function watchTrack(track) {
  track.onended = () => {
    console.log(`${track.kind} track ended`);
    reopenTrack(track, track.kind === 'audio' ? openMic : openCamera, 1000);
  };
  // A track can also come already ended, and then 'ended' does not fire.
  if (track.readyState === 'ended') {
    track.onended();
  }
}

// Calls of reopenTrack() that wait for their delay. 'devicechange' makes them
// try at once, as the device may be back.
const waitingReopens = new Set();

// After `delay` ms, asks for a device of the same kind as the ended `track`,
// preferring the one it came from. If that fails, tries again, waiting twice
// as long each time, but not longer than 30 s.
function reopenTrack(track, deviceId, delay) {
  const stream = window.stream;
  const retry = () => reopenTrack(track, deviceId, Math.min(delay * 2, 30000));
  const attempt = () => {
    clearTimeout(timer);
    waitingReopens.delete(attempt);
    if (window.stream !== stream) {
      return; // start() has opened other devices meanwhile.
    }
    navigator.mediaDevices.getUserMedia({[track.kind]: {deviceId}}).then(newStream => {
      const newTrack = newStream.getTracks()[0];
      if (window.stream !== stream) {
        newTrack.stop();
      } else if (newTrack.readyState === 'ended') {
        retry(); // The device failed right after it was opened.
      } else {
        stream.removeTrack(track);
        stream.addTrack(newTrack);
        if (newTrack.kind === 'audio') {
          audioElement.srcObject = new MediaStream([newTrack]);
          openMic = newTrack.getSettings().deviceId;
        } else {
          videoElement.srcObject = new MediaStream([newTrack]);
          openCamera = newTrack.getSettings().deviceId;
        }
        watchTrack(newTrack);
        getDevices();
      }
    }, error => {
      handleError(error);
      if (window.stream === stream && error.name !== 'NotAllowedError') {
        retry();
      }
    });
  };
  const timer = setTimeout(attempt, delay);
  waitingReopens.add(attempt);
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

function start() {
  // No device is listed, e.g. while the sound server restarts: keep what is
  // open.
  if (!hasMic && !hasCamera) {
    return;
  }
  const audioSource = audioInputSelect.value || undefined;
  const videoSource = videoSelect.value || undefined;
  // Don't open the same devices again. Keep a device open when no device of
  // its kind is listed: the list can be out of date.
  if (hasPermission && (!hasMic || openMic == audioSource) &&
      (!hasCamera || openCamera == videoSource)) {
    return;
  }
  // Close existing streams, but keep the tracks of a kind that no device is
  // listed for: the list can be out of date, and an ended track is still
  // being reopened.
  const kept = [];
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      if (track.kind === 'audio' ? hasMic : hasCamera) {
        track.stop();
      } else {
        kept.push(track);
      }
    });
    window.stream = undefined;
  }
  if (hasCamera) {
    openCamera = videoSource;
  }
  if (hasMic) {
    openMic = audioSource;
  }
  // Only ask for kinds of devices that there are: asking for a camera on a
  // computer without one fails the whole request, microphone included.
  const constraints = {
    audio: hasMic ? {deviceId: audioSource ? {exact: audioSource} : undefined} : false,
    video: hasCamera ? {deviceId: videoSource ? {exact: videoSource} : undefined} : false
  };
  console.log('start', constraints);
  navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    kept.forEach(track => stream.addTrack(track));
    gotStream(stream);
  }, error => {
    kept.forEach(track => track.stop());
    openCamera = undefined;
    openMic = undefined;
    handleError(error);
  });
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;
videoSelect.onchange = start;
navigator.mediaDevices.ondevicechange = () => {
  waitingReopens.forEach(attempt => attempt());
  getDevices();
};

getDevices();
