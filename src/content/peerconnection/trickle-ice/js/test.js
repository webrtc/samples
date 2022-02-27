/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */

'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
const test = require('tape');

const webdriver = require('selenium-webdriver');
const seleniumHelpers = require('../../../../../test/webdriver');

test('Candidate Gathering', t => {
  const driver = seleniumHelpers.buildDriver();

  const path = '/src/content/peerconnection/trickle-ice/index.html';
  const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;
  driver.get(url)
    .then(() => {
      t.pass('page loaded');
      return driver.findElement(webdriver.By.id('gather')).click();
    })
    .then(() => driver.wait(() => driver.executeScript('return pc === null && candidates.length > 0;'), 30 * 1000))
    .then(() => {
      t.pass('got candidates');
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});

// Skipping. webdriver.ActionSequence is not implemented in
// marionette/geckodriver hence we cannot double click the server option
// menu without hacks.
test('Loading server data', {skip: true}, t => {
  const driver = seleniumHelpers.buildDriver();

  const path = '/src/content/peerconnection/trickle-ice/index.html';
  const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;
  driver.get(url)
    .then(() => {
      t.pass('page loaded');
      return driver.findElement(webdriver.By.css('#servers>option'));
    })
    .then(element => new webdriver.ActionSequence(driver).doubleClick(element).perform())
    .then(() => driver.findElement(webdriver.By.id('url')).getAttribute('value'))
    .then(value => {
      t.ok(value !== '', 'doubleclick loads server data');
      t.end();
    })
    .then(null, err => {
      driver.wait(() => driver.executeScript('return pc === null && candidates.length > 0;'), 30 * 1000);
        /*
      t.fail(err);
      t.end();
      */
    });
});


// Disabling on firefox until sendKeys is fixed.
// https://github.com/mozilla/geckodriver/issues/683
test('Adding a server', {skip: process.env.BROWSER === 'firefox'}, t => {
  const driver = seleniumHelpers.buildDriver();

  const path = '/src/content/peerconnection/trickle-ice/index.html';
  const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;
  driver.get(url)
    .then(() => {
      t.pass('page loaded');
      return driver.findElement(webdriver.By.id('url'))
        .sendKeys('stun:stun.l.google.com:19302');
    })
    .then(() => {
      t.pass('url input worked');
      return driver.findElement(webdriver.By.id('add')).click();
    })
    .then(() => driver.findElement(webdriver.By.css('#servers'))
      .getAttribute('length'))
    .then(length => {
      t.ok(length === '2', 'server added');
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});

test('Removing a server', {skip: process.env.BROWSER === 'firefox'}, t => {
  const driver = seleniumHelpers.buildDriver();

  const path = '/src/content/peerconnection/trickle-ice/index.html';
  const url = `${process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())}${path}`;
  driver.get(url)
    .then(() => {
      t.pass('page loaded');
      return driver.findElement(webdriver.By.css('#servers>option')).click();
    })
    .then(() => driver.findElement(webdriver.By.id('remove')).click())
    .then(() => driver.findElement(webdriver.By.css('#servers'))
      .getAttribute('length'))
    .then(length => {
      t.ok(length === '0', 'server removed');
      t.end();
    })
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});
