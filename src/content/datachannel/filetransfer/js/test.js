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
const path = '/src/content/datachannel/filetransfer/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('datachannel filetransfer', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('transfers a file', async () => {
    await driver.findElement(webdriver.By.id('fileInput'))
        .sendKeys(process.cwd() + '/src/content/devices/multi/images/poster.jpg');
    await driver.wait(() => driver.findElement(webdriver.By.id('sendFile')).isEnabled());
    await driver.findElement(webdriver.By.id('sendFile')).click();

    // the remote connection gets closed when it is done.
    await driver.wait(() => driver.executeScript(() => {
      return remoteConnection === null; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.findElement(webdriver.By.id('download')).isEnabled());
  });
});

