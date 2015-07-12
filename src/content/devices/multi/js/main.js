/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var gumAudio = document.querySelector('audio.gum');
var gumVideo = document.querySelector('video.gum');

var audioOutputSelect = document.querySelector('select#output');
audioOutputSelect.onchange = changeAudioDestination;

var constraints = window.constraints = {
  audio: true,
  video: true
};

function getDevices() {
  navigator.mediaDevices.enumerateDevices().
    then(gotDevices).
    catch(errorCallback);
}

function gotDevices(infos) {
  for (var i = 0; i !== infos.length; ++i) {
    var info = infos[i];
    var option = document.createElement('option');
    option.value = info.deviceId;
    if (info.kind === 'audiooutput') {
      option.text = info.label || 'Audio output ' +
        (audioOutputSelect.length + 1);
      audioOutputSelect.appendChild(option);
      console.log('Audio output device found: ', info);
    } else {
      console.log('Device found, not audio output: ', info);
    }
  }
}

function successCallback(stream) {
  attachMediaStream(gumAudio, stream);
  attachMediaStream(gumVideo, stream);
  console.log('Got stream with constraints:', constraints);
  var audioTracks = stream.getAudioTracks();
  console.log('Using audio input: ' + audioTracks[0].label);
  var videoTracks = stream.getVideoTracks();
  console.log('Using video input: ' + videoTracks[0].label);
  stream.onended = function() {
    console.log('Stream ended');
  };
  window.stream = stream; // make variable available to browser console
}

function errorCallback(error) {
  console.log('Error: ', error);
}

function changeAudioDestination() {
  // changing destination for one source changes destination for all sources
  attachSinkId(gumAudio, audioOutputSelect.value);
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

navigator.getUserMedia(constraints, successCallback, errorCallback);

if (!navigator.mediaDevices) {
  alert('This browser does not support navigator.mediaDevices. ' +
    'Cannot select output devices.');
} else {
  getDevices();
}
