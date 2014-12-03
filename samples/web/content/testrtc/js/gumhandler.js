/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* exported GumHandler */
'use strict';

function GumHandler() {
  this.gumErrorMessage_ = document.getElementById('gum-error-message');
  this.gumRequestOverlay_ = document.getElementById('gum-request-overlay');
  this.gumErrorOverlay_ = document.getElementById('gum-error-overlay');
  this.firstUserCheck_ = null;
}

GumHandler.prototype = {
  start: function() {
    startButton.disabled = true;
    this.getUserMedia_();
    this.firstUserCheck_ = setTimeout(this.firstTimeUser_.bind(this), 300);
  },

  firstTimeUser_: function() {
    this.gumRequestOverlay_.open();
  },

  getUserMedia_: function() {
    doGetUserMedia({audio: true, video: true}, this.gotStream_.bind(this),
        this.gotError_.bind(this));
  },

  gotStream_: function(stream) {
    // Stop all tracks to ensure the camera and audio devices are shutdown directly.
    for (var i in stream.getTracks()) {
      stream.getTracks()[i].stop();
    }
    if (this.gumRequestOverlay_.opened) {
      this.gumRequestOverlay_.close();
    } else if (this.gumErrorOverlay_.opened) {
      this.gumErrorOverlay_.close();
    }
    clearTimeout(this.firstUserCheck_);
    startButton.removeAttribute('disabled');
  },

  gotError_: function(error) {
    this.gumErrorMessage_.innerHTML = error.name;
    if (!this.gumErrorOverlay_.opened) {
      this.gumErrorOverlay_.open();
    }
    if (this.gumRequestOverlay_.opened) {
      this.gumRequestOverlay_.close();
    }
    setTimeout(this.getUserMedia_.bind(this), 1000);
    clearTimeout(this.firstUserCheck_);
  }
};
