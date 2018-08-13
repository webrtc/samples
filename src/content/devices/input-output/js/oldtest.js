/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */

'use strict';
const test = require('tape');

test('Fake device selection and check video element dimensions in input-output demo', t => {
  const webdriver = require('selenium-webdriver');
  const seleniumHelpers = require('webrtc-utilities').seleniumLib;

  // FIXME: use env[SELENIUM_BROWSER] instead?
  const driver = seleniumHelpers.buildDriver();

  const browser = process.env.BROWSER;

  const path = '/src/content/devices/input-output/index.html';
  const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;
  driver.get(url)
    .then(() => {
      t.pass('Page loaded');
      // Making sure we can select the 1st audio device.
      // TODO: Select more devices if Firefox adds a 2nd fake A&V device and
      // Chrome adds another fake video device.
      t.pass('Selecting 1st audio device');
      return driver.wait(webdriver.until.elementLocated(
        webdriver.By.css('#audioSource:nth-of-type(1)')));
    })
    // Check enumerateDevices has returned an id.
    .then(element => driver.wait(webdriver.until.elementIsVisible(element))
      .then(() => {
        element.click();
        return element.getAttribute('value');
      }))
    .then(deviceId => {
      t.ok(deviceId, `Device/source id: ${deviceId}`);
    })
    .then(() => {
      // Making sure we can select the 1st video device.
      // TODO: Select more devices if Firefox adds a 2nd fake A/V device and
      // Chrome adds another fake video device.
      t.pass('Selecting 1st video device');
      return driver.wait(webdriver.until.elementLocated(
        webdriver.By.css('#videoSource:nth-of-type(1)')));
    })
    // Check enumerateDevices has returned an id.
    .then(element => driver.wait(webdriver.until.elementIsVisible(element))
      .then(() => {
        element.click();
        return element.getAttribute('value');
      }))
    .then(deviceId => {
      t.ok(deviceId !== '', `Device/source id: ${deviceId}`);
    })
    .then(() => {
      // Make sure the stream is ready.
      return driver.wait(() => driver.executeScript('return window.stream !== undefined;'), 30 * 1000);
    })
    // Check for a fake audio device label (Chrome only).
    .then(() => driver.executeScript('return stream.getAudioTracks()[0].label'))
    .then(deviceLabel => {
      let fakeAudioDeviceNames;

      switch (browser) {
      case 'chrome':
        fakeAudioDeviceNames = [
          'Fake Default Audio Input', // Chrome <= 63
          'Fake Default Audio Input - Fake Audio Input 1', // Chrome 64+
          'Fake Audio Input 1',
          'Fake Audio Input 2'
        ];
        break;
      case 'firefox':
        fakeAudioDeviceNames = ['Default Audio Device'];
        break;
      default:
        t.skip('unsupported browser');
      }
      console.log(fakeAudioDeviceNames, deviceLabel,
        fakeAudioDeviceNames.indexOf(deviceLabel));
      t.ok(fakeAudioDeviceNames.indexOf(deviceLabel) !== -1,
        `Fake audio device found with label: ${deviceLabel}`);
    })
    // Check for a fake video device label (Chrome only).
    .then(() => driver.executeScript('return stream.getVideoTracks()[0].label'))
    .then(deviceLabel => {
      let fakeVideoDeviceName = null;

      switch (browser) {
      case 'chrome':
        fakeVideoDeviceName = 'fake_device_0';
        break;
      case 'firefox':
        // TODO: Remove the "deviceLabel === ''" check once Firefox ESR
        // reaches 46 (supports device labels for fake devices).
        fakeVideoDeviceName = (deviceLabel === '') ? '' : 'Default Video Device';
        break;
      default:
        t.pass('unsupported browser');
        throw 'skip-test';
      }

      t.ok(fakeVideoDeviceName === deviceLabel, `Fake video device found with label: ${deviceLabel}`);
    })
    // Check that there is a video element and it is displaying something.
    .then(() => driver.findElement(webdriver.By.id('video')))
    .then(videoElement => {
      t.pass('Found video element');
      let width = 0;
      let height = 0;
      return new webdriver.promise.Promise(resolve => {
        videoElement.getAttribute('videoWidth').then(w => {
          width = w;
          t.pass(`Got videoWidth ${w}`);
          if (width && height) {
            resolve([width, height]);
          }
        });
        videoElement.getAttribute('videoHeight').then(h => {
          height = h;
          t.pass(`Got videoHeight ${h}`);
          if (width && height) {
            resolve([width, height]);
          }
        });
      });
    })
    .then(dimensions => {
      t.pass(`Got video dimensions ${dimensions.join('x')}`);
    })
    .then(() => {
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});
