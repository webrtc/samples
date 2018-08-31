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

function getTransportIds(stats) {
  let localId;
  let remoteId;
  // TODO: figuring out the currently active candidate pair is tricky cross-browser.
  // https://github.com/w3c/webrtc-stats/issues/358
  stats.forEach(report => {
    if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.writable) {
      localId = report.localCandidateId;
      remoteId = report.remoteCandidateId;
    }
  });
  return localId + ' ' + remoteId;
}

test('PeerConnection restart ICE sample', t => {
  const webdriver = require('selenium-webdriver');
  const seleniumHelpers = require('webrtc-utilities').seleniumLib;
  const driver = seleniumHelpers.buildDriver();

  let firstStats = null;
  const path = '/src/content/peerconnection/restart-ice/index.html';
  const url = (process.env.BASEURL ? process.env.BASEURL : ('file://' + process.cwd())) + path;
  driver.get(url)
    .then(() => {
      t.pass('page loaded');
      return driver.findElement(webdriver.By.id('startButton')).click();
    })
    .then(() => {
      t.pass('got media');
      return driver.wait(() => driver.findElement(webdriver.By.id('callButton')).isEnabled(), 30 * 1000);
    })
    .then(() => driver.findElement(webdriver.By.id('callButton')).click())
    .then(() => {
      t.pass('Pressed callButton');
      return driver.wait(() => driver.executeScript(() =>
            window.pc1 && (window.pc1.iceConnectionState === 'completed' ||
              window.pc1.iceConnectionState === 'connected')), 30 * 1000);
    })
    .then(() => {
      t.pass('pc1 ICE connected or completed');
      // Query the candidate ID's address. It should change during the
      // ICE restart.
      return driver.wait(() => driver.findElement(webdriver.By.id('restartButton')).isEnabled(), 30 * 1000);
    })
    .then(() => seleniumHelpers.getStats(driver, 'pc1'))
    .then(stats => {
      firstStats = stats;
      // listen for iceconnectionstatechange and store events.
      return driver.executeScript(() => {
        window.icestates = [];
        window.pc1.addEventListener('iceconnectionstatechange', () =>
          window.icestates.push(window.pc1.iceConnectionState));
      });
    })
    .then(() => driver.findElement(webdriver.By.id('restartButton')).click())
    .then(() => {
      t.pass('ICE restart triggered');
      return driver.wait(driver.executeScript(() => {
        // Firefox goes back to checking and then to connected.
        // Chrome (and presumably Safari) to back to connected and then completed.
        // Either way we need to wait for two or more state changes.
        return window.icestates.length >= 2;
      }), 30 * 1000);
    })
    // TODO: remove once https://github.com/w3c/webrtc-stats/issues/358 is resolved.
    .then(() => driver.sleep(5000))
    .then(() => seleniumHelpers.getStats(driver, 'pc1'))
    .then(newStats => {
      const newCandidateIds = getTransportIds(newStats);
      const oldRemoteIds = getTransportIds(firstStats);
      t.notDeepEqual(oldRemoteIds, 'undefined undefined', 'Candidate Ids found ' +
        'in getStats reports');
      t.notEqual(newCandidateIds, oldRemoteIds, 'Candidate ids changed during ' +
        'ICE restart.');
    })
    .then(() => t.end())
    .then(null, err => {
      t.fail(err);
      t.end();
    });
});
