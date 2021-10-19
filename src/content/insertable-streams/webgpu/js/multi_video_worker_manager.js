
'use strict';

let worker;
let screenCanvas;

// eslint-disable-next-line no-unused-vars
class WebGPUWorker {
  async init() {
    screenCanvas = document.createElement('canvas');
    document.getElementById('outputVideo').append(screenCanvas);
    screenCanvas.width = 960;
    screenCanvas.height = 540;

    worker = new Worker('./js/multi_video_worker.js');
    console.log('Created a worker thread.');
    const offScreen = screenCanvas.transferControlToOffscreen();

    const onMessage = new Promise((resolve, reject) => {
      worker.addEventListener('message', function handleMsgFromWorker(msg) {
        if (msg.data.error) {
          document.getElementById('errorMsg').innerText = msg.data.error;
          reject(msg.data.error);
        }
        if (msg.data.result === 'Done') {
          resolve();
        }
      });
    });
    worker.postMessage(
        {
          operation: 'init',
          canvas: offScreen,
        }, [offScreen]);

    await onMessage;
  }

  transform(videoStream, gumStream) {
    if (videoStream && gumStream) {
      worker.postMessage(
          {
            operation: 'transform',
            videoStream: videoStream,
            gumStream: gumStream,
          }, [videoStream, gumStream]);
    }
  }

  destroy() {
    if (screenCanvas.parentNode) {
      screenCanvas.parentNode.removeChild(screenCanvas);
    }
    worker.terminate();
    console.log('Worker thread destroyed.');
  }
}
