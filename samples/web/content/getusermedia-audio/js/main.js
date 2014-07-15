/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, indent:2, quotmark: single, undef: true, unused: strict */

'use strict';

// make variables available to console
window.audio = document.querySelector('audio');
window.constraints = {
  audio: true,
  video: false
};
navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function successCallback(stream) {
  var videoTracks = stream.getVideoTracks();
  var audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 1 && videoTracks.length === 0) {
    console.log('Got stream with constraints:', window.constraints);
    console.log('Using audio device: ' + audioTracks[0].label);
    stream.onended = function() {
      console.log('Stream ended');
    };
  }
  window.stream = stream; // make variable available to console
  if (window.URL) {
    window.audio.src = window.URL.createObjectURL(stream);
  } else {
    window.audio.src = stream;
  }
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

navigator.getUserMedia(window.constraints, successCallback, errorCallback);