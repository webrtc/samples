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
const path = '/src/content/getusermedia/resolution/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('getUserMedia resolutions', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  const buttonToResolution = {
    'qvga': 320,
    'vga': 640,
    'hd': 1280,
    'full-hd': 1920,
    'televisionFourK': 3840,
    /* TODO: unsupported by fake device? Or is fake device limited to physical device resolution?
    'cinemaFourK': 4096,
    'eightK': 8192,
    */
  };
  Object.keys(buttonToResolution).forEach(buttonId => {
    const resolution = buttonToResolution[buttonId];

    it(`opens a camera with width ${resolution}px`, async () => {
      await driver.findElement(webdriver.By.id(buttonId)).click();
      await driver.wait(() => driver.executeScript(() =>
        document.querySelector('video').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA)
      );
      const width = await driver.findElement(webdriver.By.css('video')).getAttribute('videoWidth');
      expect(width >>> 0).toBe(resolution);
    });
  });
});

