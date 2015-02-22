/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var localConnection, remoteConnection, sendChannel, receiveChannel,
  pcConstraint;
var fileInput = document.querySelector('input#fileInput');
fileInput.addEventListener('change', createConnection, false); 

var receiveBuffer = [];
var receivedSize = 0;

function createConnection() {
  var servers = null;
  pcConstraint = null;

  // Add localConnection to global scope to make it visible from the browser console.
  window.localConnection = localConnection = new RTCPeerConnection(servers, pcConstraint);
  trace('Created local peer connection object localConnection');

  sendChannel = localConnection.createDataChannel('sendDataChannel');
  sendChannel.binaryType = 'arraybuffer';
  trace('Created send data channel');

  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;
  localConnection.onicecandidate = iceCallback1;

  localConnection.createOffer(gotDescription1, onCreateSessionDescriptionError);
  // Add remoteConnection to global scope to make it visible from the browser console.
  window.remoteConnection = remoteConnection = new RTCPeerConnection(servers, pcConstraint);
  trace('Created remote peer connection object remoteConnection');

  remoteConnection.onicecandidate = iceCallback2;
  remoteConnection.ondatachannel = receiveChannelCallback;

  fileInput.disabled = true;
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function sendData() {
  var file = fileInput.files[0];
  trace('file is ' + [file.name, file.size, file.type, file.lastModifiedDate].join(' '));
  var chunkSize = 16384;
  var sliceFile = function (offset) {
    var reader = new window.FileReader();
    reader.onload = (function() {
      return function(e) {
        sendChannel.send(e.target.result);
        if (file.size > offset + e.target.result.byteLength) {
          window.setTimeout(sliceFile, 0, offset + chunkSize);
        }
      };
        })(file);
    var slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
    // could update send progress
  };
  sliceFile(0);
}

function closeDataChannels() {
  trace('Closing data channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  receiveChannel.close();
  trace('Closed data channel with label: ' + receiveChannel.label);
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  trace('Closed peer connections');
}

function gotDescription1(desc) {
  localConnection.setLocalDescription(desc);
  trace('Offer from localConnection \n' + desc.sdp);
  remoteConnection.setRemoteDescription(desc);
  remoteConnection.createAnswer(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(desc) {
  remoteConnection.setLocalDescription(desc);
  trace('Answer from remoteConnection \n' + desc.sdp);
  localConnection.setRemoteDescription(desc);
}

function iceCallback1(event) {
  trace('local ice callback');
  if (event.candidate) {
    remoteConnection.addIceCandidate(event.candidate,
        onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event) {
  trace('remote ice callback');
  if (event.candidate) {
    localConnection.addIceCandidate(event.candidate,
        onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function receiveChannelCallback(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(event) {
  trace('Received Message ' + event.data.byteLength);
  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;
  // could update receive progress

  // we are assuming that our signaling protocol told
  // about the expected file size (and name, hash, etc).
  var file = fileInput.files[0];
  if (receivedSize === file.size) {
    var received = new window.Blob(receiveBuffer);
    receiveBuffer = [];

    var href = document.getElementById('received');
    href.href = URL.createObjectURL(received);
    href.download = file.name;
    var text = 'Click to download \'' + file.name + '\' (' + file.size + ' bytes)';
    href.appendChild(document.createTextNode(text));
    href.style.display = 'block';
    closeDataChannels();
  }
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    sendData();
  }
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
