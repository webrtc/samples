/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

addTest('Microphone', 'Audio capture', function() {
  var test = new MicTest();
  test.run();
});

function MicTest() {
  this.inputChannels = 6;
  this.outputChannels = 1;
  this.lowVolumeThreshold = -60;
  this.bufferSize = 4096;
  this.activeChannels = [];
}

MicTest.prototype = {
  run: function() {
    doGetUserMedia({audio:true}, this.gotStream.bind(this));
  },

  gotStream: function(stream) {
    if (!this.checkAudioTracks(stream)) {
      testFinished();
      return;
    }
    this.createAudioBuffer(stream);
  },

  checkAudioTracks: function(stream) {
    this.stream = stream;
    var audioTracks = stream.getAudioTracks();
    if (audioTracks.length < 1) {
      return reportFatal('No audio track in returned stream.');
    }
    reportSuccess('Audio track exists with label=' + audioTracks[0].label);
    return true;
  },

  createAudioBuffer: function() {
    this.audioSource = audioContext.createMediaStreamSource(this.stream);
    this.scriptNode = audioContext.createScriptProcessor(this.bufferSize, 
        this.inputChannels, this.outputChannels);
    this.audioSource.connect(this.scriptNode);
    this.scriptNode.connect(audioContext.destination);
    this.scriptNode.onaudioprocess = this.processAudio.bind(this);
  },

  processAudio: function(event) {
    var inputBuffer = event.inputBuffer;
    this.inputBuffer = inputBuffer;
    this.stream.stop();
    this.audioSource.disconnect(this.scriptNode);
    this.scriptNode.disconnect(audioContext.destination);
    // Start analazying the audio buffer.
    reportInfo('Audio input sample rate=' + inputBuffer.sampleRate);
    this.testNumberOfActiveChannels();
    testFinished();
  },

  testNumberOfActiveChannels: function() {
    var numberOfChannels = this.inputBuffer.numberOfChannels;
    for (var channel = 0; channel < numberOfChannels; channel++) {
      var numberOfZeroSamples = 0;
      for (var sample = 0; sample < this.inputBuffer.length; sample++) {
        if (this.inputBuffer.getChannelData(channel)[sample] === 0) {
          numberOfZeroSamples++;
        }
      }
      if (numberOfZeroSamples !== this.bufferSize) {
        this.activeChannels[channel] = numberOfZeroSamples;
        this.testInputVolume(channel);
      }        
    }
    if (this.activeChannels.length === 0) {
      reportFatal('No active input channels detected.');
    } else {
      reportSuccess('Audio input channels=' + this.activeChannels.length);
    }
    // If two channel input compare zero data samples to determine if it's mono.
    if (this.activeChannels.length === 2) {
      if (this.activeChannels[0][0] === this.activeChannels[1][0]) {
        reportInfo('Mono stream detected.');
      }
    }
  },

  testInputVolume: function(channel) {
    var data = this.inputBuffer.getChannelData(channel);
    var sum = 0;
    for (var sample = 0; sample < this.inputBuffer.length; ++sample) {
      sum += Math.abs(data[sample]);
    }
    var rms = Math.sqrt(sum / this.inputBuffer.length);
    var db = Math.round(20 * Math.log(rms) / Math.log(10));

    // Check input audio level.
    if (db < this.lowVolumeThreshold) {
      if (db === -Infinity ) {
        return reportFatal('Audio input level=' + db  + 'db' + '\nMicrophone ' +
                           'is most likely muted or broken, please check if ' +
                           'muted in the sound settings or physically on the ' +
                           'device.');
      }
      reportFatal('Audio input level=' + db + ' db' + '\nMicrophone input ' +
                  'level is low, increase input volume or move closer to the ' +
                  'microphone');
    } else {
      reportSuccess('Audio power for channel ' + channel + '=' + db + ' db');
    }
  }
};
