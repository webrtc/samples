
'use strict';

let worker;
let screenCanvas;

class WebGPUWorker {
    async init() {
        console.log('[WebGPUWorker] Initializing WebGPUWorkers.');

        screenCanvas = document.createElement('canvas');
        document.getElementById('outputVideo').append(screenCanvas);
        screenCanvas.width = 960;
        screenCanvas.height = 540;

        worker = new Worker('./js/multi_video_worker.js');
        const offScreen = screenCanvas.transferControlToOffscreen()
        worker.postMessage(
            {
                operation: 'init',
                canvas: offScreen,
            }, [offScreen]);

        const onMessage = new Promise((resolve, reject) => {
            worker.addEventListener("message", function handleMsgFromWorker(msg) {
                if (msg.data.error) {
                    console.log(msg.data.error);
                    document.getElementById('errorMsg').innerText = msg.data.error;
                    reject();
                }
                if (msg.data.result === 'Done') {
                    resolve();
                }
            });
        });

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

    async destroy() {
        worker.postMessage(
            {
                operation: 'destroy',
            });
        if (screenCanvas.parentNode) {
            screenCanvas.parentNode.removeChild(screenCanvas);
        }
        const onMessage = new Promise((resolve) => {
            worker.addEventListener("message", function handleMsgFromWorker() {
                this.terminate();
                resolve();
            });
        });

        await onMessage;
        console.log('[WebGPUWorker] Context destroyed.');
    }
}
