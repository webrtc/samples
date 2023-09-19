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
const path = '/src/content/peerconnection/restart-ice/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('peerconnection ice restart', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('establishes a connection and changes candidates on restart', async () => {
    await driver.findElement(webdriver.By.id('startButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));

    await driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled());
    await driver.findElement(webdriver.By.id('callButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return pc1 && pc1.connectionState === 'connected'; // eslint-disable-line no-undef
    }));
    await driver.wait(() => driver.executeScript(() => {
      return pc2 && pc2.connectionState === 'connected'; // eslint-disable-line no-undef
    }));

    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('remoteVideo').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
    }));
    await driver.wait(() => driver.findElement(webdriver.By.id('restartButton')).isEnabled());

    const firstCandidateIds = await Promise.all([
      await driver.findElement(webdriver.By.id('localCandidateId')).getAttribute('innerText'),
      await driver.findElement(webdriver.By.id('remoteCandidateId')).getAttribute('innerText'),
    ]);

    await driver.wait(() => driver.findElement(webdriver.By.id('restartButton')).isEnabled());
    await driver.findElement(webdriver.By.id('restartButton')).click();

    await driver.wait(() => driver.findElement(webdriver.By.id('restartButton')).isEnabled());

    const secondCandidateIds = await Promise.all([
      await driver.findElement(webdriver.By.id('localCandidateId')).getAttribute('innerText'),
      await driver.findElement(webdriver.By.id('remoteCandidateId')).getAttribute('innerText'),
    ]);

    expect(secondCandidateIds[0]).not.toBe(firstCandidateIds[0]);
    expect(secondCandidateIds[1]).not.toBe(firstCandidateIds[1]);
  });
});
