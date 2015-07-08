/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var videoElement = document.querySelector('video');
var audioSelect = document.querySelector('select#audioSource');
var videoSelect = document.querySelector('select#videoSource');

function gotSources(sourceInfos) {
  for (var i = 0; i !== sourceInfos.length; ++i) {
    var sourceInfo = sourceInfos[i];
    var option = document.createElement('option');
    option.value = sourceInfo.deviceId;
    if (sourceInfo.kind === 'audioinput') {
      option.text = sourceInfo.label ||
        'microphone ' + (audioSelect.length + 1);
      audioSelect.appendChild(option);
    } else if (sourceInfo.kind === 'videoinput') {
      option.text = sourceInfo.label || 'camera ' + (videoSelect.length + 1);
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source: ', sourceInfo);
    }
  }
}

if (!navigator.mediaDevices) {
  alert('This browser does not support navigator.mediaDevices.');
} else {
  navigator.mediaDevices.enumerateDevices()
  .then(gotSources)
  .catch(errorCallback);
}

function successCallback(stream) {
  window.stream = stream; // make stream available to console
  attachMediaStream(videoElement, stream);
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function start() {
  if (window.stream) {
    attachMediaStream(videoElement, null);
    window.stream.getTracks().forEach(function(track) { track.stop(); });
  }
  var audioSource = audioSelect.value;
  var videoSource = videoSelect.value;
  var constraints = {
    audio: { deviceId: audioSource },
    video: { deviceId: videoSource }
  };
  navigator.getUserMedia(constraints, successCallback, errorCallback);
}

audioSelect.onchange = start;
videoSelect.onchange = start;

start();
