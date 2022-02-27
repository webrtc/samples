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
const {expect} = require('chai');

let driver;
const path = '/src/content/datachannel/basic/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('datachannel basic', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('transfers text', async () => {
    const text = 'Hello world';
    await driver.findElement(webdriver.By.id('startButton')).click();

    await Promise.all([
      driver.wait(() => driver.executeScript(() => {
        return localConnection && localConnection.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
      await driver.wait(() => driver.executeScript(() => {
        return remoteConnection && remoteConnection.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
    ]);
    await driver.wait(() => driver.findElement(webdriver.By.id('sendButton')).isEnabled());

    await driver.findElement(webdriver.By.id('dataChannelSend'))
        .sendKeys(text);
    await driver.findElement(webdriver.By.id('sendButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('dataChannelReceive').value.length > 0;
    }));

    const value = await driver.findElement(webdriver.By.id('dataChannelReceive')).getAttribute('value');
    expect(value).to.equal(text);
  });
});
