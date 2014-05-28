/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
var addButton = document.querySelector('button#add');
var gatherButton = document.querySelector('button#gather');
var output = document.querySelector('textarea#output');
var passwordInput = document.querySelector('input#password');
var removeButton = document.querySelector('button#remove');
var servers = document.querySelector('select#servers');
var urlInput = document.querySelector('input#url');
var usernameInput = document.querySelector('input#username');

addButton.onclick = addServer;
gatherButton.onclick = start;
removeButton.onclick = removeServer;

var begin, pc;

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
  // Create a PeerConnection with no streams, but force a m=audio line.
  // Pass in the STUN/TURN server value from the input boxes.

  output.value = '';
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
  var config = {'iceServers': iceServers };
  var constraints = {'mandatory': {'IceTransports':iceTransports}};
  trace('Creating new PeerConnection with config=' + JSON.stringify(config) +
        ', constraints=' + JSON.stringify(constraints));
  pc = new RTCPeerConnection(config, constraints);
  pc.onicecandidate = iceCallback;
  pc.createOffer(gotDescription, null,
      {'mandatory': {'OfferToReceiveAudio': true}});
}

function gotDescription(desc) {
  begin = window.performance.now();
  pc.setLocalDescription(desc);
}

function iceCallback(event) {
  var elapsed = ((window.performance.now() - begin) / 1000).toFixed(3);
  if (event.candidate) {
    output.value += (elapsed + ': ' + event.candidate.candidate);
  } else {
    output.value += (elapsed + ': Done');
    pc.close();
    pc = null;
  }
}
