/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */
'use strict';
export default {
  'It should have select elements for each media device': (browser) => {
    const path = '/src/content/peerconnection/pc1/index.html';
    const url = 'file://' + process.cwd() + path;

    browser.url(url).waitForElementVisible('#startButton', 1000, 'Check that the startButton button is visible');
    browser.waitForReadyState('#localVideo', 0, 1000);
    browser.waitForReadyState('#remoteVideo', 0, 1000);
    browser.expect.element('#callButton').to.not.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.not.be.enabled.before(1000);
    browser.click('#startButton');
    browser.expect.element('#startButton').to.not.be.enabled.before(1000);
    browser.expect.element('#callButton').to.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.not.be.enabled.before(1000);
    browser.waitForReadyState('#localVideo', 4, 1000);
    browser.click('#callButton');
    browser.waitForReadyState('#remoteVideo', 4, 1000);
    browser.expect.element('#startButton').to.not.be.enabled.before(1000);
    browser.expect.element('#callButton').to.not.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.be.enabled.before(1000);
    browser.click('#hangupButton');
    browser.expect.element('#startButton').to.not.be.enabled.before(1000);
    browser.expect.element('#callButton').to.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.not.be.enabled.before(1000);
    browser.end();
  }
};
