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
const path = '/src/content/peerconnection/states/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('peerconnection states', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  it('establishes a connection and hangs up', async () => {
    await driver.findElement(webdriver.By.id('startButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return localStream !== null; // eslint-disable-line no-undef
    }));

    await driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled());
    await driver.findElement(webdriver.By.id('callButton')).click();

    await Promise.all([
      await driver.wait(() => driver.executeScript(() => {
        return pc1 && pc1.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
      await driver.wait(() => driver.executeScript(() => {
        return pc2 && pc2.connectionState === 'connected'; // eslint-disable-line no-undef
      })),
    ]);

    await driver.wait(() => driver.executeScript(() => {
      return document.getElementById('video2').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
    }));

    const pc1States = {
      signaling: await driver.findElement(webdriver.By.id('pc1SignalState')).getAttribute('innerText'),
      ice: await driver.findElement(webdriver.By.id('pc1IceState')).getAttribute('innerText'),
      connection: await driver.findElement(webdriver.By.id('pc1ConnState')).getAttribute('innerText'),
    };
    expect(pc1States.signaling).toBe('stable => have-local-offer => stable');
    expect(pc1States.ice).toBe('new => checking => connected');
    expect(pc1States.connection).toBe('new => connecting => connected');

    const pc2States = {
      signaling: await driver.findElement(webdriver.By.id('pc2SignalState')).getAttribute('innerText'),
      ice: await driver.findElement(webdriver.By.id('pc2IceState')).getAttribute('innerText'),
      connection: await driver.findElement(webdriver.By.id('pc2ConnState')).getAttribute('innerText'),
    };
    expect(pc2States.signaling).toBe('stable => have-remote-offer => stable');
    expect(pc2States.ice).toBe('new => checking => connected');
    expect(pc2States.connection).toBe('new => connecting => connected');

    await driver.findElement(webdriver.By.id('hangupButton')).click();

    await driver.wait(() => driver.executeScript(() => {
      return pc1 === null; // eslint-disable-line no-undef
    }));
  });
});

