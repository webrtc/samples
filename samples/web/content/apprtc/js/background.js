/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

// Variables defined in and used from chrome.
/* globals chrome */

'use strict';
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('appwindow.html', {
    'width': 600,
    'height': 400,
    'left': 0,
    'top': 0
  },
  function(win) {
    win.onClosed.addListener(function() {
      console.log('Window was closed, calling call cleanup method.');
      if (win && win.cleanup)
      {
        // TODO: this function needs to be restructured so it can be called
        // from this context, currently all of the required data is gone
        // by the time this gets called.
        //win.cleanup();
      }
    });
  });
});
