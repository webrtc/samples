/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

'use strict';
var test = require('tape');

// Add all test files here with a short comment.

// Tests basic functionality of the the gum demo.
require('../src/content/getusermedia/gum/js/test');

// Tests basic functionality of the the resolution demo.
require('../src/content/getusermedia/resolution/js/test');

// Tests basic functionality of the pc1 demo.
require('../src/content/peerconnection/pc1/js/test');

// Tests basic functionality of the upgrade demo.
require('../src/content/peerconnection/upgrade/js/test');

// Tests basic functionality of the peerconnection audio demo.
require('../src/content/peerconnection/audio/js/test');

// Tests basic functionality of the peerconnection dtmf demo.
require('../src/content/peerconnection/dtmf/js/test');

// Tests basic functionality of the peerconnection multiple demo.
require('../src/content/peerconnection/multiple/js/test');

// Tests basic functionality of the munge-sdp demo.
require('../src/content/peerconnection/munge-sdp/js/test');

// Tests basic functionality of the trickle-ice demo.
require('../src/content/peerconnection/trickle-ice/js/test');

// Tests basic functionality of the ice restart demo.
require('../src/content/peerconnection/restart-ice/js/test.js');

// Tests basic functionality of the datachannel textchat demo.
require('../src/content/datachannel/basic/js/test');

// Tests basic functionality of the datachannel datatransfer demo.
require('../src/content/datachannel/datatransfer/js/test');

// Tests basic functionality of the datachannel filetransfer demo.
require('../src/content/datachannel/filetransfer/js/test');

// Tests basic functionality of the input-output device demo.
require('../src/content/devices/input-output/js/test.js');

// This is run as a test so it is executed after all tests
// have completed.
test('Shutdown', function(t) {
  require('webrtc-utilities').seleniumLib.buildDriver()
  .then(function(driver) {
    driver.getCapabilities().then(function(caps) {
      // Newer geckodriver do not like close() for some reason.
      if (caps.get('browserName') !== 'firefox') {
        driver.close();
      }
    });
    driver.quit().then(function() {
      t.end();
    });
  });
});
