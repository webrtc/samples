/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

export default {
  'It should transfer a file over a datachannel': (browser) => {
    const path = '/src/content/datachannel/filetransfer/index.html';
    const url = 'file://' + process.cwd() + path;

    browser
      .url(url)
      .waitForElementNotVisible('#download', 100, 'File download link is not visible')
      .waitForElementVisible('#fileInput', 1000)
      .setValue('#fileInput', process.cwd() + '/src/content/devices/multi/images/poster.jpg')
      .waitForElementVisible('#download', 10000, 'File download link is visible')
      .end();
  }
};