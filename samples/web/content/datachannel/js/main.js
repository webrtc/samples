/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var localConnection, remotePeerConnection, sendChannel, receiveChannel,
  pcConstraint, dataConstraint;
var dataChannelSend = document.querySelector('textarea#dataChannelSend');
var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
var sctpSelect = document.querySelector('input#useSctp');
var rtpSelect = document.querySelector('input#useRtp');
var startButton = document.querySelector('button#startButton');
var sendButton = document.querySelector('button#sendButton');
var closeButton = document.querySelector('button#closeButton');

startButton.onclick = createConnection;
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;
rtpSelect.onclick = enableStartButton;
sctpSelect.onclick = enableStartButton;

function enableStartButton() {
  startButton.disabled = false;
}

function disableSendButton() {
  sendButton.disabled = true;
}

rtpSelect.onclick = sctpSelect.onclick = function() {
  dataChannelReceive.value = '';
  dataChannelSend.value = '';
  disableSendButton();
  enableStartButton();
};

function createConnection() {
  dataChannelSend.placeholder = '';
  var servers = null;
  pcConstraint = null;
  dataConstraint = null;
  if (sctpSelect.checked &&
      (webrtcDetectedBrowser === 'chrome' && webrtcDetectedVersion >= 31) ||
      webrtcDetectedBrowser === 'firefox') {
    // SCTP is supported from Chrome M31 and is supported in FF.
    // No need to pass DTLS constraint as it is on by default in Chrome M31.
    // For SCTP, reliable and ordered is true by default.
    trace('Using SCTP-based data channels');
  } else {
    pcConstraint = {
      optional: [{
        RtpDataChannels: true
      }]
    };
    if (!rtpSelect.checked) {
      // Use RTP data channels for Chrome versions older than M31.
      trace('Using RTP-based data channels, ' +
          'as you are on an older version than M31.');
      alert('Reverting to RTP-based data channels, ' +
          'as you are on an older version than M31.');
      rtpSelect.checked = true;
    }
  }
  localConnection = new RTCPeerConnection(servers, pcConstraint);
  trace('Created local peer connection object localConnection');

  try {
    // Data Channel API supported from Chrome M25.
    // You might need to start Chrome with --enable-data-channels flag.
    sendChannel = localConnection.createDataChannel('sendDataChannel', dataConstraint);
    trace('Created send data channel');
  } catch (e) {
    alert('Failed to create data channel. ' +
        'You need Chrome M25 or later with --enable-data-channels flag');
    trace('Create data channel failed with exception: ' + e.message);
  }
  localConnection.onicecandidate = iceCallback1;
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;

  remotePeerConnection = new RTCPeerConnection(servers, pcConstraint);
  trace('Created remote peer connection object remotePeerConnection');

  remotePeerConnection.onicecandidate = iceCallback2;
  remotePeerConnection.ondatachannel = receiveChannelCallback;

  localConnection.createOffer(gotDescription1, onCreateSessionDescriptionError);
  startButton.disabled = true;
  closeButton.disabled = false;
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function sendData() {
  var data = dataChannelSend.value;
  sendChannel.send(data);
  trace('Sent Data: ' + data);
}

function closeDataChannels() {
  trace('Closing data channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  receiveChannel.close();
  trace('Closed data channel with label: ' + receiveChannel.label);
  localConnection.close();
  remotePeerConnection.close();
  localConnection = null;
  remotePeerConnection = null;
  trace('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = '';
  dataChannelReceive.value = '';
  dataChannelSend.disabled = true;
}

function gotDescription1(desc) {
  localConnection.setLocalDescription(desc);
  trace('Offer from localConnection \n' + desc.sdp);
  remotePeerConnection.setRemoteDescription(desc);
  remotePeerConnection.createAnswer(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(desc) {
  remotePeerConnection.setLocalDescription(desc);
  trace('Answer from remotePeerConnection \n' + desc.sdp);
  localConnection.setRemoteDescription(desc);
}

function iceCallback1(event) {
  trace('local ice callback');
  if (event.candidate) {
    remotePeerConnection.addIceCandidate(event.candidate,
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
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(event) {
  trace('Received Message');
  dataChannelReceive.value = event.data;
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
