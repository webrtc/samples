/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var gumAudio = document.querySelector('audio.gum');
var gumVideo = document.querySelector('video.gum');
var audioOutputSelect = document.querySelector('select#audioOutput');

function gotDevices(deviceInfos) {
  for (var i = 0; i !== deviceInfos.length; ++i) {
    var deviceInfo = deviceInfos[i];
    var option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audiooutput') {
      console.log('Found audio output device: ', deviceInfo);
      option.text = deviceInfo.label || 'speaker ' +
        (audioOutputSelect.length + 1);
      audioOutputSelect.appendChild(option);
    } else {
      console.log('Found device: ', deviceInfo);
    }
  }
}

navigator.mediaDevices.enumerateDevices()
.then(gotDevices)
.catch(errorCallback);

function successCallback(stream) {
  window.stream = stream; // make stream available to console
  attachMediaStream(gumAudio, stream);
  attachMediaStream(gumVideo, stream);
}

function errorCallback(error) {
  console.log('Error: ', error);
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
    .then(function() {
      console.log('Success, audio output device attached: ' + sinkId);
    })
    .catch(function(error) {
      var errorMessage = error;
      if (error.name === 'SecurityError') {
        errorMessage = 'You need to use HTTPS for selecting audio output ' +
            'device: ' + error;
      }
      console.error(errorMessage);
      // Jump back to first output device in the list as it's the default.
      audioOutputSelect.selectedIndex = 0;
    });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination() {
  var audioDestination = audioOutputSelect.value;
  // Changing destination for one source changes destination for all.
  attachSinkId(gumVideo, audioDestination);
}

function start() {
  if (window.stream) {
    window.stream.getTracks().forEach(function(track) { track.stop(); });
  }
  var constraints = {
    audio: true,
    video: true
  };
  navigator.getUserMedia(constraints, successCallback, errorCallback);
}

audioOutputSelect.onchange = changeAudioDestination;

start();
