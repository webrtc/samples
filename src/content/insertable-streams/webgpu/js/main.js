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
            console.log('Obtaining video capture stream');
            if (videoElement.captureStream) {
                sourceStream = videoElement.captureStream();
                resolve();
            } else if (videoElement.mozCaptureStream) {
                sourceStream = videoElement.mozCaptureStream();
                resolve();
            } else {
                console.error(new Error('Stream capture is not supported'));
                reject();
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

async function getUserMediaStream() {
    let gUMStream;
    const gUMPromise = new Promise((resolve) => {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { width: 480, height: 270 }
        }).then(stream => {
            gUMStream = stream;
            resolve();
        }).catch(err => {
            throw new Error("Unable to fetch getUserMedia stream " + err);
        });
    });

    await gUMPromise;
    return gUMStream;
}

let gpuTransform;
let gUMTrack, gUMVideo;

async function main(sourceType) {
    const gUMStream = await getUserMediaStream();
    gUMTrack = gUMStream.getVideoTracks()[0];
    const gumProcessor = new MediaStreamTrackProcessor({ track: gUMTrack });

    gUMVideo = document.getElementById('gumInputVideo');
    gUMVideo.srcObject = gUMStream;
    gUMVideo.play();

    const videoStream = await getMediaStream('../../../video/chrome.webm');
    const videoTrack = videoStream.getVideoTracks()[0];
    const videoProcessor = new MediaStreamTrackProcessor({ track: videoTrack });

    if (sourceType === "main") {
        gpuTransform = new WebGPUTransform();
    }
    if (sourceType === "worker") {
        gpuTransform = new WebGPUWorker();
    }
    if (gpuTransform) {
        await gpuTransform.init();
        await gpuTransform.transform(videoProcessor.readable, gumProcessor.readable);
    }
}

function destroy_source() {
    if (videoElement) {
        console.log('Stopping source video');
        videoElement.pause();
    }
    if (gUMVideo) {
        console.log('Stopping gUM stream');
        gUMVideo.pause();
        gUMVideo.srcObject = null;
    }
    if (gUMTrack) gUMTrack.stop();
}

const sourceSelector = document.getElementById('sourceSelector');

async function updateSource() {
    if (gpuTransform) {
        await gpuTransform.destroy();
    }
    gpuTransform = null;
    destroy_source();
    const sourceType = sourceSelector.options[sourceSelector.selectedIndex].value;

    console.log("New source is", sourceType);
    if (sourceType !== "stopped") {
        main(sourceType);
    }
}

sourceSelector.oninput = updateSource;
