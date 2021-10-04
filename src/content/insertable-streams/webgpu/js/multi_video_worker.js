importScripts('./multi_video_main.js')
'use strict';

let mainTransform = null;

onmessage = async (event) => {
    const { operation } = event.data;
    if (operation === 'init') {
        mainTransform = new WebGPUTransform();
        const { canvas } = event.data;
        await mainTransform.init(canvas);
        postMessage({ result: 'Done' });
    }
    else if (operation === 'transform') {
        const { videoStream, gumStream } = event.data;
        mainTransform.transform(videoStream, gumStream);
    }
};
