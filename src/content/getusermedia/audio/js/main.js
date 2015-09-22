/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

// Put variables in global scope to make them available to the browser console.
var audio = document.querySelector('audio');
var constraints = window.constraints = {
  audio: true,
  video: false
};

function successCallback(stream) {
  var audioTracks = stream.getAudioTracks();
  console.log('Got stream with constraints:', constraints);
  console.log('Using audio device: ' + audioTracks[0].label);
  stream.onended = function() {
    console.log('Stream ended');
  };
  window.stream = stream; // make variable available to browser console
  audio.srcObject = stream;
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

navigator.getUserMedia(constraints, successCallback, errorCallback);
