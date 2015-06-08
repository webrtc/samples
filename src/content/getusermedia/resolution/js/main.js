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
  video: {width: {exact: 320}, height: {exact: 240}}
};

var vgaConstraints = {
  video: {width: {exact: 640}, height: {exact: 480}}
};

var hdConstraints = {
  video: {width: 1280, height: 720}
};

var fullHdConstraints = {
  video: {width: {exact: 1920}, height: {exact: 1080}}
};

function successCallback(stream) {
  window.stream = stream; // stream available to console
  attachMediaStream(video, stream);
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function displayVideoDimensions() {
  if (!video.videoWidth) {
    setTimeout(displayVideoDimensions, 500);
  }
  dimensions.innerHTML = 'Actual video dimensions: ' + video.videoWidth +
    'x' + video.videoHeight + 'px.';
}

video.onloadedmetadata = displayVideoDimensions;

function getMedia(constraints) {
  if (stream) {
    video.src = null;
    stream.stop();
  }
  setTimeout(function() {
    navigator.getUserMedia(constraints, successCallback, errorCallback);
  }, (stream ? 200 : 0));
}
