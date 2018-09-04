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
  'Checking that the ICE candidates are populated when the button is pressed.': (browser) => {
    const path = '/src/content/peerconnection/trickle-ice/index.html';
    const url = 'file://' + process.cwd() + path;

    browser.url(url).waitForElementVisible('#gather', 1000, 'Check that the gather candidate button is visible');
    browser.expect.element('tbody#candidatesBody tr:first-child').to.not.be.present.before(100);
    browser.click('#gather');
    browser.expect.element('tbody#candidatesBody tr:first-child').to.be.visible.before(5000);
    browser.end();
  }
};
