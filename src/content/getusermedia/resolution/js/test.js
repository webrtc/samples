/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
var test = require('tape');

var webdriver = require('selenium-webdriver');
var seleniumHelpers = require('webrtc-utilities').seleniumLib;

function resolutionTest(t, resolutionButtonId, expectedWidth) {
  var driver = seleniumHelpers.buildDriver();

  driver.get((process.env.BASEURL ? process.env.BASEURL :
      ('file://' + process.cwd())) +
      '/src/content/getusermedia/resolution/index.html')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id(resolutionButtonId)).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(function() {
        var localVideo = document.getElementById('gum-res-local');
        return localVideo && localVideo.readyState >= 4;
      });
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('got local video');
    return driver.wait(function() {
      return driver.executeScript(function(_expectedWidth) {
        var localVideo = document.getElementById('gum-res-local');
        return localVideo && localVideo.videoWidth === _expectedWidth;
      }, expectedWidth);
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('got expected video width');
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
}

test('QVGA capture', function(t) {
  resolutionTest(t, 'qvga', 320);
});

test('VGA capture', function(t) {
  resolutionTest(t, 'vga', 640);
});

test('HD capture', function(t) {
  resolutionTest(t, 'hd', 1280);
});

test('FULL HD capture', function(t) {
  resolutionTest(t, 'full-hd', 1920);
});

/*
//Fake camera capture device does not support 4K yet.
test('4K capture', function(t) {
  resolutionTest(t, 'fourK', 4096);
});
*/