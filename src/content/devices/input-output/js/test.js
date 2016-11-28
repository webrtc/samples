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

test('Fake device selection and check video element dimensions ' +
  'in input-output demo',
  function(t) {
    // FIXME: use env[SELENIUM_BROWSER] instead?
    var driver = seleniumHelpers.buildDriver();

    var browser = process.env.BROWSER;

    driver.get('file://' + process.cwd() +
        '/src/content/devices/input-output/index.html')
      .then(function() {
        t.pass('Page loaded');
        // Making sure we can select the 1st audio device.
        // TODO: Select more devices if Firefox adds a 2nd fake A&V device and
        // Chrome adds another fake video device.
        t.pass('Selecting 1st audio device');
        return driver.wait(webdriver.until.elementLocated(
          webdriver.By.css('#audioSource:nth-of-type(1)')));
      })
      // Check enumerateDevices has returned an id.
      .then(function(element) {
        return driver.wait(webdriver.until.elementIsVisible(element))
        .then(function() {
          element.click();
          return element.getAttribute('value');
        });
      })
      .then(function(deviceId) {
        t.ok(deviceId, 'Device/source id: ' + deviceId);
      })
      .then(function() {
        // Making sure we can select the 1st video device.
        // TODO: Select more devices if Firefox adds a 2nd fake A/V device and
        // Chrome adds another fake video device.
        t.pass('Selecting 1st video device');
        return driver.wait(webdriver.until.elementLocated(
          webdriver.By.css('#videoSource:nth-of-type(1)')));
      })
      // Check enumerateDevices has returned an id.
      .then(function(element) {
        return driver.wait(webdriver.until.elementIsVisible(element))
        .then(function() {
          element.click();
          return element.getAttribute('value');
        });
      })
      .then(function(deviceId) {
        t.ok(deviceId !== '', 'Device/source id: ' + deviceId);
      })
      .then(function() {
        // Make sure the stream is ready.
        return driver.wait(function() {
          return driver.executeScript('return window.stream !== undefined;');
        }, 30 * 1000);
      })
      // Check for a fake audio device label (Chrome only).
      .then(function() {
        return driver.executeScript('return stream.getAudioTracks()[0].label');
      })
      .then(function(deviceLabel) {
        var fakeAudioDeviceNames = null;

        switch (browser) {
        case 'chrome':
          fakeAudioDeviceNames = ['Fake Audio 1', 'Fake Default Audio Input'];
          break;
        case 'firefox':
          // TODO: Remove the "deviceLabel === ''" check once Firefox ESR
          // reaches 46 (supports device labels for fake devices).
          fakeAudioDeviceNames = ['', 'Default Audio Device'];
          break;
        default:
          t.skip('unsupported browser');
        }
        console.log(fakeAudioDeviceNames, deviceLabel,
            fakeAudioDeviceNames.indexOf(deviceLabel));
        t.ok(fakeAudioDeviceNames.indexOf(deviceLabel) !== -1,
          'Fake audio device found with label: ' + deviceLabel);
      })
      // Check for a fake video device label (Chrome only).
      .then(function() {
        return driver.executeScript('return stream.getVideoTracks()[0].label');
      })
      .then(function(deviceLabel) {
        var fakeVideoDeviceName = null;

        switch (browser) {
        case 'chrome':
          fakeVideoDeviceName = 'fake_device_0';
          break;
        case 'firefox':
          // TODO: Remove the "deviceLabel === ''" check once Firefox ESR
          // reaches 46 (supports device labels for fake devices).
          fakeVideoDeviceName = (deviceLabel === '') ? '' :
              'Default Video Device';
          break;
        default:
          t.pass('unsupported browser');
          throw 'skip-test';
        }

        t.ok(fakeVideoDeviceName === deviceLabel,
          'Fake video device found with label: ' + deviceLabel);
      })
      // Check that there is a video element and it is displaying something.
      .then(function() {
        return driver.findElement(webdriver.By.id('video'));
      })
      .then(function(videoElement) {
        t.pass('Found video element');
        var width = 0;
        var height = 0;
        return new webdriver.promise.Promise(function(resolve) {
          videoElement.getAttribute('videoWidth').then(function(w) {
            width = w;
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
      })
      .then(function() {
        t.end();
      })
      .then(null, function(err) {
        t.fail(err);
        t.end();
      });
  });
