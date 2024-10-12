/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/*
 * This is a worker doing the encode/decode transformations to add end-to-end
 * encryption to a WebRTC PeerConnection using the Insertable Streams API.
 */

'use strict';
let currentCryptoKey;
let useCryptoOffset = true;
let currentKeyIdentifier = 0;

// If using crypto offset (controlled by a checkbox):
// Do not encrypt the first couple of bytes of the payload. This allows
// a middle to determine video keyframes or the opus mode being used.
// For VP8 this is the content described in
//   https://tools.ietf.org/html/rfc6386#section-9.1
// which is 10 bytes for key frames and 3 bytes for delta frames.
// For opus (where encodedFrame.type is not set) this is the TOC byte from
//   https://tools.ietf.org/html/rfc6716#section-3.1
// TODO: make this work for other codecs.
//
// It makes the (encrypted) video and audio much more fun to watch and listen to
// as the decoder does not immediately throw a fatal error.
const frameTypeToCryptoOffset = {
  key: 10,
  delta: 3,
  undefined: 1,
};

function dump(encodedFrame, direction, max = 16) {
  const data = new Uint8Array(encodedFrame.data);
  let bytes = '';
  for (let j = 0; j < data.length && j < max; j++) {
    bytes += (data[j] < 16 ? '0' : '') + data[j].toString(16) + ' ';
  }
  const metadata = encodedFrame.getMetadata();
  console.log(performance.now().toFixed(2), direction, bytes.trim(),
      'len=' + encodedFrame.data.byteLength,
      'type=' + (encodedFrame.type || 'audio'),
      'ts=' + (metadata.rtpTimestamp || encodedFrame.timestamp),
      'ssrc=' + metadata.synchronizationSource,
      'pt=' + (metadata.payloadType || '(unknown)'),
      'mimeType=' + (metadata.mimeType || '(unknown)'),
  );
}

let scount = 0;
function encodeFunction(encodedFrame, controller) {
  if (scount++ < 30) { // dump the first 30 packets.
    dump(encodedFrame, 'send');
  }
  if (currentCryptoKey) {
    const view = new DataView(encodedFrame.data);
    // Any length that is needed can be used for the new buffer.
    const newData = new ArrayBuffer(encodedFrame.data.byteLength + 5);
    const newView = new DataView(newData);

    const cryptoOffset = useCryptoOffset? frameTypeToCryptoOffset[encodedFrame.type] : 0;
    for (let i = 0; i < cryptoOffset && i < encodedFrame.data.byteLength; ++i) {
      newView.setInt8(i, view.getInt8(i));
    }
    // This is a bitwise xor of the key with the payload. This is not strong encryption, just a demo.
    for (let i = cryptoOffset; i < encodedFrame.data.byteLength; ++i) {
      const keyByte = currentCryptoKey.charCodeAt(i % currentCryptoKey.length);
      newView.setInt8(i, view.getInt8(i) ^ keyByte);
    }
    // Append keyIdentifier.
    newView.setUint8(encodedFrame.data.byteLength, currentKeyIdentifier % 0xff);
    // Append checksum
    newView.setUint32(encodedFrame.data.byteLength + 1, 0xDEADBEEF);

    encodedFrame.data = newData;
  }
  controller.enqueue(encodedFrame);
}

let rcount = 0;
function decodeFunction(encodedFrame, controller) {
  if (rcount++ < 30) { // dump the first 30 packets
    dump(encodedFrame, 'recv');
  }
  const view = new DataView(encodedFrame.data);
  const checksum = encodedFrame.data.byteLength > 4 ? view.getUint32(encodedFrame.data.byteLength - 4) : false;
  if (currentCryptoKey) {
    if (checksum !== 0xDEADBEEF) {
      console.log('Corrupted frame received, checksum ' +
                  checksum.toString(16));
      return; // This can happen when the key is set and there is an unencrypted frame in-flight.
    }
    const keyIdentifier = view.getUint8(encodedFrame.data.byteLength - 5);
    if (keyIdentifier !== currentKeyIdentifier) {
      console.log(`Key identifier mismatch, got ${keyIdentifier} expected ${currentKeyIdentifier}.`);
      return;
    }

    const newData = new ArrayBuffer(encodedFrame.data.byteLength - 5);
    const newView = new DataView(newData);
    const cryptoOffset = useCryptoOffset? frameTypeToCryptoOffset[encodedFrame.type] : 0;

    for (let i = 0; i < cryptoOffset; ++i) {
      newView.setInt8(i, view.getInt8(i));
    }
    for (let i = cryptoOffset; i < encodedFrame.data.byteLength - 5; ++i) {
      const keyByte = currentCryptoKey.charCodeAt(i % currentCryptoKey.length);
      newView.setInt8(i, view.getInt8(i) ^ keyByte);
    }
    encodedFrame.data = newData;
  } else if (checksum === 0xDEADBEEF) {
    return; // encrypted in-flight frame but we already forgot about the key.
  }
  controller.enqueue(encodedFrame);
}

function handleTransform(operation, readable, writable) {
  if (operation === 'encode') {
    const transformStream = new TransformStream({
      transform: encodeFunction,
    });
    readable
        .pipeThrough(transformStream)
        .pipeTo(writable);
  } else if (operation === 'decode') {
    const transformStream = new TransformStream({
      transform: decodeFunction,
    });
    readable
        .pipeThrough(transformStream)
        .pipeTo(writable);
  }
}

// Handler for messages, including transferable streams.
onmessage = (event) => {
  if (event.data.operation === 'encode' || event.data.operation === 'decode') {
    return handleTransform(event.data.operation, event.data.readable, event.data.writable);
  }
  if (event.data.operation === 'setCryptoKey') {
    if (event.data.currentCryptoKey !== currentCryptoKey) {
      currentKeyIdentifier++;
    }
    currentCryptoKey = event.data.currentCryptoKey;
    useCryptoOffset = event.data.useCryptoOffset;
  }
};

// Handler for RTCRtpScriptTransforms.
if (self.RTCTransformEvent) {
  self.onrtctransform = (event) => {
    const transformer = event.transformer;
    handleTransform(transformer.options.operation, transformer.readable, transformer.writable);
  };
}
