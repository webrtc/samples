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
  if (this.value <= 0) {
    sendButton.disabled = true;
    errorMessage.innerHTML = '<p>Please enter a number greater than zero.</p>';
  } else {
    errorMessage.innerHTML = '';
    sendButton.disabled = false;
  }
});

function createConnection() {
  sendButton.disabled = true;
  megsToSend.disabled = true;
  const servers = null;

  bytesToSend = Math.round(megsToSend.value) * 1024 * 1024;

  localConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object localConnection');

  const dataChannelParams = {ordered: false};
  if (orderedCheckbox.checked) {
    dataChannelParams.ordered = true;
  }

  sendChannel = localConnection.createDataChannel('sendDataChannel', dataChannelParams);
  sendChannel.binaryType = 'arraybuffer';
  trace('Created send data channel');

  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;
  localConnection.onicecandidate = e => onIceCandidate(localConnection, e);

  localConnection.createOffer().then(gotDescription1, onCreateSessionDescriptionError);

  remoteConnection = remoteConnection = new RTCPeerConnection(servers);
  trace('Created remote peer connection object remoteConnection');

  remoteConnection.onicecandidate = e => onIceCandidate(remoteConnection, e);
  remoteConnection.ondatachannel = receiveChannelCallback;
}

function onCreateSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}`);
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
        return;
      }
      sendProgress.value += chunkSize;
      sendChannel.send(stringToSendRepeatedly);
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
    trace('Using the bufferedamountlow event for flow control');
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
  trace('Closing data channels');
  sendChannel.close();
  trace(`Closed data channel with label: ${sendChannel.label}`);
  receiveChannel.close();
  trace(`Closed data channel with label: ${receiveChannel.label}`);
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  trace('Closed peer connections');
}

function gotDescription1(desc) {
  localConnection.setLocalDescription(desc);
  trace(`Offer from localConnection 
${desc.sdp}`);
  remoteConnection.setRemoteDescription(desc);
  remoteConnection.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  trace(`Answer from remoteConnection\n${desc.sdp}`);
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
  trace(`${getName(pc)} ICE candidate: 
${event.candidate ?
    event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace(`Failed to add Ice Candidate: ${error.toString()}`);
}

function receiveChannelCallback(event) {
  trace('Receive Channel Callback');
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
  trace(`Send channel state is: ${readyState}`);
  if (readyState === 'open') {
    sendGeneratedData();
  }
}
