/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';
const webdriver = require('selenium-webdriver');
const seleniumHelpers = require('../../../../../test/webdriver');

let driver;
const path = '/src/content/peerconnection/audio/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('audio-only peerconnection', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('establishes a connection', async () => {
    await driver.findElement(webdriver.By.id('callButton')).click();
    await driver.wait(() => driver.executeScript(() => {
      return pc1 && pc1.connectionState === 'connected'; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.executeScript(() => {
      return pc2 && pc2.connectionState === 'connected'; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('audio2').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
    }));
  });

  // TODO: assert usage of different codecs via getStats.
});

