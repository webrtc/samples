/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';
const MAX_CHUNK_SIZE = 262144;

let pc1;
let pc2;
let sendChannel;
let receiveChannel;
let chunkSize;
let lowWaterMark;
let highWaterMark;
let dataString;
let timeoutHandle = null;
const megsToSend = document.querySelector('input#megsToSend');
const sendButton = document.querySelector('button#sendTheData');
const orderedCheckbox = document.querySelector('input#ordered');
const sendProgress = document.querySelector('progress#sendProgress');
const receiveProgress = document.querySelector('progress#receiveProgress');
const errorMessage = document.querySelector('div#errorMsg');
const transferStatus = document.querySelector('span#transferStatus');

let bytesToSend = 0;
let totalTimeUsedInSend = 0;
let numberOfSendCalls = 0;
let maxTimeUsedInSend = 0;
let sendStartTime = 0;
let currentThroughput = 0;

sendButton.addEventListener('click', createConnection);

// Prevent data sent to be set to 0.
megsToSend.addEventListener('change', function() {
  const number = this.value;
  if (Number.isNaN(number)) {
    errorMessage.innerHTML = `Invalid value for MB to send: ${number}`;
  } else if (number <= 0) {
    sendButton.disabled = true;
    errorMessage.innerHTML = '<p>Please enter a number greater than zero.</p>';
  } else if (number > 64) {
    sendButton.disabled = true;
    errorMessage.innerHTML = '<p>Please enter a number lower or equal than 64.</p>';
  } else {
    errorMessage.innerHTML = '';
    sendButton.disabled = false;
  }
});

async function createConnection() {
  sendButton.disabled = true;
  megsToSend.disabled = true;

  const servers = null;

  const number = Number.parseInt(megsToSend.value);
  bytesToSend = number * 1024 * 1024;

  pc1 = new RTCPeerConnection(servers);

  // Let's make a data channel!
  const dataChannelParams = {ordered: false};
  if (orderedCheckbox.checked) {
    dataChannelParams.ordered = true;
  }
  sendChannel = pc1.createDataChannel('sendDataChannel', dataChannelParams);
  sendChannel.addEventListener('open', onSendChannelOpen);
  sendChannel.addEventListener('close', onSendChannelClosed);
  console.log('Created send data channel: ', sendChannel);

  console.log('Created local peer connection object pc1: ', pc1);

  pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));

  pc2 = new RTCPeerConnection(servers);
  pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
  pc2.addEventListener('datachannel', receiveChannelCallback);

  try {
    const localOffer = await pc1.createOffer();
    await handleLocalDescription(localOffer);
  } catch (e) {
    console.error('Failed to create session description: ', e);
  }

  transferStatus.innerHTML = 'Peer connection setup complete.';
}

function sendData() {
  // Stop scheduled timer if any (part of the workaround introduced below)
  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }

  let bufferedAmount = sendChannel.bufferedAmount;
  while (sendProgress.value < sendProgress.max) {
    transferStatus.innerText = 'Sending data...';
    const timeBefore = performance.now();
    sendChannel.send(dataString);
    const timeUsed = performance.now() - timeBefore;
    if (timeUsed > maxTimeUsedInSend) {
      maxTimeUsedInSend = timeUsed;
      totalTimeUsedInSend += timeUsed;
    }
    numberOfSendCalls += 1;
    bufferedAmount += chunkSize;
    sendProgress.value += chunkSize;

    // Pause sending if we reach the high water mark
    if (bufferedAmount >= highWaterMark) {
      // This is a workaround due to the bug that all browsers are incorrectly calculating the
      // amount of buffered data. Therefore, the 'bufferedamountlow' event would not fire.
      if (sendChannel.bufferedAmount < lowWaterMark) {
        timeoutHandle = setTimeout(() => sendData(), 0);
      }
      console.log(`Paused sending, buffered amount: ${bufferedAmount} (announced: ${sendChannel.bufferedAmount})`);
      break;
    }
  }

  if (sendProgress.value === sendProgress.max) {
    transferStatus.innerHTML = 'Data transfer completed successfully!';
  }
}

function startSendingData() {
  transferStatus.innerHTML = 'Start sending data.';
  sendProgress.max = bytesToSend;
  receiveProgress.max = sendProgress.max;
  sendProgress.value = 0;
  receiveProgress.value = 0;
  sendStartTime = performance.now();
  maxTimeUsedInSend = 0;
  totalTimeUsedInSend = 0;
  numberOfSendCalls = 0;
  sendData();
}

function maybeReset() {
  if (pc1 === null && pc2 === null) {
    sendButton.disabled = false;
    megsToSend.disabled = false;
  }
}

async function handleLocalDescription(desc) {
  pc1.setLocalDescription(desc);
  console.log('Offer from pc1:\n', desc.sdp);
  pc2.setRemoteDescription(desc);
  try {
    const remoteAnswer = await pc2.createAnswer();
    handleRemoteAnswer(remoteAnswer);
  } catch (e) {
    console.error('Error when creating remote answer: ', e);
  }
}

function handleRemoteAnswer(desc) {
  pc2.setLocalDescription(desc);
  console.log('Answer from pc2:\n', desc.sdp);
  pc1.setRemoteDescription(desc);
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

async function onIceCandidate(pc, event) {
  const candidate = event.candidate;
  if (candidate === null) {
    return;
  } // Ignore null candidates
  try {
    await getOtherPc(pc).addIceCandidate(candidate);
    console.log('AddIceCandidate successful: ', candidate);
  } catch (e) {
    console.error('Failed to add Ice Candidate: ', e);
  }
}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.addEventListener('close', onReceiveChannelClosed);
  receiveChannel.addEventListener('message', onReceiveMessageCallback);
}

function onReceiveMessageCallback(event) {
  receiveProgress.value += event.data.length;
  currentThroughput = receiveProgress.value / (performance.now() - sendStartTime);
  console.log('Current Throughput is:', currentThroughput, 'bytes/sec');

  // Workaround for a bug in Chrome which prevents the closing event from being raised by the
  // remote side. Also a workaround for Firefox which does not send all pending data when closing
  // the channel.
  if (receiveProgress.value === receiveProgress.max) {
    sendChannel.close();
    receiveChannel.close();
  }
}

function onSendChannelOpen() {
  console.log('Send channel is open');

  chunkSize = Math.min(pc1.sctp.maxMessageSize, MAX_CHUNK_SIZE);
  console.log('Determined chunk size: ', chunkSize);
  dataString = new Array(chunkSize).fill('X').join('');
  lowWaterMark = chunkSize; // A single chunk
  highWaterMark = Math.max(chunkSize * 8, 1048576); // 8 chunks or at least 1 MiB
  console.log('Send buffer low water threshold: ', lowWaterMark);
  console.log('Send buffer high water threshold: ', highWaterMark);
  sendChannel.bufferedAmountLowThreshold = lowWaterMark;
  sendChannel.addEventListener('bufferedamountlow', (e) => {
    console.log('BufferedAmountLow event:', e);
    sendData();
  });

  startSendingData();
}

function onSendChannelClosed() {
  console.log('Send channel is closed');
  pc1.close();
  pc1 = null;
  console.log('Closed local peer connection');
  maybeReset();
  console.log('Average time spent in send() (ms): ' +
              totalTimeUsedInSend / numberOfSendCalls);
  console.log('Max time spent in send() (ms): ' + maxTimeUsedInSend);
  const spentTime = performance.now() - sendStartTime;
  console.log('Total time spent: ' + spentTime);
  console.log('MBytes/Sec: ' + (bytesToSend / 1000) / spentTime);
}

function onReceiveChannelClosed() {
  console.log('Receive channel is closed');
  pc2.close();
  pc2 = null;
  console.log('Closed remote peer connection');
  maybeReset();
}
