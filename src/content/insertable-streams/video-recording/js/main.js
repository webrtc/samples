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

const startButton = document.getElementById('startButton');
const slowDownButton = document.getElementById('slowDownButton');
const stopButton = document.getElementById('stopButton');
const originalVideo = document.getElementById('originalVideo');
const recordedOriginalVideo = document.getElementById('recordedOriginalVideo');
const mirroredWithCanvasVideo = document.getElementById('mirroredWithCanvasVideo');
const recordedMirroredWithCanvasVideo = document.getElementById('recordedMirroredWithCanvasVideo');
const mirroredInWebWorkerVideo = document.getElementById('mirroredInWebWorkerVideo');
const recordedMirroredInWorkerVideo = document.getElementById('recordedMirroredInWorkerVideo');

const worker = new Worker('./js/worker.js', { name: 'Crop worker' });


class VideoRecorder {
  constructor(stream, outputVideoElement) {
    this.videoElement = outputVideoElement;
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedBlob.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (e) => {
      throw e;
    };

    this.recordedBlob = [];
  }

  start() {
    this.mediaRecorder.start(1000);
  }

  stop() {
    this.mediaRecorder.stop();
    console.log('stopped');
    const blob = new Blob(this.recordedBlob, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    this.videoElement.src = url;
  }
}

let recorders = [];

startButton.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
  originalVideo.srcObject = stream;

  const [track] = stream.getTracks();
  const processor = new MediaStreamTrackProcessor({ track });
  const { readable } = processor;

  const generator = new MediaStreamTrackGenerator({ kind: 'video' });
  const { writable } = generator;

  const mediaStream = new MediaStream([generator]);
  mirroredInWebWorkerVideo.srcObject = mediaStream;

  const mirroredWithCanvasVideoStream = createMirroredCanvasStream(stream);
  mirroredWithCanvasVideo.srcObject = mirroredWithCanvasVideoStream;

  recorders.push(new VideoRecorder(stream, recordedOriginalVideo));
  recorders.push(new VideoRecorder(mediaStream, recordedMirroredInWorkerVideo));
  recorders.push(new VideoRecorder(mirroredWithCanvasVideoStream, recordedMirroredWithCanvasVideo));


  recorders.forEach(recorder => recorder.start());

  worker.postMessage({
    operation: 'mirror',
    readable,
    writable,
  }, [readable, writable]);
});

stopButton.addEventListener('click', () => {
  recorders.forEach(recorder => recorder.stop());
  recorders = [];
});

slowDownButton.addEventListener('click', () => {
  console.time('slowDownButton');
  let str = '';
  for (let i = 0; i < 100000; i++) {
    str += i.toString();
    if (str[str.length - 1] === '0') {
      str += '1';
    }
  }
  console.timeEnd('slowDownButton');
});


function createMirroredCanvasStream(stream) {
  const videoElement = document.createElement('video');
  videoElement.playsInline = true;
  videoElement.autoplay = true; // required in order for <canvas/> to successfully capture <video/>
  videoElement.muted = true;
  videoElement.srcObject = stream;

  const videoTrack = stream.getVideoTracks()[0];
  const { width, height } = videoTrack.getSettings();

  const canvasElm = document.createElement('canvas');
  canvasElm.width = width;
  canvasElm.height = height;

  const ctx = canvasElm.getContext('2d');

  ctx.translate(canvasElm.width, 0);
  ctx.scale(-1, 1);

  function drawCanvas() {
    ctx.drawImage(videoElement, 0, 0, canvasElm.width, canvasElm.height);
    requestAnimationFrame(drawCanvas);
  }
  // our stepping criteria to recursively draw on canvas from <video/> frame
  requestAnimationFrame(drawCanvas);

  // testing this, we realized that Chrome makes the video super laggy if the this._preCanvasVideoElm
  // is not in the DOM, and visible. We tried turning the opacity to 0, positioning the
  // video offscreen, etc. But the only thing that makes the performance good is making
  // it actually visible. So we make a 1px X 1px video in the top corner of the screen.
  videoElement.style.width = '1px';
  videoElement.style.height = '1px';
  videoElement.style.position = 'absolute';
  videoElement.style.zIndex = '9999999999999';
  document.body.appendChild(videoElement);
  videoElement.play();
  const canvasStream = canvasElm.captureStream(30);

  return canvasStream;
}
