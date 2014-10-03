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

addTestSuite('MicrophoneTest', micTest);

function micTest() {
  doGetUserMedia({audio:true}, function(stream) {
    if (checkTracks(stream)) {
      checkAudioStart(stream);
    }
  });
}

function checkTracks(stream) {
  reportSuccess('getUserMedia succeeded.');
  var tracks = stream.getAudioTracks();
  if (tracks.length < 1) {
    return reportFatal('No audio track in returned stream.');
  }
  var audioTrack = tracks[0];
  reportSuccess('Audio track exists with label=' + audioTrack.label);
  return true;
}

// Analyze one buffer of audio.
function checkAudioStart(stream) {
  var processFunc = function(event) {
    var sampleRate = event.sampleRate;
    var inputBuffer = event.inputBuffer;
    source.disconnect(scriptNode); 
    scriptNode.disconnect(audioContext.destination);
    stream.getAudioTracks()[0].stop();
    checkAudioFinish(inputBuffer);
  };

  var source = audioContext.createMediaStreamSource(stream);
  var scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
  scriptNode.onaudioprocess = processFunc;
  source.connect(scriptNode);
  scriptNode.connect(audioContext.destination);
}

function checkAudioFinish(buffer) {
  reportSuccess('Audio num channels=' + buffer.numberOfChannels);
  reportSuccess('Audio sample rate=' + buffer.sampleRate);
  var data = buffer.getChannelData(0);
  var sum = 0;
  for (var sample = 0; sample < buffer.length; ++sample) {
    sum += Math.abs(data[sample]);
  }
  var rms = Math.sqrt(sum / buffer.length);
  var db = 20 * Math.log(rms) / Math.log(10);
  reportSuccess('Audio power=' + db);
  testSuiteFinished();
}
