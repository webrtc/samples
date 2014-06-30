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

var snapshotButton = document.querySelector('button#snapshot');
var filterButton = document.querySelector('button#filter');
window.video = document.querySelector('video');

window.canvas = document.querySelector('canvas');
window.canvas.width = 480;
window.canvas.height = 360;

var filters = ['blur', 'grayscale', 'invert', 'sepia'];

snapshotButton.onclick = function snap() {
  window.canvas.getContext('2d').drawImage(window.video, 0, 0, window.canvas.width,
    window.canvas.height);
};

filterButton.onclick = function() {
  var newIndex = (filters.indexOf(window.canvas.className) + 1) % filters.length;
  window.video.className = filters[newIndex];
  window.canvas.className = filters[newIndex];
};

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

var constraints = {
  audio: false,
  video: true
};

function successCallback(stream) {
  window.stream = stream; // stream available to console
  if (window.URL) {
    window.video.src = window.URL.createObjectURL(stream);
  } else {
    window.video.src = stream;
  }
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

navigator.getUserMedia(constraints, successCallback, errorCallback);