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
  this.gumPendingDialog_ = document.getElementById('gum-pending-dialog');
  this.gumErrorDialog_ = document.getElementById('gum-error-dialog');
  this.gumErrorMessage_ = document.getElementById('gum-error-message');
  this.firstUserCheck_ = null;
}

GumHandler.prototype = {
  start: function() {
    startButton.disabled = true;
    this.getUserMedia_();
    this.firstUserCheck_ = setTimeout(this.firstTimeUser_.bind(this), 300);
  },

  firstTimeUser_: function() {
    this.gumPendingDialog_.open();
  },

  getUserMedia_: function() {
    doGetUserMedia({audio: true, video: true}, this.gotStream_.bind(this),
        this.gotError_.bind(this));
  },

  gotStream_: function(stream) {
    clearTimeout(this.firstUserCheck_);

    // Stop all tracks to ensure the camera and audio devices are shutdown directly.
    for (var i = 0; i < stream.getTracks().length; i++) {
      stream.getTracks()[i].stop();
    }
    this.gumPendingDialog_.close();
    this.gumErrorDialog_.close();
    startButton.removeAttribute('disabled');
  },

  gotError_: function(error) {
    clearTimeout(this.firstUserCheck_);
    this.gumPendingDialog_.close();
    this.gumErrorMessage_.innerHTML = error.name;
    this.gumErrorDialog_.open();
    setTimeout(this.getUserMedia_.bind(this), 1000);
  }
};
