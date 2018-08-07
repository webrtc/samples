/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

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

let receivedSize = 0;
let bytesToSend = 0;

sendButton.onclick = createConnection;

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

function createConnection() {
  sendButton.disabled = true;
  megsToSend.disabled = true;
  const servers = null;

  const number = Number.parseInt(megsToSend.value);
  bytesToSend = number * 1024 * 1024;

  localConnection = new RTCPeerConnection(servers);
  console.log('Created local peer connection object localConnection');

  const dataChannelParams = {ordered: false};
  if (orderedCheckbox.checked) {
    dataChannelParams.ordered = true;
  }

  sendChannel = localConnection.createDataChannel('sendDataChannel', dataChannelParams);
  sendChannel.binaryType = 'arraybuffer';
  console.log('Created send data channel');

  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;
  localConnection.onicecandidate = e => onIceCandidate(localConnection, e);

  localConnection.createOffer().then(gotDescription1, onCreateSessionDescriptionError);

  remoteConnection = remoteConnection = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object remoteConnection');

  remoteConnection.onicecandidate = e => onIceCandidate(remoteConnection, e);
  remoteConnection.ondatachannel = receiveChannelCallback;
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function randomAsciiString(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    // Visible ASCII chars are between 33 and 126.
    result += String.fromCharCode(33 + Math.random() * 93);
  }
  return result;
}

function sendGeneratedData() {
  const sendAllData = () => {
    // Try to queue up a bunch of data and back off when the channel starts to
    // fill up. We don't setTimeout after each send since this lowers our
    // throughput quite a bit (setTimeout(fn, 0) can take hundreds of milli-
    // seconds to execute).
    while (sendProgress.value < sendProgress.max) {
      if (sendChannel.bufferedAmount > bufferFullThreshold) {
        if (usePolling) {
          setTimeout(sendAllData, 250);
        } else {
          sendChannel.addEventListener('bufferedamountlow', listener);
        }
      } else {
        sendProgress.value += chunkSize;
        sendChannel.send(stringToSendRepeatedly);
      }
    }
  };
  sendProgress.max = bytesToSend;
  receiveProgress.max = sendProgress.max;
  sendProgress.value = 0;
  receiveProgress.value = 0;

  const chunkSize = 16384;
  const stringToSendRepeatedly = randomAsciiString(chunkSize);
  let bufferFullThreshold = 5 * chunkSize;
  let usePolling = true;
  if (typeof sendChannel.bufferedAmountLowThreshold === 'number') {
    console.log('Using the bufferedamountlow event for flow control');
    usePolling = false;

    // Reduce the buffer fullness threshold, since we now have more efficient
    // buffer management.
    bufferFullThreshold = chunkSize / 2;

    // This is "overcontrol": our high and low thresholds are the same.
    sendChannel.bufferedAmountLowThreshold = bufferFullThreshold;
  }
  // Listen for one bufferedamountlow event.
  const listener = () => {
    sendChannel.removeEventListener('bufferedamountlow', listener);
    sendAllData();
  };
  setTimeout(sendAllData, 0);
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

function gotDescription1(desc) {
  localConnection.setLocalDescription(desc);
  console.log(`Offer from localConnection 
${desc.sdp}`);
  remoteConnection.setRemoteDescription(desc);
  remoteConnection.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  console.log(`Answer from remoteConnection\n${desc.sdp}`);
  localConnection.setRemoteDescription(desc);
}

function getOtherPc(pc) {
  return (pc === localConnection) ? remoteConnection : localConnection;
}

function getName(pc) {
  return (pc === localConnection) ? 'localPeerConnection' : 'remotePeerConnection';
}

function onIceCandidate(pc, event) {
  getOtherPc(pc).addIceCandidate(event.candidate)
    .then(
      () => onAddIceCandidateSuccess(pc),
      err => onAddIceCandidateError(pc, err)
    );
  console.log(`${getName(pc)} ICE candidate: 
${event.candidate ?
    event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add Ice Candidate: ${error.toString()}`);
}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;

  receivedSize = 0;
}

function onReceiveMessageCallback(event) {
  receivedSize += event.data.length;
  receiveProgress.value = receivedSize;

  if (receivedSize === bytesToSend) {
    closeDataChannels();
    sendButton.disabled = false;
    megsToSend.disabled = false;
  }
}

function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  console.log(`Send channel state is: ${readyState}`);
  if (readyState === 'open') {
    sendGeneratedData();
  }
}
