importScripts('./multi_video_main.js');
'use strict';

let mainTransform = null;

/* global WebGPUTransform */ // defined in multi_video_main.js

onmessage = async (event) => {
  const {operation} = event.data;
  if (operation === 'init') {
    mainTransform = new WebGPUTransform();
    const {canvas} = event.data;
    const msg = await mainTransform.init(canvas);
    if (msg) {
      postMessage({error: msg});
    } else {
      postMessage({result: 'Done'});
    }
  } else if (operation === 'transform') {
    const {videoStream, gumStream} = event.data;
    mainTransform.transform(videoStream, gumStream);
  }
};
