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
  'Video and buttons state change during multiple peer connection setup': (browser) => {
    const path = '/src/content/peerconnection/multiple/index.html';
    const url = 'file://' + process.cwd() + path;

    browser.url(url).waitForElementVisible('#startButton', 1000, 'Check that the start button is visible');
    browser.waitForReadyState('#video1', 0, 1000);
    browser.waitForReadyState('#video2', 0, 1000);
    browser.waitForReadyState('#video3', 0, 1000);
    browser.expect.element('#callButton').to.not.be.enabled.before(1000);
    browser.click('#startButton');
    browser.waitForReadyState('#video1', 4, 1000);
    browser.expect.element('#callButton').to.be.enabled.before(1000);
    browser.expect.element('#hangupButton').to.not.be.enabled.before(1000);
    browser.click('#callButton');
    browser.waitForReadyState('#video2', 4, 1000);
    browser.waitForReadyState('#video3', 4, 1000);
    browser.expect.element('#hangupButton').to.be.enabled.before(1000);
    browser.end();
  }
};
