/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
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

test('DTMF tones', function(t) {
  var driver = seleniumHelpers.buildDriver();

  driver.get((process.env.BASEURL ? process.env.BASEURL :
      ('file://' + process.cwd())) +
      '/src/content/peerconnection/dtmf/index.html')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id('callButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return document.querySelector(\'#dtmfStatus\').innerHTML === ' +
          '\'DTMF available\';');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('DTMF available');
    // Set the tones to be sent.
    return driver.executeScript(
        'document.querySelector(\'#tones\').value = \'1#,9\'');
  })
  .then(function() {
    return driver.findElement(webdriver.By.id('sendTonesButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
        // For some reason the demo sends and extra space. Assume it's due to
        // setting a gap.
          'return document.querySelector(' +
          '\'#sentTones\').innerHTML.length === 9');
    });
  }, 30 * 1000)
  .then(function() {
    return driver.executeScript(
        'return document.querySelector(\'#sentTones\').innerHTML');
  })
  .then(function(sentTones) {
    t.ok(sentTones === '1 # , 9  ', 'sentTones matches tones');
    return driver.findElement(webdriver.By.id('hangupButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript('return pc1 === null');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('Hangup successful');
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
