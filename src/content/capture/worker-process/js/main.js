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
let transformStream = null;
let writer = null;
let reader = null;

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
    writer.write(imageData);
  }
  window.requestAnimationFrame(loop);
}

// The read function paints the incoming data on the second canvas.
const readData = async () => {
  const result = await reader.read();
  if (!result.done) {
    canvasOut.width = source.videoWidth;
    canvasOut.height = source.videoHeight;
    const outCtx = canvasOut.getContext('2d');
    outCtx.putImageData(result.value, 0, 0);
    readData();
  }
};

(async () => {
  inputStream = await navigator.mediaDevices.getUserMedia({video: true});
  source.srcObject = inputStream;
  transformStream = new TransformStream();
  writer = transformStream.writable.getWriter();

  const myWorker = new Worker('js/worker.js');
  myWorker.onmessage = function(e) {
    reader = e.data[1].getReader();
    // Start the flow of data.
    readData();
    window.requestAnimationFrame(loop);
  };
  myWorker.postMessage(['stream', transformStream.readable],
      [transformStream.readable]);
  source.play();
  result.play();
})();
