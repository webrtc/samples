/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global VideoPipe */

var video1 = document.querySelector('video#video1');
var video2 = document.querySelector('video#video2');

var statusDiv = document.querySelector('div#status');

var startButton = document.querySelector('button#start');
var callButton = document.querySelector('button#call');
var insertRelayButton = document.querySelector('button#insertRelay');
var hangupButton = document.querySelector('button#hangup');

startButton.onclick = start;
callButton.onclick = call;
insertRelayButton.onclick = insertRelay;
hangupButton.onclick = hangup;

var pipes = [];

var localStream;
var remoteStream;

function gotStream(stream) {
  trace('Received local stream');
  attachMediaStream(video1, stream);
  localStream = stream;
  callButton.disabled = false;
}

function gotremoteStream(stream) {
  remoteStream = stream;
  attachMediaStream(video2, stream);
  trace('Received remote stream');
  trace(pipes.length + ' elements in chain');
  statusDiv.textContent = pipes.length + ' elements in chain';
  insertRelayButton.disabled = false;
}

function start() {
  trace('Requesting local stream');
  startButton.disabled = true;
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() failed');
    trace('getUserMedia() error: ', e);
  });
}

function call() {
  callButton.disabled = true;
  insertRelayButton.disabled = false;
  hangupButton.disabled = false;
  trace('Starting call');
  pipes.push(new VideoPipe(localStream, gotremoteStream));
}

function insertRelay() {
  pipes.push(new VideoPipe(remoteStream, gotremoteStream));
  insertRelayButton.disabled = true;
}

function hangup() {
  trace('Ending call');
  while (pipes.length > 0) {
    var pipe = pipes.pop();
    pipe.close();
  }
  insertRelayButton.disabled = true;
  hangupButton.disabled = true;
  callButton.disabled = false;
}
