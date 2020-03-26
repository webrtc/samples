/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'It should transfer text over data channel': (browser) => {
    const path = '/src/content/datachannel/basic/index.html';
    const url = 'file://' + process.cwd() + path;

    // Disable this until https://github.com/webrtc/samples/pull/1110 is merged
    if (browser.options.desiredCapabilities.browserName === 'safari') {
      browser.end();
      return;
    }

    browser
        .url(url)
        .click('#startButton')
        .expect.element('#sendButton').to.be.enabled.before(50);
    browser.expect.element('#dataChannelSend').to.be.enabled.before(50);

    browser.setValue('#dataChannelSend', 'HELLO, WORLD!');
    browser
        .click('#sendButton')
        .pause(50)
        .assert.value('#dataChannelReceive', 'HELLO, WORLD!');

    browser
        .click('#closeButton')
        .expect.element('#sendButton').to.not.be.enabled.before(50);

    browser.end();
  }
};