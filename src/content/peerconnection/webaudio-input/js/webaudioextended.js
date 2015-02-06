/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
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
  this.soundBuffer = null;
}

WebAudioExtended.prototype.start = function() {
  this.filter = this.context.createBiquadFilter();
  this.filter.type = 'highpass';
  this.filter.frequency.value = 1500;
};

WebAudioExtended.prototype.applyFilter = function(stream) {
  this.mic = this.context.createMediaStreamSource(stream);
  this.mic.connect(this.filter);
  this.peer = this.context.createMediaStreamDestination();
  this.filter.connect(this.peer);
  return this.peer.stream;
};

WebAudioExtended.prototype.renderLocally = function(enabled) {
  if (enabled) {
    this.mic.connect(this.context.destination);
  } else {
    this.mic.disconnect(0);
    this.mic.connect(this.filter);
  }
};

WebAudioExtended.prototype.stop = function() {
  this.mic.disconnect(0);
  this.filter.disconnect(0);
  this.mic = null;
  this.peer = null;
};

WebAudioExtended.prototype.addEffect = function() {
  var effect = this.context.createBufferSource();
  effect.buffer = this.soundBuffer;
  if (this.peer) {
    effect.connect(this.peer);
    effect.start(0);
  }
};

WebAudioExtended.prototype.loadCompleted = function() {
  this.context.decodeAudioData(this.request.response, function(buffer) {
    this.soundBuffer = buffer;
  }.bind(this));
};

WebAudioExtended.prototype.loadSound = function(url) {
  this.request = new XMLHttpRequest();
  this.request.open('GET', url, true);
  this.request.responseType = 'arraybuffer';
  this.request.onload = this.loadCompleted.bind(this);
  this.request.send();
};
