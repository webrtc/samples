/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
/* jshint node: true */
var test = require('tape');

// https://code.google.com/p/selenium/wiki/WebDriverJs
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var firefox = require('selenium-webdriver/firefox');

var profile = null;
var firefoxOptions = null;
var chromeOptions = null;

// Firefox options.
// http://selenium.googlecode.com/git/docs/api/javascript/module_selenium-webdriver_firefox.html
var profile = new firefox.Profile();
profile.setPreference('media.navigator.streams.fake', true);
var firefoxOptions = new firefox.Options()
    .setProfile(profile)
    .setBinary('node_modules/.bin/start-firefox');

// Chrome options.
// http://selenium.googlecode.com/git/docs/api/javascript/module_selenium-webdriver_chrome_class_Options.html#addArguments
var chromeOptions = new chrome.Options()
    .setChromeBinaryPath('node_modules/.bin/start-chrome')
    .addArguments('allow-file-access-from-files')
    .addArguments('use-fake-device-for-media-stream')
    .addArguments('use-fake-ui-for-media-stream');

test('Video width and video height are set on GUM sample', function(t) {
  // FIXME: use env[SELENIUM_BROWSER] instead?
  var driver = new webdriver.Builder()
      .forBrowser(process.env.BROWSER)
      .setFirefoxOptions(firefoxOptions)
      .setChromeOptions(chromeOptions)
      .build();

  driver.get('file://' + process.cwd() +
      '/src/content/getusermedia/gum/index.html')
  .then(function() {
    t.pass('Page loaded');
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
        t.pass('got videoHeight ' + h);
        if (width && height) {
          resolve([width, height]);
        }
      });
    });
  })
  .then(function(dimensions) {
    t.pass('Got video dimensions ' + dimensions.join('x'));
    driver.close();
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    driver.close();
    t.end();
  });
});
