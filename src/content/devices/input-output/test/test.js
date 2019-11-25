/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'It should have select elements for each media device': (browser) => {
    const path = '/src/content/devices/input-output/index.html';
    const url = 'file://' + process.cwd() + path;

    // audio output is't supported on Safari or Firefox
    const browserName = browser.options.desiredCapabilities.browserName;
    if (browserName === 'firefox' || browserName === 'safari') {
      browser
          .url(url)
          .waitForElementVisible('#audioSource option:nth-of-type(1)', 1000, 'Check that there is at least one audio source')
          .waitForElementVisible('#videoSource option:nth-of-type(1)', 1000, 'Check that there is at least one video source')
          .end();
      return;
    }

    browser
        .url(url)
        .waitForElementVisible('#audioSource option:nth-of-type(1)', 1000, 'Check that there is at least one audio source')
        .waitForElementVisible('#audioOutput option:nth-of-type(1)', 1000, 'Check that there is at least one audio output')
        .waitForElementVisible('#videoSource option:nth-of-type(1)', 1000, 'Check that there is at least one video source')
        .end();
  }
};