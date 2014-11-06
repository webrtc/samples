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
  this.outputChannels = 2;
  this.lowVolumeThreshold = -60;
  // To be able to capture any data on Windows we need a large buffer size.
  this.bufferSize = 8192;
  this.activeChannelsDb = [];
  // Turning off echoCancellation constraint enables stereo input.
  this.constraints = { 
    audio: {
      optional: [ 
        { echoCancellation: false }
      ]
    }
  };
}

MicTest.prototype = {
  run: function() {
    doGetUserMedia(this.constraints, this.gotStream.bind(this));
  },

  gotStream: function(stream) {
    if (!this.checkAudioTracks(stream)) {
      return;
    }
    this.createAudioBuffer(stream);
  },

  checkAudioTracks: function(stream) {
    this.stream = stream;
    var audioTracks = stream.getAudioTracks();
    if (audioTracks.length < 1) {
      reportFatal('No audio track in returned stream.');
      return false;
    }
    reportSuccess('Audio track created using device=' + audioTracks[0].label);
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
    this.stream.stop();
    this.audioSource.disconnect(this.scriptNode);
    this.scriptNode.disconnect(audioContext.destination);
    // Start analazying the audio buffer.
    reportInfo('Audio input sample rate=' + inputBuffer.sampleRate);
    this.testNumberOfActiveChannels(inputBuffer);
  },

  testNumberOfActiveChannels: function(buffer) {
    var numberOfChannels = buffer.numberOfChannels;
    for (var channel = 0; channel < numberOfChannels; channel++) {
      var numberOfZeroSamples = 0;
      for (var sample = 0; sample < buffer.length; sample++) {
        if (buffer.getChannelData(channel)[sample] === 0) {
          numberOfZeroSamples++;
        }
      }
      if (numberOfZeroSamples !== buffer.length) {
        this.activeChannelsDb[channel] = this.testInputVolume(buffer, channel);
      }
    }
    if (this.activeChannelsDb.length === 0) {
      reportFatal('No active input channels detected. Microphone is most ' +
                  'likely muted or broken, please check if muted in the ' +
                  'sound settings or physically on the device.');
      return;
    } else {
      reportSuccess('Audio input channels=' + this.activeChannelsDb.length);
    }
    // If two channel input compare calculated db values to determine if it's 
    // a mono microphone.
    if (this.activeChannelsDb.length === 2) {
      if (this.activeChannelsDb[0] === this.activeChannelsDb[1]) {
        reportInfo('Mono microphone detected.');
      }
      else {
        reportInfo('Stereo microphone detected.');
      }
    }
    testFinished();
  },

  testInputVolume: function(buffer, channel) {
    var data = buffer.getChannelData(channel);
    var sum = 0;
    for (var sample = 0; sample < buffer.length; ++sample) {
      sum += Math.abs(data[sample]);
    }
    var rms = Math.sqrt(sum / buffer.length);
    var db = Math.round(20 * Math.log(rms) / Math.log(10));

    // Check input audio level.
    if (db < this.lowVolumeThreshold) {
      reportError('Audio input level=' + db + ' db' + 'Microphone input ' +
                  'level is low, increase input volume or move closer to the ' +
                  'microphone.');
    } else {
      reportSuccess('Audio power for channel ' + channel + '=' + db + ' db');
    }
    return db;
  }
};
