/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, quotmark: single, undef: true, unused: strict */

'use strict';

var output = document.getElementById('output');

function start() {
  output.value = "";
  doGetUserMedia({audio:true}, micTest);
}

function reportSuccess(str) {
  reportMessage("[  OK  ] ", str);
}
function reportError(str) {
  reportMessage("[FAILED] ", str);
}
function reportMessage(prefix, str) {
  output.value += prefix + str + '\n';
}

function doGetUserMedia(constraints, onSuccess) {
  // Call into getUserMedia via the polyfill (adapter.js).
  var successFunc = function(stream) {
    trace('User has granted access to local media.');
    onSuccess(stream);
  }
  var failFunc = function(error) {
    var errorMessage = 'Failed to get access to local media. Error name was ' +
      error.name;
    reportError(errorMessage);
  }
  try {
    getUserMedia(constraints, successFunc, failFunc);
    trace('Requested access to local media with constraints:\n' +
        '  \'' + JSON.stringify(constraints) + '\'');
  } catch (e) {
    reportError('getUserMedia failed with exception: ' + e.message);
  }
}

function micTest(stream) {
  reportSuccess("getUserMedia succeeded.");
  var tracks = stream.getAudioTracks();
  if (tracks.length < 1) {
    reportError("No audio track in returned stream.");
    return;
  }
  var audioTrack = tracks[0];
  reportSuccess("Audio track exists with label=" + audioTrack.label);

  checkAudio(stream);
}

// Analyze one buffer of audio.
function checkAudio(stream) {
  var processFunc = function(event) {
    var sampleRate = event.sampleRate;
    var inputBuffer = event.inputBuffer;
    source.disconnect(scriptNode); 
    scriptNode.disconnect(audioContext.destination);
    checkAudioDone(inputBuffer);
  };

  var audioContext = new AudioContext();
  var source = audioContext.createMediaStreamSource(stream);
  var scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
  scriptNode.onaudioprocess = processFunc;
  source.connect(scriptNode);
  scriptNode.connect(audioContext.destination);
}

function checkAudioDone(buffer) {
  reportSuccess("Audio num channels=" + buffer.numberOfChannels);
  reportSuccess("Audio sample rate=" + buffer.sampleRate);
  var data = buffer.getChannelData(0);
  var sum = 0;
  for (var sample = 0; sample < buffer.length; ++sample) {
    sum += Math.abs(data[sample]);
  }
  var rms = Math.sqrt(sum / buffer.length);
  var db = 20 * Math.log(rms) / Math.log(10);
  reportSuccess("Audio power=" + db);
}


