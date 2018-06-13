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

function sendData(t) {
  const driver = seleniumHelpers.buildDriver();
  let sendButton;

  driver.get(`${process.env.BASEURL ? process.env.BASEURL :
    (`file://${process.cwd()}`)}/src/content/datachannel/datatransfer/index.html`)
  .then(() => {
    t.pass('page loaded');
    // Based on https://saucelabs.com/resources/articles/selenium-file-upload
    return driver.findElement(webdriver.By.id('sendTheData'));
  })
  .then(button => {
    sendButton = button;
    sendButton.click();
    // The click is asynchronous.  Wait until the click has taken effect.
    return driver.wait(webdriver.until.elementIsDisabled(sendButton));
  }).then(() => // The button will be re-enabled after the transfer completes.
  driver.wait(webdriver.until.elementIsEnabled(sendButton)))
  .then(() => {
    t.end();
  })
  .then(null, err => {
    t.fail(err);
    t.end();
  });
}

test('In-memory datatransfer via Datachannels', t => {
  sendData(t);
});
