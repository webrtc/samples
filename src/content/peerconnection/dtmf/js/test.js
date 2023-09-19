/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/*
/* eslint-env node */
'use strict';

const webdriver = require('selenium-webdriver');
const seleniumHelpers = require('../../../../../test/webdriver');

let driver;
const path = '/src/content/peerconnection/dtmf/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('peerconnection dtmf', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(async () => {
    await driver.get(url);
    await driver.findElement(webdriver.By.id('callButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.executeScript(() => {
      return pc2 && pc2.connectionState === 'connected'; // eslint-disable-line no-undef
    }));
  });

  it('sends the digit 1', async () => {
    await driver.findElement(webdriver.By.css('#dialPad>div:nth-child(1)>button:nth-child(1)')).click();
    await driver.wait(driver.executeScript(() => {
      document.getElementById('sentTones').value.length !== 0;
    }));
    const sentTones = await driver.findElement(webdriver.By.id('sentTones')).getAttribute('value');
    expect(sentTones).toBe('1 ');
  });

  it('sends the digit 9', async () => {
    await driver.findElement(webdriver.By.css('#dialPad>div:nth-child(3)>button:nth-child(1)')).click();
    await driver.wait(driver.executeScript(() => {
      document.getElementById('sentTones').value.length !== 0;
    }));
    const sentTones = await driver.findElement(webdriver.By.id('sentTones')).getAttribute('value');
    expect(sentTones).toBe('9 ');
  });

  it('sends the #', async () => {
    await driver.findElement(webdriver.By.css('#dialPad>div:nth-child(3)>button:nth-child(4)')).click();
    await driver.wait(driver.executeScript(() => {
      document.getElementById('sentTones').value.length !== 0;
    }));
    const sentTones = await driver.findElement(webdriver.By.id('sentTones')).getAttribute('value');
    expect(sentTones).toBe('# ');
  });

  it('sends the A', async () => {
    await driver.findElement(webdriver.By.css('#dialPad>div:nth-child(4)>button:nth-child(1)')).click();
    await driver.wait(driver.executeScript(() => {
      document.getElementById('sentTones').value.length !== 0;
    }));
    const sentTones = await driver.findElement(webdriver.By.id('sentTones')).getAttribute('value');
    expect(sentTones).toBe('A ');
  });
});

