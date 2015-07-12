/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var gumAudio = document.querySelector('audio#gumAudio');
var gumVideo = document.querySelector('video#gumVideo');

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
  var audioOutputs = {};
  var i = 0;
  var numAudioOutputs = 0;
  for (i; i !== infos.length; ++i) {
    var info = infos[i];
    if (info.kind === 'audiooutput') {
      ++numAudioOutputs;
      console.log('Audio output device found: ', info);
      audioOutputs[info.deviceId] = info.label ||
        'Audio output ' + numAudioOutputs;
    } else {
      console.log('Device found, not audio output: ', info);
    }
  }
  var selects = document.querySelectorAll('select');
  for (i = 0; i !== selects.length; ++i) {
    selects[i].onchange = selectOutputDevice;
    for (var deviceId in audioOutputs) {
      var option = document.createElement('option');
      option.text = audioOutputs[deviceId];
      option.value = deviceId;
      selects[i].appendChild(option);
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
  console.log('navigator.getUserMedia error: ', error);
}

function selectOutputDevice(event) {
  // each select has a data-media attribute whose value is
  // the ID of the associated media element
  var select = event.target;
  var mediaElement = document.getElementById(select.dataset.media);
  mediaElement.setSinkId(select.value);
  console.log('Set audio output for ' + mediaElement.id +
    ' to ' + select.value);
}

navigator.getUserMedia(constraints, successCallback, errorCallback);

if (!navigator.mediaDevices) {
  alert('This browser does not support navigator.mediaDevices. ' +
    'Cannot select output devices.');
} else {
  getDevices();
}
