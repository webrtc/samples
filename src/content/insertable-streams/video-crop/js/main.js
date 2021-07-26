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
const localVideo = document.getElementById('localVideo');
const croppedVideo = document.getElementById('croppedVideo');

const worker = new Worker('./js/worker.js', {name: 'Crop worker'});
startButton.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({video: {width: 1280, height: 720}});
  localVideo.srcObject = stream;

  const [track] = stream.getTracks();
  const processor = new MediaStreamTrackProcessor({track});
  const {readable} = processor;

  const generator = new MediaStreamTrackGenerator({kind: 'video'});
  const {writable} = generator;
  croppedVideo.srcObject = new MediaStream([generator]);

  worker.postMessage({
    operation: 'crop',
    readable,
    writable,
  }, [readable, writable]);
});
