/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
// Variables defined in and used from main.js.
/* globals chrome, disconnectFromRoom */
/* exported initialParams */
'use strict';

// Add a cleanup function that can be called from background.js as
// the window is being closed.
chrome.app.window.current().cleanup = function() {
  disconnectFromRoom();
};

// Provide initialParams var, provided inline in index.html.
var initialParams;

