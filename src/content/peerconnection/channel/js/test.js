/*
 *  Copyright (c) 2022 The WebRTC project authors. All Rights Reserved.
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
const path = '/src/content/peerconnection/channel/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('peerconnection and broadcast channels', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(async () => {
    await driver.get(url);
  });

  it('establishes a connection and hangs up', async () => {
    const firstTab = await driver.getWindowHandle();

    await driver.switchTo().window(firstTab);
    await driver.findElement(webdriver.By.id('startButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));

    // Create a second tab, switch to it.
    await driver.switchTo().newWindow('tab');
    const secondTab = await driver.getWindowHandle();
    await driver.get(url);

    await driver.switchTo().window(secondTab);
    await driver.findElement(webdriver.By.id('startButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));

    // Assert state in first tab.
    await driver.switchTo().window(firstTab);
    await driver.wait(() => driver.executeScript(() => {
      return pc && pc.connectionState === 'connected'; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('remoteVideo').readyState === 4;
    }));

    // Assert state in second tab.
    await driver.switchTo().window(secondTab);
    await driver.wait(() => driver.executeScript(() => {
      return pc && pc.connectionState === 'connected'; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('remoteVideo').readyState === 4;
    }));
  });
});

