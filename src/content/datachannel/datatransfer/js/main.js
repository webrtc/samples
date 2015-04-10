/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var localConnection;
var remoteConnection;
var sendChannel;
var receiveChannel;
var pcConstraint;
var megsToSend = document.querySelector('input#megsToSend');
var sendButton = document.querySelector('button#sendTheData');
var bitrateDiv = document.querySelector('div#bitrate');
var sendProgress = document.querySelector('progress#sendProgress');
var receiveProgress = document.querySelector('progress#receiveProgress');

var receivedSize = 0;
var bytesToSend = 0;

var bytesPrev = 0;
var timestampPrev = 0;
var timestampStart;
var statsInterval = null;
var bitrateMax = 0;

sendButton.onclick = createConnection;

function createConnection() {
  var servers = null;
  pcConstraint = null;

  bytesToSend = megsToSend.value * 1024 * 1024;

  // Add localConnection to global scope to make it visible from the browser console.
  window.localConnection = localConnection = new RTCPeerConnection(servers,
      pcConstraint);
  trace('Created local peer connection object localConnection');

  sendChannel = localConnection.createDataChannel('sendDataChannel');
  sendChannel.binaryType = 'arraybuffer';
  trace('Created send data channel');

  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;
  localConnection.onicecandidate = iceCallback1;

  localConnection.createOffer(gotDescription1, onCreateSessionDescriptionError);

  // Add remoteConnection to global scope to make it visible from the browser console.
  window.remoteConnection = remoteConnection = new RTCPeerConnection(servers,
      pcConstraint);
  trace('Created remote peer connection object remoteConnection');

  remoteConnection.onicecandidate = iceCallback2;
  remoteConnection.ondatachannel = receiveChannelCallback;
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function randomAsciiString(length) {
  var result = '';
  for (var i = 0; i < length; i++) {
    // Visible ASCII chars are between 33 and 126.
    result += String.fromCharCode(33 + Math.random() * 93);
  }
  return result;
}

function sendGeneratedData() {
  sendProgress.max = bytesToSend;
  receiveProgress.max = sendProgress.max;
  var chunkSize = 16384;
  var stringToSendRepeatedly = randomAsciiString(chunkSize);
  var generateData = function(offset) {
    sendChannel.send(stringToSendRepeatedly);
    if (offset < sendProgress.max) {
      window.setTimeout(generateData, 0, offset + chunkSize);
    }
    sendProgress.value = offset + chunkSize;
  };
  generateData(0);
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
  remoteConnection.createAnswer(gotDescription2,
      onCreateSessionDescriptionError);
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

  receivedSize = 0;
  bitrateMax = 0;
}

function onReceiveMessageCallback(event) {
  receivedSize += event.data.length;
  receiveProgress.value = receivedSize;

  if (receivedSize >= bytesToSend) {
    if (statsInterval) {
      window.clearInterval(statsInterval);
      statsInterval = null;
    }

    closeDataChannels();
  }
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    sendGeneratedData();
  }
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
  if (readyState === 'open') {
    timestampStart = (new Date()).getTime();
    timestampPrev = timestampStart;
    statsInterval = window.setInterval(displayStats, 500);
    window.setTimeout(displayStats, 100);
    window.setTimeout(displayStats, 300);
  }
}

// display bitrate statistics.
function displayStats() {
  var display = function(bitrate) {
    bitrateDiv.innerHTML = '<strong>Current Bitrate:</strong> ' +
        bitrate + ' kbits/sec';
  };

  if (remoteConnection &&
      remoteConnection.iceConnectionState === 'connected') {
    if (webrtcDetectedBrowser === 'chrome') {
      // TODO: once https://code.google.com/p/webrtc/issues/detail?id=4321
      // lands those stats should be preferrred over the connection stats.
      remoteConnection.getStats(function(stats) {
        stats.result().forEach(function(res) {
          if (timestampPrev === res.timestamp) {
            return;
          }
          if (res.type === 'googCandidatePair' &&
              res.stat('googActiveConnection') === 'true') {
            // calculate current bitrate
            var bytesNow = res.stat('bytesReceived');
            var bitrate = Math.round((bytesNow - bytesPrev) * 8 /
                (res.timestamp - timestampPrev));
            display(bitrate);
            timestampPrev = res.timestamp;
            bytesPrev = bytesNow;
            if (bitrate > bitrateMax) {
              bitrateMax = bitrate;
            }
          }
        });
      });
    } else {
      // Firefox currently does not have data channel stats. See
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1136832
      // Instead, the bitrate is calculated based on the number of
      // bytes received.
      var bytesNow = receivedSize;
      var now = (new Date()).getTime();
      var bitrate = Math.round((bytesNow - bytesPrev) * 8 /
          (now - timestampPrev));
      display(bitrate);
      timestampPrev = now;
      bytesPrev = bytesNow;
      if (bitrate > bitrateMax) {
        bitrateMax = bitrate;
      }
    }
  }
}
