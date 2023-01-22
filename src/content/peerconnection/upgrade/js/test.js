/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
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
const path = '/src/content/peerconnection/upgrade/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('peerconnection upgrade from audio-only to audio-video', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('upgrades to video', async () => {
    await driver.findElement(webdriver.By.id('startButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled());
    await driver.findElement(webdriver.By.id('callButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return pc2 && pc2.connectionState === 'connected'; // eslint-disable-line no-undef
    }));

    await driver.wait(() => driver.findElement(webdriver.By.id('upgradeButton')).isEnabled());
    await driver.findElement(webdriver.By.id('upgradeButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return remoteVideo.videoWidth > 0; // eslint-disable-line no-undef
    }));

    await driver.wait(() => driver.findElement(webdriver.By.id('hangupButton')).isEnabled());
    await driver.findElement(webdriver.By.id('hangupButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return pc1 === null; // eslint-disable-line no-undef
    }));
  });
});

