/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */


'use strict';

/* jshint browser: true, camelcase: true, curly: true, devel: true,
eqeqeq: true, forin: false, globalstrict: true, indent:2, quotmark: single,
undef: true, unused: strict */

// variables in global scope are available to console
window.canvas = document.querySelector('canvas');
window.canvas.width = 480;
window.canvas.height = 360;

var button = document.querySelector('button');
button.onclick = function() {
  window.canvas.getContext('2d').
    drawImage(video, 0, 0, window.canvas.width, window.canvas.height);
};

var video = document.querySelector('video');

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

var constraints = {
  audio: false,
  video: true
};

function successCallback(stream) {
  window.stream = stream; // stream available to console
  if (window.URL) {
    video.src = window.URL.createObjectURL(stream);
  } else {
    video.src = stream;
  }
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

navigator.getUserMedia(constraints, successCallback, errorCallback);