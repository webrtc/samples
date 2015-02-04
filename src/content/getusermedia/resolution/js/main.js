/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var dimensions = document.querySelector('#dimensions');
var video = document.querySelector('video');
var stream;

var vgaButton = document.querySelector('#vga');
var qvgaButton = document.querySelector('#qvga');
var hdButton = document.querySelector('#hd');
var fullHdButton = document.querySelector('#full-hd');

vgaButton.onclick = function() {
  getMedia(vgaConstraints);
};

qvgaButton.onclick = function() {
  getMedia(qvgaConstraints);
};

hdButton.onclick = function() {
  getMedia(hdConstraints);
};

fullHdButton.onclick = function() {
  getMedia(fullHdConstraints);
};

var qvgaConstraints = {
  video: {
    mandatory: {
      minWidth: 320,
      minHeight: 180,
      maxWidth: 320,
      maxHeight: 180
    }
  }
};

var vgaConstraints = {
  video: {
    mandatory: {
      minWidth: 640,
      minHeight: 360,
      maxWidth: 640,
      maxHeight: 360
    }
  }
};

var hdConstraints = {
  video: {
    mandatory: {
      minWidth: 1280,
      minHeight: 720,
      maxWidth: 1280,
      maxHeight: 720
    }
  }
};

var fullHdConstraints = {
  video: {
    mandatory: {
      minWidth: 1920,
      minHeight: 1080,
      maxWidth: 1920,
      maxHeight: 1080
    }
  }
};

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

function successCallback(stream) {
  window.stream = stream; // stream available to console
  video.src = window.URL.createObjectURL(stream);
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function displayVideoDimensions() {
  dimensions.innerHTML = 'Actual video dimensions: ' + video.videoWidth +
    'x' + video.videoHeight + 'px.';
}

video.onplay = function() {
  setTimeout(function() {
    displayVideoDimensions();
  }, 500);
};

function getMedia(constraints) {
  if (stream) {
    video.src = null;
    stream.stop();
  }
  navigator.getUserMedia(constraints, successCallback, errorCallback);
}
