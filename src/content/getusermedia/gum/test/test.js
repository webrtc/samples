/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'It should have a video element': (browser) => {
    const path = '/src/content/getusermedia/gum/index.html';
    const url = 'file://' + process.cwd() + path;

    browser
      .url(url)
      .waitForElementVisible('video', 5000)
      .waitForMediaPlaybackReady('video', 5000)
      .end();
  }
};