/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
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

var videoblock = document.querySelector('#videoblock');
var messagebox = document.querySelector('#errormessage');

var widthInput = document.querySelector('div#width input');
var widthOutput = document.querySelector('div#width span');

var currentWidth = 0;
var currentHeight = 0;

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
  video: {width: {exact: 1280}, height: {exact: 720}}
};

var fullHdConstraints = {
  video: {width: {exact: 1920}, height: {exact: 1080}}
};

function gotStream(mediaStream) {
  window.stream = mediaStream; // stream available to console
  video.srcObject = mediaStream;
  messagebox.style.display = 'none';
  videoblock.style.display = 'block';
  let track = mediaStream.getVideoTracks()[0];
  let constraints = track.getConstraints();
  console.log('Result constraints: ' + JSON.stringify(constraints));
  if (constraints && constraints.width && constraints.width.exact) {
    widthInput.value = constraints.width.exact;
    widthOutput.textContent = constraints.width.exact;
  } else if (constraints && constraints.width && constraints.width.min) {
    widthInput.value = constraints.width.min;
    widthOutput.textContent = constraints.width.min;
  }
}

function errorMessage(who, what) {
  let message = who + ': ' + what;
  messagebox.innerText = message;
  messagebox.style.display = 'block';
  console.log(message);
}

function clearErrorMessage() {
  messagebox.style.display = 'none';
}

function displayVideoDimensions(whereSeen) {
  if (video.videoWidth) {
    dimensions.innerText = 'Actual video dimensions: ' + video.videoWidth +
      'x' + video.videoHeight + 'px.';
    if (currentWidth !== video.videoWidth
        || currentHeight !== video.videoHeight) {
      console.log(whereSeen + ': ' + dimensions.innerText);
      currentWidth = video.videoWidth;
      currentHeight = video.videoHeight;
    }
  } else {
    dimensions.innerText = 'Video not ready';
  }
}

video.onloadedmetadata = function() {
  displayVideoDimensions('loadedmetadata');
};

video.onresize = function() {
  displayVideoDimensions('resize');
};

function constraintChange(e) {
  widthOutput.textContent = e.target.value;
  let track = window.stream.getVideoTracks()[0];
  let constraints = {width: {exact: e.target.value}};
  clearErrorMessage();
  console.log('applying ' + JSON.stringify(constraints));
  track.applyConstraints(constraints)
    .then(function() {
      console.log('applyConstraint success');
      displayVideoDimensions('applyConstraints');
    })
    .catch(function(err) {
      errorMessage('applyConstraints', err.name);
    });
}

widthInput.onchange = constraintChange;

function getMedia(constraints) {
  if (stream) {
    stream.getTracks().forEach(function(track) {
      track.stop();
    });
  }

  clearErrorMessage();
  videoblock.style.display = 'none';
  navigator.mediaDevices.getUserMedia(constraints)
  .then(gotStream)
  .catch(function(e) {
    errorMessage('getUserMedia', e.name);
  });
}
