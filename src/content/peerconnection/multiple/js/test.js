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

let driver;
const path = '/src/content/peerconnection/multiple/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('multiple peerconnections', () => {
  before(() => {
    driver = seleniumHelpers.buildDriver();
  });
  after(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('establishes multiple connections and hangs up', async () => {
    await driver.findElement(webdriver.By.id('startButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled());
    await driver.findElement(webdriver.By.id('callButton')).click();

    await Promise.all([
      driver.wait(() => driver.executeScript(() => {
        return pc1Remote && pc1Remote.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
      await driver.wait(() => driver.executeScript(() => {
        return pc2Remote && pc2Remote.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
    ]);

    await Promise.all([
      await driver.wait(() => driver.executeScript(() => {
        return document.getElementById('video2').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
      })),
      await driver.wait(() => driver.executeScript(() => {
        return document.getElementById('video3').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
      })),
    ]);

    await driver.findElement(webdriver.By.id('hangupButton')).click();

    await Promise.all([
      await driver.wait(() => driver.executeScript(() => {
        return pc1Remote === null; // eslint-disable-line no-undef
      })),
      await driver.wait(() => driver.executeScript(() => {
        return pc2Remote === null; // eslint-disable-line no-undef
      })),
    ]);
  });
});

