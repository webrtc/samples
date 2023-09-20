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
const path = '/src/content/peerconnection/change-codecs/index.html';
const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;

describe('peerconnection with setCodecPreferences', () => {
  beforeAll(() => {
    driver = seleniumHelpers.buildDriver();
  });
  afterAll(() => {
    return driver.quit();
  });

  beforeEach(() => {
    return driver.get(url);
  });

  ['video/VP8'].forEach(codec => {
    it('establishes a connection', async () => {
      await driver.findElement(webdriver.By.id('startButton')).click();

      await driver.wait(() => driver.executeScript(() => {
        return localStream !== null; // eslint-disable-line no-undef
      }));
      await driver.wait(() => driver.executeScript(() => {
        return codecPreferences.disabled === false; // eslint-disable-line no-undef
      }));
      await driver.findElement(webdriver.By.id('codecPreferences')).click();
      await driver.findElement(webdriver.By.css('option[value=\'video/VP8\']')).click();

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
        return document.getElementById('remoteVideo').readyState === HTMLMediaElement.HAVE_ENOUGH_DATA;
      }));

      await driver.wait(() => driver.executeScript(() => {
        return document.getElementById('actualCodec').innerText !== '';
      }));
      const actualCodec = await driver.findElement(webdriver.By.id('actualCodec')).getAttribute('innerText');
      expect(actualCodec.startsWith('Using ' + codec)).toBe(true);
    });
  });
});

