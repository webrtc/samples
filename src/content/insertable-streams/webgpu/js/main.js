'use strict';

if (typeof MediaStreamTrackProcessor === 'undefined' ||
    typeof MediaStreamTrackGenerator === 'undefined') {
    const errorMessage = 'Your browser does not support the MediaStreamTrack '
        + 'API for Insertable Streams of Media which was shipped in M94.';
    document.getElementById('errorMsg').innerText = errorMessage;
    console.log(errorMessage);
}

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
            console.log('[VideoSource] Obtaining video capture stream');
            if (videoElement.captureStream) {
                sourceStream = videoElement.captureStream();
                resolve("Success");
            } else if (videoElement.mozCaptureStream) {
                sourceStream = videoElement.mozCaptureStream();
                resolve("Success");
            } else {
                const e = new Error('Stream capture is not supported');
                console.error(e);
                reject(e);
            }
            resolve = null;
            reject = null;
        };
    });
    await mediaPromise;
    console.log(
        '[VideoSource] Received source video stream.',
        `stream_ =`, sourceStream);
    return sourceStream;

}


let gpuTransform;
let gUMStream, gUMTrack;
let gUMVideo;

async function main(sourceType) {
    gUMStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 480, height: 270 } });
    gUMTrack = gUMStream.getVideoTracks()[0];
    const gum_processor = new MediaStreamTrackProcessor({ track: gUMTrack });
    const gum_source = gum_processor.readable.getReader();

    gUMVideo = document.getElementById('gumInputVideo');
    gUMVideo.srcObject = gUMStream;
    gUMVideo.play();

    const videoStream = await getMediaStream('../../../video/chrome.webm');
    const videoTrack = videoStream.getVideoTracks()[0];
    const video_processor = new MediaStreamTrackProcessor({ track: videoTrack });
    const video_source = video_processor.readable.getReader();

    if (sourceType == "multi-video") {
        gpuTransform = new WebGPUTransform();
    }
    if (sourceType == "worker") {
        gpuTransform = new WebGPUWorker();
    }
    await gpuTransform.init();

    const transform_func = async (frame1, frame2) => {
        if (gpuTransform) {
            await gpuTransform.transform(frame1, frame2);
        }
        else {
            if (frame1) frame1.close();
            if (frame2) frame2.close();
        }
    };

    async function updateScreenImage() {
        while (true) {
            let chunk1, chunk2;
            if (video_source) {
                let { value: chunk } = await video_source.read();
                chunk1 = chunk;
            }
            if (gum_source) {
                let { value: chunk } = await gum_source.read();
                chunk2 = chunk;
            }
            transform_func(chunk1, chunk2);
        }
    }

    updateScreenImage();
}

function destroy_source() {
    if (videoElement) {
        console.log('[VideoSource] Stopping source video');
        videoElement.pause();
    }
    if (gUMVideo) {
        console.log('[VideoSource] Stopping gUM stream');
        gUMVideo.pause();
        gUMVideo.srcObject = null;
    }
    if (gUMTrack) gUMTrack.stop();
}



const sourceSelector = document.getElementById('sourceSelector');

async function updateSource() {
    if (gpuTransform) {
        await gpuTransform.destroy();
        gpuTransform = null;
    }
    destroy_source();
    const sourceType = sourceSelector.options[sourceSelector.selectedIndex].value;

    console.log("New source is", sourceType);
    if (sourceType != "stopped") {
        main(sourceType);
    }

}

sourceSelector.oninput = updateSource;
