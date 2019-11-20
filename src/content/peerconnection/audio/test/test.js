/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
export default {
  'It should play audio remote': (browser) => {
    const path = '/src/content/peerconnection/audio/index.html';
    const url = 'file://' + process.cwd() + path;

    // TODO Test all codecs?
    browser
        .url(url)
        .click('#callButton')
        .waitForMediaPlaybackReady('#audio2', 5000, 'Receiving remote audio.')
        .end();
  }
};