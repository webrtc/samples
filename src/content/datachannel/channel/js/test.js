/*
 *  Copyright (c) 2022 The WebRTC project authors. All Rights Reserved.
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
const path = '/src/content/datachannel/channel/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('datachannel and broadcast channels', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(async () => {
    await driver.get(url);
  });

  it('establishes a connection and sends a message back and forth', async () => {
    const firstHello = 'First tab to second tab';
    const secondHello = 'Second tab to first tab';

    const firstTab = await driver.getWindowHandle();

    // Create a second tab, switch to it.
    await driver.switchTo().newWindow('tab');
    const secondTab = await driver.getWindowHandle();
    await driver.get(url);

    await driver.switchTo().window(firstTab);
    await driver.findElement(webdriver.By.id('startButton')).click();

    // Assert state in first tab.
    await driver.switchTo().window(firstTab);
    await driver.wait(() => driver.executeScript(() => {
      return pc && pc.connectionState === 'connected'; // eslint-disable-line no-undef
    }));

    // Assert state in second tab.
    await driver.switchTo().window(secondTab);
    await driver.wait(() => driver.executeScript(() => {
      return pc && pc.connectionState === 'connected'; // eslint-disable-line no-undef
    }));

    // Send a message from the first tab to the second tab.
    await driver.switchTo().window(firstTab);
    await driver.wait(() => driver.findElement(webdriver.By.id('sendButton')).isEnabled());

    await driver.findElement(webdriver.By.id('dataChannelSend'))
        .sendKeys(firstHello);
    await driver.findElement(webdriver.By.id('sendButton')).click();

    // Assert it was received.
    await driver.switchTo().window(secondTab);
    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('dataChannelReceive').value.length > 0;
    }));
    const fromFirst= await driver.findElement(webdriver.By.id('dataChannelReceive')).getAttribute('value');
    expect(fromFirst).toBe(firstHello);

    // Send a message from the second tab to the first tab.
    await driver.switchTo().window(secondTab);
    await driver.wait(() => driver.findElement(webdriver.By.id('sendButton')).isEnabled());

    await driver.findElement(webdriver.By.id('dataChannelSend'))
        .sendKeys(secondHello);
    await driver.findElement(webdriver.By.id('sendButton')).click();

    // Assert it was received.
    await driver.switchTo().window(firstTab);
    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('dataChannelReceive').value.length > 0;
    }));
    const fromSecond = await driver.findElement(webdriver.By.id('dataChannelReceive')).getAttribute('value');
    expect(fromSecond).toBe(secondHello);
  });
});

