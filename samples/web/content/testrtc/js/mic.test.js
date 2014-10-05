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

WebRTCTest

.testsuite('Microphone', "Checks if microphone works")

.test('MicTest',function(t, h) {
   getUserMedia({audio:true}, function(stream) {
      t.success('getUserMedia succeeded.');
      h.checkTracks(t, h, stream);
      h.checkAudioStart(t, h, stream, h.checkAudioFinish );
  }, function(){
      t.fatal("User disallowed getting user media");
  });
})

.helper('checkTracks', function(t, h, stream) {

  var tracks = stream.getAudioTracks();
  if (tracks.length < 1) {
    t.fatal('No audio track in returned stream.');
    return
  }

  var audioTrack = tracks[0];
  t.success('Audio track exists with label=' + audioTrack.label);
  return true;
})

.helper('checkAudioStart', function(t, h, stream, callback){
  var processFunc = function(event) {
    var sampleRate = event.sampleRate;
    var inputBuffer = event.inputBuffer;
    source.disconnect(scriptNode);
    scriptNode.disconnect(audioContext.destination);
    stream.getAudioTracks()[0].stop();
    callback(t, h, inputBuffer);
  };

  var source = audioContext.createMediaStreamSource(stream);
  var scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
  scriptNode.onaudioprocess = processFunc;
  source.connect(scriptNode);
  scriptNode.connect(audioContext.destination);
})

.helper('checkAudioFinish', function(t, h, buffer) {
  t.success('Audio num channels=' + buffer.numberOfChannels);
  t.success('Audio sample rate=' + buffer.sampleRate);
  var data = buffer.getChannelData(0);
  var sum = 0;
  for (var sample = 0; sample < buffer.length; ++sample) {
    sum += Math.abs(data[sample]);
  }
  var rms = Math.sqrt(sum / buffer.length);
  var db = 20 * Math.log(rms) / Math.log(10);
  t.success('Audio power=' + db);
  t.complete();
})
