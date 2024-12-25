/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

// This code is adapted from
// https://rawgit.com/Miguelao/demos/master/mediarecorder.html

'use strict';

/* globals MediaRecorder */

let mediaRecorder;
let recordedBlobs;

const codecPreferences = document.querySelector('#codecPreferences');

const errorMsgElement = document.querySelector('span#errorMsg');
const recordedVideo = document.querySelector('video#recorded');
const recordButton = document.querySelector('button#record');
recordButton.addEventListener('click', () => {
  if (recordButton.textContent === 'Start Recording') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
    playButton.disabled = false;
    downloadButton.disabled = false;
    codecPreferences.disabled = false;
  }
});

const playButton = document.querySelector('button#play');
playButton.addEventListener('click', () => {
  const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value.split(';', 1)[0];
  const superBuffer = new Blob(recordedBlobs, {type: mimeType});
  recordedVideo.src = null;
  recordedVideo.srcObject = null;
  recordedVideo.src = window.URL.createObjectURL(superBuffer);
  recordedVideo.controls = true;
  recordedVideo.play();
});

const downloadButton = document.querySelector('button#download');
downloadButton.addEventListener('click', () => {
  const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value.split(';', 1)[0];
  const blob = new Blob(recordedBlobs, {type: mimeType});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `test.${mimeTypeToFileExtension(mimeType)}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
});

function mimeTypeToFileExtension(mimeType) {
  switch (mimeType) {
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/x-matroska':
      return 'mkv';
    default:
      throw new Error(`unsupported mimetype: ${mimeType}`);
  }
}

function handleDataAvailable(event) {
  console.log('handleDataAvailable', event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function getSupportedMimeTypes() {
  const possibleTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=av01,opus',
    'video/x-matroska;codecs=hvc1.1.6.L186.B0,opus',
    'video/mp4;codecs=vp9,mp4a.40.2',
    'video/mp4;codecs=avc1.64003E,mp4a.40.2',
    'video/mp4;codecs=avc3.64003E,mp4a.40.2',
    'video/mp4;codecs=hvc1.1.6.L186.B0,mp4a.40.2',
    'video/mp4;codecs=hev1.1.6.L186.B0,mp4a.40.2',
    'video/mp4;codecs=av01.0.19M.08,mp4a.40.2',
    'video/mp4',
  ];
  return possibleTypes.filter(mimeType => {
    return MediaRecorder.isTypeSupported(mimeType);
  });
}

async function startRecording() {
  recordedBlobs = [];
  const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value;
  const options = {mimeType};
  if (mimeType.split(';', 1)[0] === 'video/mp4') {
    // Adjust sampling rate to 48khz.
    const track = window.stream.getAudioTracks()[0];
    if (track) {
      const {sampleRate} = track.getSettings();
      if (sampleRate != 48000) {
        track.stop();
        window.stream.removeTrack(track);
        const newStream = await navigator.mediaDevices.getUserMedia({audio: {sampleRate: 48000}});
        window.stream.addTrack(newStream.getTracks()[0]);
      }
    }
  }
  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e) {
    console.error('Exception while creating MediaRecorder:', e);
    errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
    return;
  }

  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  codecPreferences.disabled = true;
  mediaRecorder.onstop = (event) => {
    console.log('Recorder stopped: ', event);
    console.log('Recorded Blobs: ', recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
}

function handleSuccess(stream) {
  recordButton.disabled = false;
  console.log('Got stream:', stream);
  window.stream = stream;

  const gumVideo = document.querySelector('video#gum');
  gumVideo.srcObject = stream;

  getSupportedMimeTypes().forEach(mimeType => {
    const option = document.createElement('option');
    option.value = mimeType;
    option.innerText = option.value;
    codecPreferences.appendChild(option);
  });
  codecPreferences.disabled = false;
}

async function init(constraints, isGetDisplayMedia) {
  try {
    const stream = isGetDisplayMedia ?
        await navigator.mediaDevices.getDisplayMedia(constraints) :
        await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(stream);
  } catch (e) {
    console.error('Source open error:', e);
    errorMsgElement.innerHTML = `Source error: ${e.toString()}`;
  }
}

async function onStart(isGetDisplayMedia) {
  document.querySelector('button#start-gum').disabled = true;
  document.querySelector('button#start-gdm').disabled = true;
  const hasEchoCancellation = document.querySelector('#echoCancellation').checked;
  const constraints = {
    audio: {
      echoCancellation: hasEchoCancellation
    },
    video: {
      width: 1280, height: 720
    }
  };
  console.log('Using media constraints:', constraints);
  await init(constraints, isGetDisplayMedia);
}

document.querySelector('button#start-gum').addEventListener('click', async () => {
  await onStart(false);
});
document.querySelector('button#start-gdm').addEventListener('click', async () => {
  await onStart(true);
});
