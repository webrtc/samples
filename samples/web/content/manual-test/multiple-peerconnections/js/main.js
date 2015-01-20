// Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.

// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file in the root of the source
// tree. An additional intellectual property rights grant can be found
// in the file PATENTS.  All contributing project authors may
// be found in the AUTHORS file in the root of the source tree.

// This file can create an arbitrary number of peer connection calls, each
// with an arbitrary number of auto-echoing data channels. It can run with
// two separate cameras.

/* exported call */

'use strict';

// Local stream array.
var gLocalStreams = [];

// The number of remote view windows (2x number of calls).
var gNumRemoteViews = 0;

// Maps connection id -> { connection1, connection2 }.
var gAllConnections = [];
var gNumConnections = 0;

// Maps data channel id -> sending channel.
// Note: there can be many data channels per connection id.
var gSendingDataChannels = [];
var gTotalNumSendChannels = 0;

var videoDeviceList = [];

window.onload = function() {
  getSources_();
  // startTest_();
};

function getSources_() {
  if (typeof MediaStreamTrack.getSources === 'undefined') {
    console.log('Your browser does not support getSources, one camera will ' +
                'be used.');
    return;
  }
  MediaStreamTrack.getSources(function(devices) {
    var requestId = 1;
    for (var i = 0; i < devices.length; i++) {
      if (devices[i].kind === 'video') {
        videoDeviceList[i] = devices[i];
        startTest_(videoDeviceList[i].id, requestId );
        requestId++;
      }
    }
  });
}

// Use source ID to selected two different cameras and
function startTest_(sourceId, nbr) {
  console.log('here', nbr);
  // Limit to two cameras only.
  if (nbr > 3) {
    console.log('leave');
    return;
  }
  getUserMedia( {
    video: { optional: [ { sourceId: sourceId } ] },
    audio: true },
    function(localStream) {
      gLocalStreams.push(localStream);
      play_(localStream, 'local-view-' + nbr );
    },
    getUserMediaFailedCallback_);
}

function playStreamInNewRemoteView_(stream, peerNumber) {
  console.log('Remote stream to connection ' + peerNumber +
      ': ' + stream.label);
  gNumRemoteViews++;
  var viewName = 'remote-view-' + gNumRemoteViews;
  addRemoteView_(viewName, peerNumber);
  play_(stream, viewName);
}

function addRemoteView_(elementName, peerNumber) {
  var remoteViews = document.getElementById('remote-views-' + peerNumber);
  remoteViews.innerHTML +=
    '<tr><td><video width="320" height="240" id="' + elementName + '" ' +
    'autoplay="autoplay"></video></td></tr>';
}

function play_(stream, videoElement) {
  var streamUrl = URL.createObjectURL(stream);
  document.getElementById(videoElement).src = streamUrl;
}

function getUserMediaFailedCallback_(error) {
  console.log('getUserMedia request failed with code ' + error.code);
}

function call() {
  var connection1 = new RTCPeerConnection(null,
      {optional:[{RtpDataChannels: true}]});
  connection1.addStream(gLocalStreams[0]);

  var connection2 = new RTCPeerConnection(
      null, {optional:[{RtpDataChannels: true}]});
  connection2.addStream(gLocalStreams[1]);
  connection2.onicecandidate = function(event) {
    if (event.candidate) {
      var candidate = new RTCIceCandidate(event.candidate);
      connection1.addIceCandidate(candidate);
    }
  };
  connection1.onicecandidate = function(event) {
    if (event.candidate) {
      console.log('Ice candidate: ' + event.candidate);
      var candidate = new RTCIceCandidate(event.candidate);
      connection2.addIceCandidate(candidate);
    }
  };
  connection1.onaddstream = function(event) {
    playStreamInNewRemoteView_(event.stream, 1);
    addDataChannelAnchor_(connection1, connection2);
  };
  connection2.onaddstream = function(event) {
    playStreamInNewRemoteView_(event.stream, 2);
  };
  negotiate_(connection1, connection2);
  addDataChannelAnchor_(connection1, connection2);
}

function negotiate_(connection1, connection2) {
  connection1.createOffer(function(offer) {
    connection1.setLocalDescription(offer);
    connection2.setRemoteDescription(offer);
    connection2.createAnswer(function(answer) {
      console.log('Created answer ' + answer);
      connection2.setLocalDescription(answer);
      connection1.setRemoteDescription(answer);
    });
  });
}

function addDataChannelAnchor_(connection1, connection2) {
  var connectionId = gNumConnections++;
  gAllConnections[connectionId] = { connection1: connection1,
                                    connection2: connection2 };
  addOneAnchor_(1, connectionId);
  addOneAnchor_(2, connectionId);
}

function makeDataChannelAnchorName_(peerId, connectionId) {
  return 'data-channels-peer' + peerId + '-' + connectionId;
}

// This adds a target table we'll add our input fields to later.
function addOneAnchor_(peerId, connectionId) {
  var newButtonId = 'add-data-channel-' + connectionId;
  var remoteViewContainer = 'remote-views-' + peerId;
  document.getElementById(remoteViewContainer).innerHTML +=
    '<tr><td><button id="' + newButtonId + '" ' +
    'onclick="addDataChannel(' + connectionId + ')"> ' +
    'Add Echoing Data Channel</button></td></tr>';

  var anchorName = makeDataChannelAnchorName_(peerId, connectionId);
  document.getElementById(remoteViewContainer).innerHTML +=
    '<tr><td><table id="' + anchorName + '"></table></td></tr>';
}

function addDataChannel(connectionId) {
  var dataChannelId = gTotalNumSendChannels++;

  var peer1SinkId = addDataChannelSink_(1, connectionId, dataChannelId);
  var peer2SinkId = addDataChannelSink_(2, connectionId, dataChannelId);
  var connections = gAllConnections[connectionId];

  configureChannels_(connections.connection1, connections.connection2,
                    peer1SinkId, peer2SinkId, dataChannelId);

  // Add the field the user types in, and a dummy field so everything lines up
  // nicely.
  addDataChannelSource_(1, connectionId, dataChannelId);
  addDisabledInputField_(2, connectionId, '(the above is echoed)');

  negotiate_(connections.connection1, connections.connection2);
}

function configureChannels_(connection1, connection2, targetFor1, targetFor2,
                            dataChannelId) {
  // Label the channel so we know where to send the data later in dispatch.
  var sendChannel = connection1.createDataChannel(
      targetFor2, { reliable : false });
  sendChannel.onmessage = function(messageEvent) {
    document.getElementById(targetFor1).value = messageEvent.data;
  };

  gSendingDataChannels[dataChannelId] = sendChannel;

  connection2.ondatachannel = function(event) {
    // The channel got created by a message from a sending channel: hook this
    // new receiver channel up to dispatch and then echo any messages.
    event.channel.onmessage = dispatchAndEchoDataMessage_;
  };
}

function addDataChannelSink_(peerNumber, connectionId, dataChannelId) {
  var sinkId = 'data-sink-peer' + peerNumber + '-' + dataChannelId;
  var anchor = document.getElementById(makeDataChannelAnchorName_(peerNumber,
      connectionId));
  anchor.innerHTML +=
    '<tr><td><input type="text" id="' + sinkId + '" disabled/></td></tr>';
  return sinkId;
}

function addDataChannelSource_(peerNumber, connectionId, dataChannelId) {
  var sourceId = 'data-source-peer' + peerNumber + '-' + dataChannelId;
  var anchor = document.getElementById(makeDataChannelAnchorName_(peerNumber,
       connectionId));
  anchor.innerHTML +=
    '<tr><td><input type="text" id="' + sourceId + '"' +
    ' onchange="userWroteSomethingIn_(\'' + sourceId + '\', ' +
    dataChannelId + ');"/></td></tr>';
}

function userWroteSomethingIn_(sourceId, dataChannelId) {
  var source = document.getElementById(sourceId);
  var dataChannel = gSendingDataChannels[dataChannelId];
  dataChannel.send(source.value);
}

function addDisabledInputField_(peerNumber, connectionId, text) {
  var anchor = document.getElementById(makeDataChannelAnchorName_(peerNumber,
      connectionId));
  anchor.innerHTML +=
    '<tr><td><input type="text" value="' + text + '" disabled/></td></tr>';
}

function dispatchAndEchoDataMessage_(messageEvent) {
  // Since we labeled the channel earlier, we know to which input element
  // we should send the data.
  var dataChannel = messageEvent.currentTarget;
  var targetInput = document.getElementById(dataChannel.label);
  targetInput.value = messageEvent.data;
  dataChannel.send('echo: ' + messageEvent.data);
}
