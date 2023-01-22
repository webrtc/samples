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
const path = '/src/content/insertable-streams/endtoend-encryption/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('insertable streams e2ee', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('establishes a connection and hangs up', async () => {
    await driver.findElement(webdriver.By.id('startButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));

    await driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled());
    await driver.findElement(webdriver.By.id('callButton')).click();

    await Promise.all([
      await driver.wait(() => driver.executeScript(() => {
        return startToEnd && startToEnd.pc1 && startToEnd.pc1.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
      await driver.wait(() => driver.executeScript(() => {
        return startToEnd && startToEnd.pc2 && startToEnd.pc2.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
    ]);

    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('video2').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
    }));

    await driver.findElement(webdriver.By.id('hangupButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return startToEnd && startToEnd.pc1 && startToEnd.pc1.connectionState === 'closed'; // eslint-disable-line no-undef
    }));
  });

  it('establisheѕ a encrypted connection with a key set prior to connecting', async () => {
    await driver.findElement(webdriver.By.id('startButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));

    await driver.findElement(webdriver.By.id('crypto-key'))
        .sendKeys('secret\n');
    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('banner').innerText === 'Encryption is ON';
    }));

    await driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled());
    await driver.findElement(webdriver.By.id('callButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('video2').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
    }));
  });
});

