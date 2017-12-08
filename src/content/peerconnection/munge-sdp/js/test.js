/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
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

test('Munge SDP sample', function(t) {
  var driver = seleniumHelpers.buildDriver();

  driver.get((process.env.BASEURL ? process.env.BASEURL :
      ('file://' + process.cwd())) +
      '/src/content/peerconnection/munge-sdp/index.html')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id('getMedia')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript('return typeof window.localStream ' +
        '!== \'undefined\'');
    });
  })
  .then(function() {
    t.pass('got media');
    return driver.findElement(webdriver.By.id('createPeerConnection')).click();
  })
  .then(function() {
    return driver.wait(webdriver.until.elementIsVisible(
        driver.findElement(webdriver.By.id('createOffer')))).click();
  })
  .then(function() {
    // Need to wait for createOffer to succeed which takes some time
    // on travis.
    return driver.wait(function() {
      return driver.executeScript(
          'return document.querySelector(\'#local>textarea\').value !== \'\'');
    });
  })
  .then(function() {
    return driver.findElement(webdriver.By.css('#local>textarea'))
        .getAttribute('value');
  })
  .then(function(value) {
    t.ok(value !== '', 'local SDP is shown in textarea');
    return driver.findElement(webdriver.By.id('setOffer')).click();
  })
  .then(function() {
    return driver.findElement(webdriver.By.id('createAnswer')).click();
  })
  .then(function() {
    // Need to wait for createAnswer to succeed which takes some time
    // on travis.
    return driver.wait(function() {
      return driver.executeScript(
          'return document.querySelector(\'#remote>textarea\').value !== \'\'');
    });
  })
  .then(function() {
    return driver.findElement(webdriver.By.css('#remote>textarea'))
        .getAttribute('value');
  })
  .then(function(value) {
    t.ok(value !== '', 'remote SDP is shown in textarea');
    return driver.findElement(webdriver.By.id('setAnswer')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return remotePeerConnection && ' +
          'remotePeerConnection.iceConnectionState === \'connected\';');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('remotePeerConnection ICE connected');
    // Need to make sure some data has had time to transfer.
    return driver.wait(function() {
      return driver.executeScript(
        'return typeof dataChannelDataReceived !== \'undefined\';');
    });
  })
  .then(function() {
    return driver.executeScript(
        'return dataChannelDataReceived;');
  })
  .then(function(value) {
    t.ok(value !== '', 'dataChannelDataReceived is not empty.');
  })
  .then(function() {
    t.pass('remotePeerConnection ICE connected');
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
