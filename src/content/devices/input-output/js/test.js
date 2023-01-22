/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node, mocha */
'use strict';

const seleniumHelpers = require('../../../../../test/webdriver');

let driver;
const path = '/src/content/devices/input-output/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('input-output', () => {
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
      return document.getElementById('audioSource').childElementCount > 0;
    }));
  });

  it('shows at least one video input device', async () => {
    await driver.wait(driver.executeScript(() => {
      return document.getElementById('videoSource').childElementCount > 0;
    }));
  });

  it('shows at least one audio output device device', async function() {
    if (process.env.BROWSER === 'firefox') {
      this.skip();
    }
    await driver.wait(driver.executeScript(() => {
      return document.getElementById('audioOutput').childElementCount > 0;
    }));
  });
});

