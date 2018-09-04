/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'Recording of video is working.': (browser) => {
    const path = '/src/content/getusermedia/record/index.html';
    const url = 'file://' + process.cwd() + path;

    browser.url(url).waitForElementVisible('button#record', 1000);
    browser.click('button#record');
    browser.waitForReadyState('video#gum', 4, 5000);
    browser.pause(1000);
    browser.click('button#record');
    browser.expect.element('button#play').to.be.enabled.before(1000);
    browser.click('button#play');
    browser.waitForReadyState('video#recorded', 4, 5000);
    browser.end();
  }
};