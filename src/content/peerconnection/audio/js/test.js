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
var test = require('tape');

var webdriver = require('selenium-webdriver');
var seleniumHelpers = require('webrtc-utilities').seleniumLib;

test('Audio-only sample codec preference', function(t) {
  if (process.env.BROWSER === 'firefox') {
    t.pass('Firefox not supported yet');
    t.end();
    return;
  }
  var trackId;
  var driver = seleniumHelpers.buildDriver();

  driver.get((process.env.BASEURL ? process.env.BASEURL :
      ('file://' + process.cwd())) +
      '/src/content/peerconnection/audio/index.html');
  var codecs = ['opus', 'ISAC', 'G722', 'PCMU'];

  var last;
  codecs.forEach(function(codecName) {
    last = driver.findElement(webdriver.By.css(
        '#codec>option[value="' + codecName + '"]'))
    .click()
    .then(function() {
      return driver.findElement(webdriver.By.id('callButton')).click();
    })
    .then(function() {
      return driver.wait(function() {
        return driver.executeScript(
            'return pc2 && pc2.iceConnectionState === \'connected\';');
      }, 30 * 1000);
    })
    .then(function() {
      return driver.executeScript('return localStream.getAudioTracks()[0].id;');
    })
    .then(function(id) {
      trackId = id;
      return seleniumHelpers.getStats(driver, 'pc1');
    })
    .then(function(stats) {
      // Find the sending audio track.
      stats.forEach(function(report) {
        if (report.type === 'ssrc' && report.googTrackId === trackId) {
          t.ok(codecName === report.googCodecName, 'preferring ' + codecName);
        }
      });
      return driver.findElement(webdriver.By.id('hangupButton')).click();
    })
    .then(function() {
      return driver.wait(function() {
        return driver.executeScript('return pc1 === null');
      }, 30 * 1000);
    });
  });
  last.then(function() {
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
