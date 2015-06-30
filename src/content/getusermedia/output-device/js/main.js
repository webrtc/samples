/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var gumVideo = document.querySelector('video#gumVideo');
var localVideo = document.querySelector('video#localVideo');
var localAudio = document.querySelector('audio#localAudio');

var audioSelect = document.querySelector('select#output');
audioSelect.onchange = selectOutputDevice;

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
      option.text = info.label || 'Audio output ' + (audioSelect.length + 1);
      audioSelect.appendChild(option);
      console.log('Audio output device found: ', info);
    } else {
      console.log('Device found, not audio output: ', info);
    }
  }
}

function successCallback(stream) {
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
  console.log('navigator.getUserMedia error: ', error);
}

function selectOutputDevice() {
  gumVideo.setSinkId(audioSelect.value);
  localVideo.setSinkId(audioSelect.value);
  localAudio.setSinkId(audioSelect.value);
  console.log('Set audio output to ' + audioSelect.value);
}

navigator.getUserMedia(constraints, successCallback, errorCallback);

if (!navigator.mediaDevices) {
  alert('This browser does not support navigator.mediaDevices. ' +
    'Cannot select output devices.');
} else {
  getDevices();
}
