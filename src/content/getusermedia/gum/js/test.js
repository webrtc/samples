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
const path = '/src/content/getusermedia/gum/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('getUserMedia', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('opens a camera', async () => {
    await driver.findElement(webdriver.By.css('button')).click();
    await driver.wait(() => driver.executeScript(() =>
      document.querySelector('video').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA)
    );
    const width = await driver.findElement(webdriver.By.css('video')).getAttribute('videoWidth');
    expect(width >>> 0).toBeGreaterThan(320);
  });
});

