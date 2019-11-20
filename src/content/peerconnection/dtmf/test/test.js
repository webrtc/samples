/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'It should send DTMF codes': (browser) => {
    const path = '/src/content/peerconnection/dtmf/index.html';
    const url = 'file://' + process.cwd() + path;

    if (browser.options.desiredCapabilities.browserName === 'safari') {
      browser.end();
      return;
    }

    browser
        .url(url)
        .click('#callButton')
        .waitForMediaPlaybackReady('audio', 1000, 'Receiving remote audio.')
        .useXpath()
        .click('/html/body/div/div[@id=\'dialPad\']/div[1]/button[1]') // 1
        .click('/html/body/div/div[@id=\'dialPad\']/div[3]/button[1]') // 9
        .click('/html/body/div/div[@id=\'dialPad\']/div[3]/button[4]') // #
        .click('/html/body/div/div[@id=\'dialPad\']/div[4]/button[1]') // A
        .useCss()
        .assert.value('input#sentTones', '1 9 # A ')
        .click('#hangupButton')
        .end();
  }
};
