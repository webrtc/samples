/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'It should have a video element with specific width': (browser) => {
    const path = '/src/content/getusermedia/resolution/index.html';
    const url = 'file://' + process.cwd() + path;

    browser
        .url(url)
        .click('button#qvga')
        .pause(500)
        .waitForElementVisible('video', 5000)
        .waitForMediaPlaybackReady('video', 10000)
        .assert.videoWidth('video', 320, 'Video width is 320 wide.')
        .click('button#vga')
        .pause(500)
        .waitForElementVisible('video', 5000)
        .waitForMediaPlaybackReady('video', 10000)
        .assert.videoWidth('video', 640, 'Video width is 640 wide.')
        .click('button#hd')
        .pause(500)
        .waitForElementVisible('video', 5000)
        .waitForMediaPlaybackReady('video', 10000)
        .assert.videoWidth('video', 1280, 'Video width is 1280 wide.')
        .end();
  }
};