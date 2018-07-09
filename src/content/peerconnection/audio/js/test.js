/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */

'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
const test = require('tape');

test('Audio-only sample codec preference', t => {
  const webdriver = require('selenium-webdriver');
  const seleniumHelpers = require('webrtc-utilities').seleniumLib;
  const driver = seleniumHelpers.buildDriver();
  if (process.env.BROWSER === 'firefox') {
    t.pass('Firefox not supported yet');
    t.end();
    return;
  }
  let trackId;

  const path = '/src/content/peerconnection/audio/index.html';
  const url = (process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())) + path;
  driver.get(url);
  const codecs = ['opus', 'ISAC', 'G722', 'PCMU'];

  let last;
  codecs.forEach(codecName => {
    last = driver.findElement(webdriver.By.css(
      '#codec>option[value="' + codecName + '"]'))
      .click()
      .then(() => driver.findElement(webdriver.By.id('callButton')).click())
      .then(() => driver.wait(() => driver.executeScript(
        'return pc2 && pc2.iceConnectionState === \'connected\';'), 30 * 1000))
      .then(() => driver.executeScript('return localStream.getAudioTracks()[0].id;'))
      .then(id => {
        trackId = id;
        return seleniumHelpers.getStats(driver, 'pc1');
      })
      .then(stats => {
        // Find the sending audio track.
        stats.forEach(report => {
          if (report.type === 'outbound-rtp') {
            const trackStats = stats.get(report.trackId);
            if (trackStats && trackStats.trackIdentifier === trackId) {
              const codecStats = stats.get(report.codecId);
              if (codecStats) {
                t.ok('audio/' + codecName === codecStats.mimeType, 'preferring ' + codecName);
              }
            }
          }
        });
        return driver.findElement(webdriver.By.id('hangupButton')).click();
      })
      .then(() => driver.wait(() => driver.executeScript('return pc1 === null'), 30 * 1000));
  });

  last
    .then(() => t.end())
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});
