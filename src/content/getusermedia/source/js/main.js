/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var videoElement = document.querySelector('video');
var audioInputSelect = document.querySelector('select#audioSource');
var audioOutputSelect = document.querySelector('select#audioOutput');
var videoSelect = document.querySelector('select#videoSource');

function gotSources(sourceInfos) {
  for (var i = 0; i !== sourceInfos.length; ++i) {
    var sourceInfo = sourceInfos[i];
    var option = document.createElement('option');
    option.value = sourceInfo.deviceId;
    if (sourceInfo.kind === 'audioinput') {
      option.text = sourceInfo.label ||
        'microphone ' + (audioInputSelect.length + 1);
      audioInputSelect.appendChild(option);
    } else if (sourceInfo.kind === 'audiooutput') {
      option.text = sourceInfo.label || 'speaker ' +
          (audioOutputSelect.length + 1);
      audioOutputSelect.appendChild(option);
    } else if (sourceInfo.kind === 'videoinput') {
      option.text = sourceInfo.label || 'camera ' + (videoSelect.length + 1);
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', sourceInfo);
    }
  }
}

navigator.mediaDevices.enumerateDevices()
.then(gotSources)
.catch(errorCallback);

function successCallback(stream) {
  window.stream = stream; // make stream available to console
  attachMediaStream(videoElement, stream);
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function changeAudioDestination() {
  var audioDestination = audioOutputSelect.value;
  attachSinkId(videoElement, audioDestination);
}

function start() {
  if (window.stream) {
    window.stream.getTracks().forEach(function(track) { track.stop(); });
  }
  var audioSource = audioInputSelect.value;
  var videoSource = videoSelect.value;
  var constraints = {
    audio: {
      optional: [{
        sourceId: audioSource
      }]
    },
    video: {
      optional: [{
        sourceId: videoSource
      }]
    }
  };
  navigator.getUserMedia(constraints, successCallback, errorCallback);
}

audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;
videoSelect.onchange = start;

start();
