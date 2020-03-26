/*
*  Copyright (c) 2019 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

const source = document.querySelector('#source');
// TODO(hta): Use OffscreenCanvas for the intermediate canvases.
const canvasIn = document.querySelector('#canvas-source');
const canvasOut = document.querySelector('#canvas-result');
const result = document.querySelector('#result');

const stream = canvasOut.captureStream();
let inputStream = null;
let imageData = null;

result.srcObject = stream;

function loop() {
  if (source.videoWidth > 0 && source.videoHeight > 0) {
    canvasIn.width = source.videoWidth;
    canvasIn.height = source.videoHeight;
    const ctx = canvasIn.getContext('2d');
    ctx.drawImage(source, 0, 0);
    // Put a red square into the image, to mark it as "processed".
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(10, 10, 80, 80);
    imageData = ctx.getImageData(0, 0, canvasIn.width, canvasIn.height);
    // At this point, we have data that can be transferred.
    // We paint it on the second canvas.
    canvasOut.width = source.videoWidth;
    canvasOut.height = source.videoHeight;
    const outCtx = canvasOut.getContext('2d');
    outCtx.putImageData(imageData, 0, 0);
  }
  window.requestAnimationFrame(loop);
}

(async () => {
  inputStream = await navigator.mediaDevices.getUserMedia({video: true});
  source.srcObject = inputStream;
  source.play();
  result.play();
  window.requestAnimationFrame(loop);
})();
