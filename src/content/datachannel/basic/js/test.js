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

// Disabling on firefox until sendKeys is fixed.
// https://github.com/mozilla/geckodriver/issues/683
test('Basic datachannel sample', {skip: process.env.BROWSER === 'firefox'},
  t => {
    const webdriver = require('selenium-webdriver');
    const seleniumHelpers = require('webrtc-utilities').seleniumLib;
    const driver = seleniumHelpers.buildDriver();
    const path = '/src/content/datachannel/basic/index.html';
    const url = (process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())) + path;

    driver.get(url)
      .then(() => {
        t.pass('page loaded');
        return driver.findElement(webdriver.By.id('startButton')).click();
      })
      .then(() => driver.wait(() => driver.executeScript(
        'return remoteConnection && ' +
        'remoteConnection.iceConnectionState === \'connected\';')))
      .then(() => {
        t.pass('remoteConnection ICE connected');
        return driver.findElement(webdriver.By.id('dataChannelSend')).sendKeys('hello world');
      })
      .then(() => driver.findElement(webdriver.By.id('sendButton')).click())
      .then(() => driver.wait(() => {
        return driver.executeScript('return document.getElementById(\'dataChannelReceive\').value !== \'\'');
      }))
      .then(() => driver.findElement(webdriver.By.id('dataChannelReceive')).getAttribute('value'))
      .then(value => t.ok(value === 'hello world', 'Text was received'))
      .then(() => t.end())
      .then(null, err => {
        t.fail(err);
        t.end();
      });
  });
