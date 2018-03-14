/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* global AudioContext, SoundMeter */

'use strict';

// For WASM
var Module = {
  locateFile: function(name) {
    return 'js/' + name;
  },
  onRuntimeInitialized: function() {
    navigator.mediaDevices.getUserMedia(constraints).
      then(handleSuccess).catch(handleError);
 
  },
};

var instantMeter = document.querySelector('#instant meter');
var slowMeter = document.querySelector('#slow meter');
var wasmMeter = document.querySelector('#wasm meter');

var instantValueDisplay = document.querySelector('#instant .value');
var slowValueDisplay = document.querySelector('#slow .value');
var wasmValueDisplay = document.querySelector('#wasm .value');

try {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  window.audioContext = new AudioContext();
} catch (e) {
  alert('Web Audio API not supported.');
}

// Put variables in global scope to make them available to the browser console.
var constraints = window.constraints = {
  audio: true,
  video: false
};

function handleSuccess(stream) {
  // Put variables in global scope to make them available to the
  // browser console.
  window.stream = stream;
  var soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
  soundMeter.connectToSource(stream, function(e) {
    if (e) {
      alert(e);
      return;
    }
    setInterval(function() {
      instantMeter.value = instantValueDisplay.innerText =
          soundMeter.instant.toFixed(2);
      slowMeter.value = slowValueDisplay.innerText =
          soundMeter.slow.toFixed(2);
    }, 200);
  });
  var wasmSoundMeter = window.wasmSoundMeter = new WasmSoundMeter(window.audioContext);
  wasmSoundMeter.connectToSource(stream, function(e) {
    if (e) {
      alert(e);
      return;
    }
    setInterval(function() {
      wasmMeter.value = wasmValueDisplay.innerText =
        wasmSoundMeter.instant.toFixed(2);
    }, 200);
  });
}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

