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

test('Munge SDP sample', t => {
  const driver = seleniumHelpers.buildDriver();
  const path = '/src/content/peerconnection/munge-sdp/index.html';
  const url = (process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())) + path;

  driver.get(url)
    .then(() => {
      t.pass('page loaded');
      return driver.findElement(webdriver.By.id('getMedia')).click();
    })
    .then(() => driver.wait(() => driver.executeScript('return typeof window.localStream !== \'undefined\'')))
    .then(() => {
      t.pass('got media');
      return driver.findElement(webdriver.By.id('createPeerConnection')).click();
    })
    .then(() => {
      return driver.wait(webdriver.until.elementIsVisible(driver.findElement(webdriver.By.id('createOffer')))).click();
    })
    .then(() => {
      // Need to wait for createOffer to succeed which takes some time
      // on travis.
      const script = 'return document.querySelector(\'#local>textarea\').value !== \'\'';
      return driver.wait(() => driver.executeScript(script));
    })
    .then(() => driver.findElement(webdriver.By.css('#local>textarea')).getAttribute('value'))
    .then(value => {
      t.ok(value !== '', 'local SDP is shown in textarea');
      return driver.findElement(webdriver.By.id('setOffer')).click();
    })
    .then(() => driver.findElement(webdriver.By.id('createAnswer')).click())
    .then(() => {
      // Need to wait for createAnswer to succeed which takes some time
      // on travis.
      return driver.wait(() => driver.executeScript(
        'return document.querySelector(\'#remote>textarea\').value !== \'\''));
    })
    .then(() => driver.findElement(webdriver.By.css('#remote>textarea'))
      .getAttribute('value'))
    .then(value => {
      t.ok(value !== '', 'remote SDP is shown in textarea');
      return driver.findElement(webdriver.By.id('setAnswer')).click();
    })
    .then(() => driver.wait(() => driver.executeScript(
      'return remotePeerConnection && ' +
      'remotePeerConnection.iceConnectionState === \'connected\';'), 30 * 1000))
    .then(() => {
      t.pass('remotePeerConnection ICE connected');
      // Need to make sure some data has had time to transfer.
      return driver.wait(() => driver.executeScript('return typeof dataChannelDataReceived !== \'undefined\';'));
    })
    .then(() => driver.executeScript('return dataChannelDataReceived;'))
    .then(value => t.ok(value !== '', 'dataChannelDataReceived is not empty.'))
    .then(() => {
      t.pass('remotePeerConnection ICE connected');
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});
