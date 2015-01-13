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
  // Buffer size set to 0 to let Chrome choose based on the platform.
  this.bufferSize = 0;
  this.lastInputBuffer = [];
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
    if (typeof audioContext === 'undefined') {
      reportError('WebAudio is not supported, test cannot run.');
      testFinished();
    } else {
      doGetUserMedia(this.constraints, this.gotStream.bind(this));
    }
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
      reportError('No audio track in returned stream.');
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
    this.scriptNode.onaudioprocess = this.collectAudio.bind(this);
    setTimeoutWithProgressBar(this.stopCollectingAudio.bind(this), 2000);
  },

  collectAudio: function(event) {
    this.lastInputBuffer = event.inputBuffer;
  },

  stopCollectingAudio: function() {
    this.stream.getAudioTracks()[0].stop();
    this.audioSource.disconnect(this.scriptNode);
    this.scriptNode.disconnect(audioContext.destination);
    // Start analyzing the audio buffer.
    this.testNumberOfActiveChannels(this.lastInputBuffer);
    testFinished();
  },

  testNumberOfActiveChannels: function(buffer) {
    var sampleData = [ [], [] ];
    var numberOfChannels = buffer.numberOfChannels;
    var activeChannels = [];
    for (var channel = 0; channel < numberOfChannels; channel++) {
      var numberOfZeroSamples = 0;
      for (var sample = 0; sample < buffer.length; sample++) {
        if (buffer.getChannelData(channel)[sample] !== 0) {
          sampleData[channel][sample] = buffer.getChannelData(channel)[sample];
        } else {
          numberOfZeroSamples++;
        }
      }
      if (numberOfZeroSamples !== buffer.length ) {
        activeChannels[channel] = this.testInputVolume(buffer, channel);
      }
    }
    // Validate the result.
    if (activeChannels.length === 0) {
      reportError('No active input channels detected. Microphone is most ' +
                  'likely muted or broken, please check if muted in the ' +
                  'sound settings or physically on the device. Then rerun ' +
                  'the test.');
    } else {
      reportSuccess('Audio input channels=' + activeChannels.length);
    }
    // If two channel input compare samples on channel 0 and 1 to determine if
    // it is a mono microphone.
    if (activeChannels.length === 2) {
      var samplesMatched = 0;
      var epsilon = buffer.length * 0.15;
      for (var i= 0; i < sampleData[0].length; i++) {
        if (sampleData[0][i] === sampleData[1][i]) {
          samplesMatched++;
        }
      }
      if (samplesMatched > buffer.length - epsilon) {
        reportInfo('Mono microphone detected.');
      } else {
        reportInfo('Stereo microphone detected.');
      }
    }
  },

  testInputVolume: function(buffer, channel) {
    var data = buffer.getChannelData(channel);
    var sum = 0;
    for (var sample = 0; sample < buffer.length; ++sample) {
      sum += Math.abs(data[sample]);
    }
    var rms = Math.sqrt(sum / buffer.length);
    var db = 20 * Math.log(rms) / Math.log(10);

    // Check input audio level.
    if (db < this.lowVolumeThreshold) {
      // Use Math.round to display up to two decimal places.
      reportError('Audio input level = ' + Math.round(db * 1000) / 1000 + ' db' +
                  'Microphone input level is low, increase input volume or' +
                  'move closer to the microphone.');
    } else {
      reportSuccess('Audio power for channel ' + channel + '=' + Math.round(db * 1000) / 1000 + ' db');
    }
  }
};
