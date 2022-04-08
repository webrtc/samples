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
const path = '/src/content/peerconnection/trickle-ice/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('Trickle-Ice', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });
  afterEach(() => {
    return driver.executeScript(() => localStorage.clear());
  });

  it('gathers a candidate', async () => {
    await driver.findElement(webdriver.By.id('gather')).click();
    await driver.wait(() => driver.executeScript(() => pc === null && candidates.length > 0), 30 * 1000); // eslint-disable-line no-undef
  });

  it('loads server data on double click', async () => {
    const element = await driver.findElement(webdriver.By.css('#servers>option'));
    const actions = driver.actions({async: true});
    await actions.doubleClick(element).perform();
    const value = await driver.findElement(webdriver.By.id('url')).getAttribute('value');
    expect(value).to.not.equal('');
  });

  it('adding a server', async () => {
    await driver.findElement(webdriver.By.id('url'))
        .sendKeys('stun:stun.l.google.com:19302');
    await driver.findElement(webdriver.By.id('add')).click();
    const length = await driver.findElement(webdriver.By.css('#servers'))
        .getAttribute('length');
    expect(length >>> 0).to.equal(2);
  });

  it('removing a server', async () => {
    await driver.findElement(webdriver.By.css('#servers>option')).click();
    await driver.findElement(webdriver.By.id('remove')).click();
    const length = await driver.findElement(webdriver.By.css('#servers'))
        .getAttribute('length');
    expect(length >>> 0).to.equal(0);
  });
});
