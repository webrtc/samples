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
    'width': 800,
    'height': 600,
    'left': 0,
    'top': 0
  });
});
