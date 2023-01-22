/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node, mocha */

'use strict';
const webdriver = require('selenium-webdriver');
const seleniumHelpers = require('../../../../../test/webdriver');

let driver;
const path = '/src/content/peerconnection/munge-sdp/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('peerconnection sdp munging', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('establishes a connection and allows hangup and new offer', async () => {
    await driver.findElement(webdriver.By.id('getMedia')).click();

    await driver.wait(() => driver.findElement(webdriver.By.id('createPeerConnection')).isEnabled());
    await driver.findElement(webdriver.By.id('createPeerConnection')).click();

    await driver.wait(() => driver.findElement(webdriver.By.id('createOffer')).isEnabled());
    await driver.findElement(webdriver.By.id('createOffer')).click();

    await driver.wait(() => driver.findElement(webdriver.By.id('setOffer')).isEnabled());
    await driver.findElement(webdriver.By.id('setOffer')).click();

    await driver.wait(() => driver.findElement(webdriver.By.id('createAnswer')).isEnabled());
    await driver.findElement(webdriver.By.id('createAnswer')).click();

    await driver.wait(() => driver.findElement(webdriver.By.id('setAnswer')).isEnabled());
    await driver.findElement(webdriver.By.id('setAnswer')).click();

    await driver.wait(() => driver.findElement(webdriver.By.id('hangup')).isEnabled());
    await driver.wait(() => driver.findElement(webdriver.By.id('createOffer')).isEnabled());

    await Promise.all([
      await driver.wait(() => driver.executeScript(() => {
        return localPeerConnection && localPeerConnection.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
      await driver.wait(() => driver.executeScript(() => {
        return remotePeerConnection && remotePeerConnection.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
    ]);
  });

  // TODO: add test to ensure the text fields are properly filled
});
