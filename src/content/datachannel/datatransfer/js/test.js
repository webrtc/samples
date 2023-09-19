/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
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
const path = '/src/content/datachannel/datatransfer/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('datachannel datatransfer', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('transfers data', async () => {
    const megsToSend = 4;
    await driver.findElement(webdriver.By.id('megsToSend'))
        .clear();
    await driver.findElement(webdriver.By.id('megsToSend'))
        .sendKeys(megsToSend + '\n');

    await driver.findElement(webdriver.By.id('sendTheData')).click();

    await Promise.all([
      driver.wait(() => driver.executeScript(() => {
        return localConnection && localConnection.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
      await driver.wait(() => driver.executeScript(() => {
        return remoteConnection && remoteConnection.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
    ]);

    // the remote connection gets closed when it is done.
    await driver.wait(() => driver.executeScript(() => {
      return remoteConnection === null; // eslint-disable-line no-undef
    }));

    const transferred = await driver.findElement(webdriver.By.id('receiveProgress')).getAttribute('value');
    expect(transferred >>> 0).toBe(megsToSend * 1024 * 1024);
  });
});
