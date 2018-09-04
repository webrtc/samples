/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';
const CHUNK_SIZE = 16384;
const DATA_STRING = new Array(CHUNK_SIZE).fill('X').join('');

let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
const megsToSend = document.querySelector('input#megsToSend');
const sendButton = document.querySelector('button#sendTheData');
const orderedCheckbox = document.querySelector('input#ordered');
const sendProgress = document.querySelector('progress#sendProgress');
const receiveProgress = document.querySelector('progress#receiveProgress');
const errorMessage = document.querySelector('div#errorMsg');
const transferStatus = document.querySelector('span#transferStatus');

let receivedSize = 0;
let bytesToSend = 0;

sendButton.addEventListener('click', createConnection);

// Prevent data sent to be set to 0.
megsToSend.addEventListener('change', function(e) {
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

  localConnection = new RTCPeerConnection(servers);

  // Let's make a data channel!
  const dataChannelParams = {ordered: false};
  if (orderedCheckbox.checked) {
    dataChannelParams.ordered = true;
  }
  sendChannel = localConnection.createDataChannel('sendDataChannel', dataChannelParams);
  sendChannel.binaryType = 'arraybuffer';
  sendChannel.bufferedAmountLowThreshold = CHUNK_SIZE / 2;
  sendChannel.addEventListener('open', onSendChannelStateChange);
  sendChannel.addEventListener('close', onSendChannelStateChange);
  console.log('Created send data channel: ', sendChannel);

  console.log('Created local peer connection object localConnection: ', localConnection);

  localConnection.addEventListener('icecandidate', e => onIceCandidate(localConnection, e));

  remoteConnection = new RTCPeerConnection(servers);
  remoteConnection.addEventListener('icecandidate', e => onIceCandidate(remoteConnection, e));
  remoteConnection.addEventListener('datachannel', receiveChannelCallback);

  try {
    const localOffer = await localConnection.createOffer();
    await handleLocalDescription(localOffer);
  } catch (e) {
    console.error('Failed to create session description: ', e);
  }

  transferStatus.innerHTML = 'Peer connection setup complete.';
}

function sendData(e) {
  console.log('BufferedAmountLow event:', e);
  if (sendProgress.value < sendProgress.max) {
    transferStatus.innerHTML = 'Sending data...';
    sendChannel.addEventListener('bufferedamountlow', sendData, {once: true});

    // The following is a workaround due to the problem with bufferedamountlow event not being fired on every
    // call to send(), despite the amount of data exceeding the bufferedAmountLowThreshold.
    // If the event would be firing correctly, we could exclude the while loop below.
    let count = 0;
    while (sendProgress.value < sendProgress.max && sendChannel.bufferedAmount < CHUNK_SIZE) {
      sendChannel.send(DATA_STRING);
      sendProgress.value += CHUNK_SIZE;
      count++;
    }

    console.log(`Buffered amount after sending ${count} messages: ${sendChannel.bufferedAmount}`);
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
  sendData();
}

function closeDataChannels() {
  console.log('Closing data channels');
  sendChannel.close();
  console.log(`Closed data channel with label: ${sendChannel.label}`);
  receiveChannel.close();
  console.log(`Closed data channel with label: ${receiveChannel.label}`);
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  console.log('Closed peer connections');
}

async function handleLocalDescription(desc) {
  localConnection.setLocalDescription(desc);
  console.log('Offer from localConnection:\n', desc.sdp);
  remoteConnection.setRemoteDescription(desc);
  try {
    const remoteAnswer = await remoteConnection.createAnswer();
    handleRemoteAnswer(remoteAnswer);
  } catch (e) {
    console.error('Error when creating remote answer: ', e);
  }
}

function handleRemoteAnswer(desc) {
  remoteConnection.setLocalDescription(desc);
  console.log('Answer from remoteConnection:\n', desc.sdp);
  localConnection.setRemoteDescription(desc);
}

function getOtherPc(pc) {
  return (pc === localConnection) ? remoteConnection : localConnection;
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
  receiveChannel.addEventListener('message', onReceiveMessageCallback);
  receivedSize = 0;
}

function onReceiveMessageCallback(event) {
  console.log('Received message!');
  receivedSize += event.data.length;
  receiveProgress.value = receivedSize;

  if (receivedSize === bytesToSend) {
    closeDataChannels();
    sendButton.disabled = false;
    megsToSend.disabled = false;
  }
}

function onSendChannelStateChange() {
  console.log('Send channel state is: ', sendChannel.readyState);
  if (sendChannel.readyState === 'open') {
    startSendingData();
  }
}
