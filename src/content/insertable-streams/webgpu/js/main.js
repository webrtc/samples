'use strict';

/* global MediaStreamTrackProcessor, MediaStreamTrackGenerator */
if (typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined') {
  const errorMessage = 'Your browser does not support the MediaStreamTrack ' +
        'API for Insertable Streams of Media which was shipped in M94.';
  document.getElementById('errorMsg').innerText = errorMessage;
  console.log(errorMessage);
}

/* global WebGPUTransform */ // defined in multi_video_main.js
/* global WebGPUWorker */ // defined in multi_video_worker_manager.js

let videoElement;

async function getMediaStream(src) {
  videoElement = document.getElementById('inputVideo');
  videoElement.controls = true;
  videoElement.loop = true;
  videoElement.muted = true;
  videoElement.src = src;
  videoElement.load();
  videoElement.play();

  let sourceStream;
  const mediaPromise = new Promise((resolve, reject) => {
    videoElement.oncanplay = () => {
      if (!resolve || !reject) return;
      console.log('Obtaining video capture stream');
      if (videoElement.captureStream) {
        sourceStream = videoElement.captureStream();
        resolve();
      } else if (videoElement.mozCaptureStream) {
        sourceStream = videoElement.mozCaptureStream();
        resolve();
      } else {
        reject(new Error('Stream capture is not supported'));
      }
      resolve = null;
      reject = null;
    };
  });
  await mediaPromise;
  console.log(
      'Received source video stream.', sourceStream);
  return sourceStream;
}

function getUserMediaStream() {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {width: 480, height: 270}
  }).catch(err => {
    throw new Error('Unable to fetch getUserMedia stream ' + err);
  });
}

let gpuTransform;
let gumTrack;
let gumVideo;

async function main(sourceType) {
  const gumStream = await getUserMediaStream();
  gumTrack = gumStream.getVideoTracks()[0];
  const gumProcessor = new MediaStreamTrackProcessor({track: gumTrack});

  gumVideo = document.getElementById('gumInputVideo');
  gumVideo.srcObject = gumStream;
  gumVideo.play();

  const videoStream = await getMediaStream('../../../video/chrome.webm');
  const videoTrack = videoStream.getVideoTracks()[0];
  const videoProcessor = new MediaStreamTrackProcessor({track: videoTrack});

  if (sourceType === 'main') {
    gpuTransform = new WebGPUTransform();
  }
  if (sourceType === 'worker') {
    gpuTransform = new WebGPUWorker();
  }
  await gpuTransform.init();
  await gpuTransform.transform(videoProcessor.readable, gumProcessor.readable);
}

function destroy_source() {
  if (videoElement) {
    console.log('Stopping source video');
    videoElement.pause();
  }
  if (gumVideo) {
    console.log('Stopping gUM stream');
    gumVideo.pause();
    gumVideo.srcObject = null;
  }
  if (gumTrack) gumTrack.stop();
}

const sourceSelector = document.getElementById('sourceSelector');

function updateSource() {
  if (gpuTransform) {
    gpuTransform.destroy();
  }
  gpuTransform = null;
  destroy_source();
  const sourceType = sourceSelector.options[sourceSelector.selectedIndex].value;

  console.log('New source is', sourceType);
  if (sourceType !== 'stopped') {
    main(sourceType);
  }
}

sourceSelector.oninput = updateSource;
