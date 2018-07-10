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
const test = require('tape');

const webdriver = require('selenium-webdriver');
const seleniumHelpers = require('webrtc-utilities').seleniumLib;

const path = '/src/content/getusermedia/gum/index.html';
const url = (process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())) + path;

test('Video width and video height are set on GUM sample', t => {
  // FIXME: use env[SELENIUM_BROWSER] instead?
  const driver = seleniumHelpers.buildDriver();

  driver.get(url)
    .then(() => t.pass('Page loaded'))
    .then(() => driver.wait(() => {
      return driver.executeScript('return window.stream !== undefined;');
    }, 30 * 1000))
    // Check that there is a stream with a video track.
    .then(() => driver.executeScript('return stream && stream.getTracks().length'))
    .then(numberOfStreams => t.ok(numberOfStreams === 1, 'Stream exists and has one track'))
    // Check that there is a video element and it is displaying something.
    .then(() => driver.findElement(webdriver.By.id('gum-local')))
    .then(videoElement => {
      t.pass('Found video element');
      let width = 0;
      let height = 0;
      return new webdriver.promise.Promise(resolve => {
        videoElement.getAttribute('videoWidth').then(w => {
          width = w;
          // TODO: Figure out why videoWidth is 0 most of the time on Chrome.
          // TODO: After above TODO is fixed, add > zero validation.
          t.pass('Got videoWidth ' + w);
          if (width && height) {
            resolve([width, height]);
          }
        });
        videoElement.getAttribute('videoHeight').then(h => {
          height = h;
          t.pass('Got videoHeight ' + h);
          if (width && height) {
            resolve([width, height]);
          }
        });
      });
    })
    .then(dimensions => {
      t.pass('Got video dimensions ' + dimensions.join('x'));
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});

test('Check that errorMsg can add msg to the page', t => {
  // FIXME: use env[SELENIUM_BROWSER] instead?
  const driver = seleniumHelpers.buildDriver();

  driver.get(url)
    .then(() => t.pass('Page loaded'))
    .then(() => driver.executeScript('return errorMsg("Testing error message.")'))
    .then(() => driver.findElement(webdriver.By.id('errorMsg')).getText())
    .then(elementText => {
      t.ok(elementText === 'Testing error message.', '"Testing error message." found on the page');
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});
