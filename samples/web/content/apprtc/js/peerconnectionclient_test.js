/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals TestCase, assertEquals, assertNotNull, assertTrue, assertFalse,
   PeerConnectionClient */

'use strict';

var FAKEPCCONFIG = {
  'bar': 'foo'
};
var FAKEPCCONSTRAINTS = {
  'foo': 'bar'
};

var peerConnections = [];
var MockRTCPeerConnection = function(config, constraints) {
  this.config = config;
  this.constraints = constraints;
  this.streams = [];
  this.createSdpRequests = [];
  this.localDescriptions = [];
  this.remoteDescriptions = [];
  this.remoteIceCandidates = [];
  this.signalingState = 'stable';

  peerConnections.push(this);
};
MockRTCPeerConnection.prototype.addStream = function(stream) {
  this.streams.push(stream);
};
MockRTCPeerConnection.prototype.createOffer =
    function(callback, errback, constraints) {
  this.createSdpRequests.push({
    type: 'offer',
    callback: callback,
    errback: errback,
    constraints: constraints
  });
};
MockRTCPeerConnection.prototype.createAnswer =
    function(callback, errback, constraints) {
  this.createSdpRequests.push({
    type: 'answer',
    callback: callback,
    errback: errback,
    constraints: constraints
  });
};
MockRTCPeerConnection.prototype.resolveLastCreateSdpRequest = function(sdp) {
  var request = this.createSdpRequests.pop();
  assertNotNull(request);

  if (sdp) {
    request.callback({
      'type': request.type,
      'sdp': sdp
    });
  } else {
    request.errback(Error('MockCreateSdpError'));
  }
};
MockRTCPeerConnection.prototype.setLocalDescription =
    function(localDescription, callback, errback) {
  if (localDescription.type === 'offer') {
    this.signalingState = 'have-local-offer';
  } else {
    this.signalingState = 'stable';
  }
  this.localDescriptions.push({
    description: localDescription,
    callback: callback,
    errback: errback
  });
};
MockRTCPeerConnection.prototype.setRemoteDescription =
    function(remoteDescription, callback, errback) {
  if (remoteDescription.type === 'offer') {
    this.signalingState = 'have-remote-offer';
  } else {
    this.signalingState = 'stable';
  }
  this.remoteDescriptions.push({
    description: remoteDescription,
    callback: callback,
    errback: errback
  });
};
MockRTCPeerConnection.prototype.addIceCandidate = function(candidate) {
  this.remoteIceCandidates.push(candidate);
};
MockRTCPeerConnection.prototype.close = function() {
  this.signalingState = 'closed';
};
MockRTCPeerConnection.prototype.getRemoteStreams = function() {
  return [{
    getVideoTracks: function() { return ['track']; }
  }];
};

function getParams(pcConfig, pcConstraints) {
  return {
    'peerConnectionConfig': pcConfig,
    'peerConnectionConstraints': pcConstraints
  };
}

var PeerConnectionClientTest = new TestCase('PeerConnectionClientTest');

PeerConnectionClientTest.prototype.setUp = function() {
  window.params = {};

  this.readlRTCPeerConnection = RTCPeerConnection;
  RTCPeerConnection = MockRTCPeerConnection;

  peerConnections.length = 0;
  this.pcClient = new PeerConnectionClient(
      getParams(FAKEPCCONFIG, FAKEPCCONSTRAINTS), window.performance.now());
};

PeerConnectionClientTest.prototype.tearDown = function() {
  RTCPeerConnection = this.readlRTCPeerConnection;
};

PeerConnectionClientTest.prototype.testConstructor = function() {
  assertEquals(1, peerConnections.length);
  assertEquals(FAKEPCCONFIG, peerConnections[0].config);
  assertEquals(FAKEPCCONSTRAINTS, peerConnections[0].constraints);
};

PeerConnectionClientTest.prototype.testAddStream = function() {
  var stream = {'foo': 'bar'};
  this.pcClient.addStream(stream);
  assertEquals(1, peerConnections[0].streams.length);
  assertEquals(stream, peerConnections[0].streams[0]);
};

PeerConnectionClientTest.prototype.testStartAsCaller = function() {
  var signalingMsgs = [];
  function onSignalingMessage(msg) {
    signalingMsgs.push(msg);
  }

  this.pcClient.onsignalingmessage = onSignalingMessage;
  assertTrue(this.pcClient.startAsCaller(null));

  assertEquals(1, peerConnections[0].createSdpRequests.length);
  var request = peerConnections[0].createSdpRequests[0];
  assertEquals('offer', request.type);

  var fakeSdp = 'fake sdp';
  peerConnections[0].resolveLastCreateSdpRequest(fakeSdp);

  // Verify the input to setLocalDesciption.
  assertEquals(1, peerConnections[0].localDescriptions.length);
  assertEquals('offer',
               peerConnections[0].localDescriptions[0].description.type);
  assertEquals(fakeSdp,
               peerConnections[0].localDescriptions[0].description.sdp);

  // Verify the output signaling message for the offer.
  assertEquals(1, signalingMsgs.length);
  assertEquals('offer', signalingMsgs[0].type);
  assertEquals(fakeSdp, signalingMsgs[0].sdp);

  // Verify the output signaling messages for the ICE candidates.
  signalingMsgs.length = 0;
  var fakeCandidate = 'fake candidate';
  var event = {
    candidate: {
      sdpMLineIndex: '0',
      sdpMid: '1',
      candidate: fakeCandidate
    }
  };
  var expectedMessage = {
    type: 'candidate',
    label: event.candidate.sdpMLineIndex,
    id: event.candidate.sdpMid,
    candidate: event.candidate.candidate
  };
  peerConnections[0].onicecandidate(event);
  assertEquals(1, signalingMsgs.length);
  assertEquals(expectedMessage, signalingMsgs[0]);
};

PeerConnectionClientTest.prototype.testCallerReceiveSignalingMessage =
    function() {
  this.pcClient.startAsCaller(null);
  peerConnections[0].resolveLastCreateSdpRequest('fake offer');
  var remoteAnswer = {
    type: 'answer',
    sdp: 'fake answer'
  };

  var pc = peerConnections[0];

  this.pcClient.receiveSignalingMessage(JSON.stringify(remoteAnswer));
  assertEquals(1, pc.remoteDescriptions.length);
  assertEquals('answer', pc.remoteDescriptions[0].description.type);
  assertEquals(remoteAnswer.sdp, pc.remoteDescriptions[0].description.sdp);

  var candidate = {
    type: 'candidate',
    label: '0',
    candidate: 'fake candidate'
  };
  this.pcClient.receiveSignalingMessage(JSON.stringify(candidate));
  assertEquals(1, pc.remoteIceCandidates.length);
  assertEquals(candidate.label, pc.remoteIceCandidates[0].sdpMLineIndex);
  assertEquals(candidate.candidate, pc.remoteIceCandidates[0].candidate);
};

PeerConnectionClientTest.prototype.testStartAsCallee = function() {
  var remoteOffer = {
    type: 'offer',
    sdp: 'fake sdp'
  };
  var candidate = {
    type: 'candidate',
    label: '0',
    candidate: 'fake candidate'
  };
  var initialMsgs = [
    JSON.stringify(candidate),
    JSON.stringify(remoteOffer)
  ];
  this.pcClient.startAsCallee(initialMsgs);

  var pc = peerConnections[0];

  // Verify that remote offer and ICE candidates are set.
  assertEquals(1, pc.remoteDescriptions.length);
  assertEquals('offer', pc.remoteDescriptions[0].description.type);
  assertEquals(remoteOffer.sdp, pc.remoteDescriptions[0].description.sdp);
  assertEquals(1, pc.remoteIceCandidates.length);
  assertEquals(candidate.label, pc.remoteIceCandidates[0].sdpMLineIndex);
  assertEquals(candidate.candidate, pc.remoteIceCandidates[0].candidate);

  // Verify that createAnswer is called.
  assertEquals(1, pc.createSdpRequests.length);
  assertEquals('answer', pc.createSdpRequests[0].type);

  var fakeAnswer = 'fake answer';
  pc.resolveLastCreateSdpRequest(fakeAnswer);

  // Verify that setLocalDescription is called.
  assertEquals(1, pc.localDescriptions.length);
  assertEquals('answer', pc.localDescriptions[0].description.type);
  assertEquals(fakeAnswer, pc.localDescriptions[0].description.sdp);
};

PeerConnectionClient.prototype.testReceiveRemoteOfferBeforeStarted =
    function() {
  var remoteOffer = {
    type: 'offer',
    sdp: 'fake sdp'
  };
  this.pcClient.receiveSignalingMessage(JSON.stringify(remoteOffer));
  this.pcClient.startAsCallee(null);

  // Verify that the offer received before started is processed.
  var pc = peerConnections[0];
  assertEquals(1, pc.remoteDescriptions.length);
  assertEquals('offer', pc.remoteDescriptions[0].description.type);
  assertEquals(remoteOffer.sdp, pc.remoteDescriptions[0].description.sdp);
};

PeerConnectionClientTest.prototype.testRemoteHangup = function() {
  var remoteHangup = false;
  this.pcClient.onremotehangup = function() {
    remoteHangup = true;
  };
  this.pcClient.receiveSignalingMessage(JSON.stringify({
    type: 'bye'
  }));
  assertTrue(remoteHangup);
};

PeerConnectionClientTest.prototype.testOnRemoteSdpSet = function() {
  var hasRemoteTrack = false;
  function onRemoteSdpSet(result) {
    hasRemoteTrack = result;
  }
  this.pcClient.onremotesdpset = onRemoteSdpSet;

  var remoteOffer = {
    type: 'offer',
    sdp: 'fake sdp'
  };
  var initialMsgs = [JSON.stringify(remoteOffer)];
  this.pcClient.startAsCallee(initialMsgs);

  var callback = peerConnections[0].remoteDescriptions[0].callback;
  assertNotNull(callback);
  callback();
  assertTrue(hasRemoteTrack);
};

PeerConnectionClientTest.prototype.testOnRemoteStreamAdded = function() {
  var stream = null;
  function onRemoteStreamAdded(s) {
    stream = s;
  }
  this.pcClient.onremotestreamadded = onRemoteStreamAdded;

  var event = {
    stream: 'stream'
  };
  peerConnections[0].onaddstream(event);
  assertEquals(event.stream, stream);
};

PeerConnectionClientTest.prototype.testOnSignalingStateChange = function() {
  var called = false;
  function callback() {
    called = true;
  }
  this.pcClient.onsignalingstatechange = callback;
  peerConnections[0].onsignalingstatechange();
  assertTrue(called);
};

PeerConnectionClientTest.prototype.testOnIceConnectionStateChange = function() {
  var called = false;
  function callback() {
    called = true;
  }
  this.pcClient.oniceconnectionstatechange = callback;
  peerConnections[0].oniceconnectionstatechange();
  assertTrue(called);
};

PeerConnectionClientTest.prototype.testStartAsCallerTwiceFailed = function() {
  assertTrue(this.pcClient.startAsCaller(null));
  assertFalse(this.pcClient.startAsCaller(null));
};

PeerConnectionClientTest.prototype.testStartAsCalleeTwiceFailed = function() {
  assertTrue(this.pcClient.startAsCallee(null));
  assertFalse(this.pcClient.startAsCallee(null));
};

PeerConnectionClientTest.prototype.testClose = function() {
  this.pcClient.close();
  assertEquals('closed', peerConnections[0].signalingState);
};
