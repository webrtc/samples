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

test('PeerConnection upgrade sample', function(t) {
  var driver = seleniumHelpers.buildDriver();

  driver.get((process.env.BASEURL ? process.env.BASEURL :
      ('file://' + process.cwd())) +
      '/src/content/peerconnection/upgrade/index.html')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id('startButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript('return localStream !== null');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('got media');
    return driver.findElement(webdriver.By.id('callButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return pc2 && pc2.iceConnectionState === \'connected\';');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('pc2 ICE connected');
    return driver.findElement(webdriver.By.id('upgradeButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return remoteVideo.videoWidth === 640;');
    }, 30 * 1000);
  })
  .then(function() {
    return driver.findElement(webdriver.By.id('hangupButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript('return pc1 === null');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('hangup');
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
