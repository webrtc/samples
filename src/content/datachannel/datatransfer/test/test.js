/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'It should transfer data over data channel': (browser) => {
    const path = '/src/content/datachannel/datatransfer/index.html';
    const url = 'file://' + process.cwd() + path;

    // Disable this until https://github.com/webrtc/samples/pull/1110 is merged
    if (browser.options.desiredCapabilities.browserName === 'safari') {
      browser.end();
      return;
    }

    browser.url(url).waitForElementVisible('#sendTheData');
    browser.click('#sendTheData');
    browser.expect.element('#transferStatus').text.to.equal('Data transfer completed successfully!');
    browser.end();
  }
};
