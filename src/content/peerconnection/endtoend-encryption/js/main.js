/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global VideoPipe */

const video1 = document.querySelector('video#video1');
const video2 = document.querySelector('video#video2');
const videoMonitor = document.querySelector('#video-monitor');

const startButton = document.querySelector('button#start');
const callButton = document.querySelector('button#call');
const hangupButton = document.querySelector('button#hangup');

const cryptoKey = document.querySelector('#crypto-key');
const cryptoOffsetBox = document.querySelector('#crypto-offset');
const banner = document.querySelector('#banner');
const muteMiddleBox = document.querySelector('#mute-middlebox');

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

cryptoKey.addEventListener('change', setCryptoKey);
cryptoOffsetBox.addEventListener('change', setCryptoKey);
muteMiddleBox.addEventListener('change', toggleMute);

let startToMiddle;
let startToEnd;
let currentCryptoKey;
let useCryptoOffset;
let currentKeyIdentifier = 0;

let localStream;
// eslint-disable-next-line no-unused-vars
let remoteStream;

const supportsInsertableStreams =
      !!RTCRtpSender.prototype.createEncodedVideoStreams;

if (!supportsInsertableStreams) {
  banner.innerText = 'Your browser does not support Insertable Streams. ' +
  'This sample will not work.';
  if (adapter.browserDetails.browser === 'chrome') {
    banner.innerText += ' Try with Enable experimental Web Platform features enabled from chrome://flags.';
  }
  cryptoKey.hidden = true;
}

function gotStream(stream) {
  console.log('Received local stream');
  video1.srcObject = stream;
  localStream = stream;
  callButton.disabled = false;
}

function gotremoteStream(stream) {
  console.log('Received remote stream');
  remoteStream = stream;
  video2.srcObject = stream;
}

function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
  const options = {audio: true, video: true};
  navigator.mediaDevices
      .getUserMedia(options)
      .then(gotStream)
      .catch(function(e) {
        alert('getUserMedia() failed');
        console.log('getUserMedia() error: ', e);
      });
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  // The real use case is where the middle box relays the
  // packets and listens in, but since we don't have
  // access to raw packets, we just send the same video
  // to both places.
  startToMiddle = new VideoPipe(localStream, encodeFunction, null, stream => {
    videoMonitor.srcObject = stream;
  });
  startToEnd = new VideoPipe(localStream, encodeFunction, decodeFunction,
      gotremoteStream);
  console.log('Video pipes created');
}

function hangup() {
  console.log('Ending call');
  startToMiddle.close();
  startToEnd.close();
  hangupButton.disabled = true;
  callButton.disabled = false;
}

function dump(chunk, direction, max = 16) {
  const data = new Uint8Array(chunk.data);
  let bytes = '';
  for (let j = 0; j < data.length && j < max; j++) {
    bytes += (data[j] < 16 ? '0' : '') + data[j].toString(16) + ' ';
  }
  console.log(performance.now().toFixed(2), direction, bytes.trim(), chunk.data.byteLength, (data[0] & 0x1) === 0);
}

// If using crypto offset (controlled by a checkbox):
// Do not encrypt the first couple of bytes of the payload. This allows
// a middle to determine video keyframes or the opus mode being used.
// For VP8 this is the content described in
//   https://tools.ietf.org/html/rfc6386#section-9.1
// which is 10 bytes for key frames and 3 bytes for delta frames.
// For opus (where chunk.type is not set) this is the TOC byte from
//   https://tools.ietf.org/html/rfc6716#section-3.1
//
// It makes the (encrypted) video and audio much more fun to watch and listen to
// as the decoder does not immediately throw a fatal error.
const frameTypeToCryptoOffset = {
  key: 10,
  delta: 3,
  undefined: 1,
};

let scount = 0;
function encodeFunction(chunk, controller) {
  if (scount++ < 30) { // dump the first 30 packets.
    dump(chunk, 'send');
  }
  if (currentCryptoKey) {
    const view = new DataView(chunk.data);
    // Any length that is needed can be used for the new buffer.
    const newData = new ArrayBuffer(chunk.data.byteLength + 5);
    const newView = new DataView(newData);

    const cryptoOffset = useCryptoOffset? frameTypeToCryptoOffset[chunk.type] : 0;
    for (let i = 0; i < cryptoOffset && i < chunk.data.byteLength; ++i) {
      newView.setInt8(i, view.getInt8(i));
    }
    for (let i = cryptoOffset; i < chunk.data.byteLength; ++i) {
      const keyByte = currentCryptoKey.charCodeAt(i % currentCryptoKey.length);
      newView.setInt8(i, view.getInt8(i) ^ keyByte);
    }
    // Append keyIdentifier.
    newView.setUint8(chunk.data.byteLength, currentKeyIdentifier % 0xff);
    // Append checksum
    newView.setUint32(chunk.data.byteLength + 1, 0xDEADBEEF);

    chunk.data = newData;
  }
  controller.enqueue(chunk);
}

let rcount = 0;
function decodeFunction(chunk, controller) {
  if (rcount++ < 30) { // dump the first 30 packets
    dump(chunk, 'recv');
  }
  const view = new DataView(chunk.data);
  const checksum = chunk.data.byteLength > 4 ? view.getUint32(chunk.data.byteLength - 4) : false;
  if (currentCryptoKey) {
    if (checksum !== 0xDEADBEEF) {
      console.log('Corrupted frame received, checksum ' +
                  checksum.toString(16));
      return; // This can happen when the key is set and there is an unencrypted frame in-flight.
    }
    const keyIdentifier = view.getUint8(chunk.data.byteLength - 5);
    if (keyIdentifier !== currentKeyIdentifier) {
      console.log(`Key identifier mismatch, got ${keyIdentifier} expected ${currentKeyIdentifier}.`);
      return;
    }

    const newData = new ArrayBuffer(chunk.data.byteLength - 5);
    const newView = new DataView(newData);
    const cryptoOffset = useCryptoOffset? frameTypeToCryptoOffset[chunk.type] : 0;

    for (let i = 0; i < cryptoOffset && i < chunk.data.byteLength - 5; ++i) {
      newView.setInt8(i, view.getInt8(i));
    }
    for (let i = cryptoOffset; i < chunk.data.byteLength - 5; ++i) {
      const keyByte = currentCryptoKey.charCodeAt(i % currentCryptoKey.length);
      newView.setInt8(i, view.getInt8(i) ^ keyByte);
    }
    chunk.data = newData;
  } else if (checksum === 0xDEADBEEF) {
    return; // encrypted in-flight frame but we already forgot about the key.
  }
  controller.enqueue(chunk);
}

function setCryptoKey(event) {
  console.log('Setting crypto key to ' + cryptoKey.value);
  currentCryptoKey = cryptoKey.value;
  useCryptoOffset = !cryptoOffsetBox.checked;
  currentKeyIdentifier++;
  if (currentCryptoKey) {
    banner.innerText = 'Encryption is ON';
  } else {
    banner.innerText = 'Encryption is OFF';
  }
}

function toggleMute(event) {
  video2.muted = muteMiddleBox.checked;
  videoMonitor.muted = !muteMiddleBox.checked;
}
