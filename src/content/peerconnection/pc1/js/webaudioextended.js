/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

// WebAudioExtended helper class which takes care of the WebAudio related parts.

function WebAudioExtended() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  /* global AudioContext */
  this.context = new AudioContext();
}

WebAudioExtended.prototype.start = function() {
};

WebAudioExtended.prototype.applyFilter = function(stream) {
  this.mic = this.context.createMediaStreamSource(stream);
  var block_size = 1024;
  var fft_size = 2 * block_size;
  var shift_hz = 200; // Was 430; the higher the more "warping".
  var ctx = this.context;
  var effect = (function() {
    var inputmem = new Float32Array(fft_size).fill(0);
    var outputmem = new Float32Array(fft_size).fill(0);
    var node = ctx.createScriptProcessor(block_size, 1, 1);
    var hamming_win = new WindowFunction(DSP.HAMMING);
    node.onaudioprocess = function(e) {
      // Get the input and output arrays.
      var input = e.inputBuffer.getChannelData(0);
      var output = e.outputBuffer.getChannelData(0);
      // Copy input to last half of inputmem. (First half is populated with
      // the input from last time.)
      for (var i = 0; i < block_size; i++) {
        inputmem[block_size + i] = input[i];
      }

      // Perform FFT of input.
      var fft = new FFT(fft_size, e.srcElement.context.sampleRate);
      fft.forward(inputmem);

      // Modify the signal in the frequency domain.
      // Shift all frequency bins (except DC) N steps towards "lower
      // freqencies".
      var N = Math.ceil(shift_hz * fft_size / e.srcElement.context.sampleRate);
      for (var i = 1; i < fft_size/2 - N; i++) {
        fft.real[i] = fft.real[i + N];
        fft.imag[i] = fft.imag[i + N];
        fft.real[fft_size - 1 - i] = fft.real[fft_size - 1 - i - N];
        fft.imag[fft_size - 1 - i] = fft.imag[fft_size - 1 - i - N];
      }
      // Zero out the N highest frequencies.
      for (var i = fft_size/2 - N; i < fft_size/2 + N; i++) {
        fft.real[i] = 0;
        fft.imag[i] = 0;
      }

      // Inverse FFT and window.
      var tempoutput = hamming_win.process(fft.inverse(fft.real, fft.imag));

      // Add first half of tempoutput to first half of outputmem. The second
      // half of tempoutput is copied to the second half of outputmem for
      // use next time.
      for (var i = 0; i < block_size; i++) {
        outputmem[i] += tempoutput[i];
        outputmem[block_size + i] = tempoutput[block_size + i];
      }
      // Output first half of outputmem now.
      for (var i = 0; i < block_size; i++) {
        output[i] = outputmem[i];
      }
      // Shift last half of inputmem and outputmem to first half to prepare
      // for the next round.
      inputmem.copyWithin(0, block_size);
      outputmem.copyWithin(0, block_size);
    }
    return node;
  })();
  this.mic.connect(effect);
  this.peer = this.context.createMediaStreamDestination();
  effect.connect(this.peer);
  return this.peer.stream;
};

WebAudioExtended.prototype.stop = function() {
  this.mic.disconnect(0);
  this.mic = null;
  this.peer = null;
};
