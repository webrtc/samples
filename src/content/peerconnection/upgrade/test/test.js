/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';
export default {
  'Checking that video is enabled when call is upgraded': (browser) => {
    const path = '/src/content/peerconnection/upgrade/index.html';
    const url = 'file://' + process.cwd() + path;

    browser.url(url).waitForElementVisible('#startButton', 1000, 'Check that the start button is visible');
    browser.expect.element('#callButton').to.not.be.enabled.before(1000);
    browser.expect.element('#upgradeButton').to.not.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.not.be.enabled.before(1000);
    browser.waitForReadyState('#localVideo', 0, 1000);
    browser.waitForReadyState('#remoteVideo', 0, 1000);
    browser.click('#startButton');
    browser.expect.element('#startButton').to.not.be.enabled.before(1000);
    browser.expect.element('#callButton').to.be.enabled.before(1000);
    browser.expect.element('#upgradeButton').to.not.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.not.be.enabled.before(1000);
    browser.click('#callButton');
    browser.expect.element('#startButton').to.not.be.enabled.before(1000);
    browser.expect.element('#callButton').to.not.be.enabled.before(1000);
    browser.expect.element('#upgradeButton').to.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.be.enabled.before(1000);
    browser.click('#upgradeButton');
    browser.waitForReadyState('#localVideo', 4, 5000);
    browser.waitForReadyState('#remoteVideo', 4, 5000);
    browser.expect.element('#startButton').to.not.be.enabled.before(1000);
    browser.expect.element('#callButton').to.not.be.enabled.before(1000);
    browser.expect.element('#upgradeButton').to.not.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.be.enabled.before(1000);
    browser.click('#hangupButton');
    browser.expect.element('#startButton').to.not.be.enabled.before(1000);
    browser.expect.element('#callButton').to.be.enabled.before(1000);
    browser.expect.element('#upgradeButton').to.not.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.not.be.enabled.before(1000);
    browser.end();
  }
};
