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

test('Video width and video height are set on GUM sample', function(t) {
  // FIXME: use env[SELENIUM_BROWSER] instead?
  var driver = seleniumHelpers.buildDriver();

  driver.get('file://' + process.cwd() +
      '/src/content/getusermedia/gum/index.html')
  .then(function() {
    t.pass('Page loaded');
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript('return window.stream !== undefined;');
    }, 30 * 1000);
  })
  // Check that there is a stream with a video track.
  .then(function() {
    return driver.executeScript('return stream && stream.getTracks().length');
  })
  .then(function(numberOfStreams) {
    t.ok(numberOfStreams === 1, 'Stream exists and has one track');
  })
  // Check that there is a video element and it is displaying something.
  .then(function() {
    return driver.findElement(webdriver.By.id('gum-local'));
  })
  .then(function(videoElement) {
    t.pass('Found video element');
    var width = 0;
    var height = 0;
    return new webdriver.promise.Promise(function(resolve) {
      videoElement.getAttribute('videoWidth').then(function(w) {
        width = w;
        // TODO: Figure out why videoWidth is 0 most of the time on Chrome.
        // TODO: After above TODO is fixed, add > zero validation.
        t.pass('Got videoWidth ' + w);
        if (width && height) {
          resolve([width, height]);
        }
      });
      videoElement.getAttribute('videoHeight').then(function(h) {
        height = h;
        t.pass('Got videoHeight ' + h);
        if (width && height) {
          resolve([width, height]);
        }
      });
    });
  })
  .then(function(dimensions) {
    t.pass('Got video dimensions ' + dimensions.join('x'));
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});

test('Check that errorMsg can add msg to the page', function(t) {
  // FIXME: use env[SELENIUM_BROWSER] instead?
  var driver = seleniumHelpers.buildDriver();

  driver.get('file://' + process.cwd() +
      '/src/content/getusermedia/gum/index.html')
  .then(function() {
    t.pass('Page loaded');
  })
  .then(function() {
    return driver.executeScript('return errorMsg("Testing error message.")');
  })
  .then(function() {
    return driver.findElement(webdriver.By.id('errorMsg')).getText();
  })
  .then(function(elementText) {
    t.ok(elementText === 'Testing error message.', '"Testing error message." ' +
      ' found on the page');
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
