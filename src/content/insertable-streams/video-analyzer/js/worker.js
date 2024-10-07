onrtctransform = async ({transformer: {readable, writable, options}}) => {
  await readable.pipeThrough(new TransformStream({
    transform: videoAnalyzer
  })).pipeTo(writable);
};

// accept shimming
onmessage = ({data}) => data.rtctransform && onrtctransform({transformer: data.rtctransform});

let keyFrameCount = 0;
let interFrameCount = 0;
let keyFrameLastSize = 0;
let interFrameLastSize = 0;
let duplicateCount = 0;
let prevFrameType;
let prevFrameTimestamp;
let prevFrameSynchronizationSource;

function videoAnalyzer(encodedFrame, controller) {
  const view = new DataView(encodedFrame.data);
  // We assume that the video is VP8.
  // TODO: Check the codec to see that it is.
  // The lowest value bit in the first byte is the keyframe indicator.
  // https://tools.ietf.org/html/rfc6386#section-9.1
  const keyframeBit = view.getUint8(0) & 0x01;
  // console.log(view.getUint8(0).toString(16));
  if (keyframeBit === 0) {
    keyFrameCount++;
    keyFrameLastSize = encodedFrame.data.byteLength;
  } else {
    interFrameCount++;
    interFrameLastSize = encodedFrame.data.byteLength;
  }
  if (encodedFrame.type === prevFrameType &&
      encodedFrame.timestamp === prevFrameTimestamp &&
      encodedFrame.synchronizationSource === prevFrameSynchronizationSource) {
    duplicateCount++;
  }
  prevFrameType = encodedFrame.type;
  prevFrameTimestamp = encodedFrame.timestamp;
  prevFrameSynchronizationSource = encodedFrame.synchronizationSource;
  controller.enqueue(encodedFrame);
}

// Update the display of the counters once a second.
setInterval(() => self.postMessage({
  keyFrameCount,
  keyFrameLastSize,
  interFrameCount,
  interFrameLastSize,
  duplicateCount
}), 500);
