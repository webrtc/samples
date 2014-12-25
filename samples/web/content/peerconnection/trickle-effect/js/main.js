/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var result = document.querySelector('span#result');
var startButton = document.querySelector('button#start');
var addButton = document.querySelector('button#add');
var passwordInput = document.querySelector('input#password');
var removeButton = document.querySelector('button#remove');
var servers = document.querySelector('select#servers');
var urlInput = document.querySelector('input#url');
var usernameInput = document.querySelector('input#username');
var ipv6Check = document.querySelector('input#ipv6');
var unbundleCheck = document.querySelector('input#unbundle');
var trickle = document.querySelector('input#trickle');

startButton.onclick = start;
addButton.onclick = addServer;
removeButton.onclick = removeServer;

var localPeerConnection, remotePeerConnection;
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

var useTrickle = false;
var begin;


function selectServer(event) {
  var option = event.target;
  var value = JSON.parse(option.value);
  urlInput.value = value.url;
  usernameInput.value = value.username || '';
  passwordInput.value = value.credential || '';
}

function addServer() {
  var scheme = urlInput.value.split(':')[0];
  if (scheme !== 'stun' && scheme !== 'turn' && scheme !== 'turns') {
    alert('URI scheme ' + scheme + ' is not valid');
    return;
  }

  // Store the ICE server as a stringified JSON object in option.value.
  var option = document.createElement('option');
  var iceServer = createIceServer(urlInput.value, usernameInput.value, passwordInput.value);
  option.value = JSON.stringify(iceServer);
  option.text = urlInput.value + ' ';
  var username = usernameInput.value;
  var password = passwordInput.value;
  if (username || password) {
    option.text += (' [' + username + ':' + password + ']');
  }
  option.ondblclick = selectServer;
  servers.add(option);
  urlInput.value = usernameInput.value = passwordInput.value = '';
}

function removeServer() {
  for (var i = servers.options.length - 1; i >= 0; --i) {
    if (servers.options[i].selected) {
      servers.remove(i);
    }
  }
}


function start() {
  startButton.disabled = true;
  createPeerConnection();
  useTrickle = trickle.checked;
  createOffer();
}

function createPeerConnection() {
  // Read the values from the input boxes.
  var iceServers = [];
  for (var i = 0; i < servers.length; ++i) {
     iceServers.push(JSON.parse(servers[i].value));
  }
  var transports = document.getElementsByName('transports');
  var iceTransports;
  for (i = 0; i < transports.length; ++i) {
    if (transports[i].checked) {
      iceTransports = transports[i].value;
      break;
    }
  }

  // Create a PeerConnection with no streams, but force a m=audio line.
  // This will gather candidates for either 1 or 2 ICE components, depending
  // on whether the unbundle RTCP checkbox is checked.
  var config = {'iceServers': iceServers };
  var pcConstraints = {'mandatory': {'IceTransports': iceTransports}};
  var offerConstraints = {'mandatory': {'OfferToReceiveAudio': true}};
  // Whether we gather IPv6 candidates.
  pcConstraints.optional = [{'googIPv6': ipv6Check.checked}];

  localPeerConnection = new RTCPeerConnection(config, pcConstraints);
  trace('Created local peer connection object localPeerConnection');
  localPeerConnection.onicecandidate = iceCallback1;
  remotePeerConnection = new RTCPeerConnection(config, pcConstraints);
  trace('Created remote peer connection object remotePeerConnection');
  remotePeerConnection.onicecandidate = iceCallback2;
  remotePeerConnection.onaddstream = gotRemoteStream;

  localPeerConnection.oniceconnectionstatechange = onIceConnectionStateChange;

  sdpConstraints.optional = [{'googUseRtpMUX': unbundleCheck.checked}];
}

function onSetSessionDescriptionSuccess() {
  trace('Set session description success.');
}

function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function createOffer() {
  begin = window.performance.now();
  localPeerConnection.createOffer(setOffer,
    onCreateSessionDescriptionError,
    sdpConstraints);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function setOffer(offer) {
  localPeerConnection.setLocalDescription(offer,
    onSetSessionDescriptionSuccess,
    onSetSessionDescriptionError);
  if (useTrickle) {
    remotePeerConnection.setRemoteDescription(offer,
      createAnswer,
      onSetSessionDescriptionError);
  }
}

function createAnswer() {
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  remotePeerConnection.createAnswer(setAnswer,
    onCreateSessionDescriptionError,
    sdpConstraints);
}

function setAnswer(answer) {
  remotePeerConnection.setLocalDescription(answer,
    onSetSessionDescriptionSuccess,
    onSetSessionDescriptionError);
  if (useTrickle) {
    localPeerConnection.setRemoteDescription(answer,
      onSetSessionDescriptionSuccess,
      onSetSessionDescriptionError);
  }
}

function onIceConnectionStateChange() {
  trace('Transition to ' + localPeerConnection.iceConnectionState);
  switch(localPeerConnection.iceConnectionState) {
    case 'connected':
      result.innerHTML = (window.performance.now() - begin) / 1000.0;
      startButton.disabled = false;
      break;
  }
}

function gotRemoteStream(e) {
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(remoteVideo, e.stream);
  trace('Received remote stream');
}

function iceCallback1(event) {
  if (event.candidate && useTrickle) {
    remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate),
      onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  } else if (!event.candidate && !useTrickle){
    remotePeerConnection.setRemoteDescription(
      localPeerConnection.localDescription,
      createAnswer,
      onSetSessionDescriptionError);
  }
}

function iceCallback2(event) {
  if (event.candidate && useTrickle) {
    localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate),
      onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  } else if (!event.candidate && !useTrickle) {
    localPeerConnection.setRemoteDescription(
      remotePeerConnection.localDescription,
      onSetSessionDescriptionSuccess,
      onSetSessionDescriptionError);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}
