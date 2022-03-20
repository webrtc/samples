/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
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
const path = '/src/content/devices/input-output/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe.skip('input-output', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('shows at least one audio input device', async () => {
    await driver.wait(driver.executeScript(() => {
      window.stream !== undefined; // eslint-disable-line no-undef
    }));
    const numberOfSources = await driver.findElement(webdriver.By.id('audioSource'))
        .getAttribute('childElementCount');
    expect(numberOfSources >>> 0).to.be.above(0);
  });

  it('shows at least one video input device', async () => {
    await driver.wait(driver.executeScript(() => {
      window.stream !== undefined; // eslint-disable-line no-undef
    }));
    const numberOfSources = await driver.findElement(webdriver.By.id('videoSource'))
        .getAttribute('childElementCount');
    expect(numberOfSources >>> 0).to.be.above(0);
  });

  it('shows at least one audio output device device', async function() {
    if (process.env.BROWSER === 'firefox') {
      this.skip();
    }
    await driver.wait(driver.executeScript(() => {
      window.stream !== undefined; // eslint-disable-line no-undef
    }));
    const numberOfSinks = await driver.findElement(webdriver.By.id('audioOutput'))
        .getAttribute('childElementCount');
    expect(numberOfSinks >>> 0).to.be.above(0);
  });
});

