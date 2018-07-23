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

test('PeerConnection multiple sample', t => {
  const driver = seleniumHelpers.buildDriver();
  const path = '/src/content/peerconnection/multiple/index.html';
  const url = (process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())) + path;

  driver.get(url)
    .then(() => {
      t.pass('page loaded');
      return driver.findElement(webdriver.By.id('startButton')).click();
    })
    .then(() => {
      t.pass('got media');
      return driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled());
    })
    .then(() => {
      driver.findElement(webdriver.By.id('callButton')).click();
      return driver.wait(() => driver.executeScript(
        'return pc1Remote && pc1Remote.iceConnectionState === \'connected\'' +
        ' && pc2Remote && pc2Remote.iceConnectionState === \'connected\';'), 30 * 1000);
    })
    .then(() => {
      t.pass('multiple connections connected');
      return driver.findElement(webdriver.By.id('hangupButton')).click();
    })
    .then(() => driver.wait(() => driver.executeScript('return pc1Local === null && ' +
      'pc2Local === null'), 30 * 1000))
    .then(() => {
      t.pass('hangup');
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});
