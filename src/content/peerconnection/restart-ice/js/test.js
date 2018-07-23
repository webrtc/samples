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

/* Firefox TODO once ice restarts are implemented
 * https://bugzilla.mozilla.org/show_bug.cgi?id=906986
 * 1) re-enable test
 * 2) fix getStats, ideally using spec-stats
 *
 * TODO: once onselectedcandidatepairchange is supported this test gets simpler.
 */

function getTransportIds(stats) {
  let localId;
  let remoteId;
  stats.forEach(report => {
    if (report.googActiveConnection === 'true' ||
      report.state === 'succeeded') {
      localId = report.localCandidateId;
      remoteId = report.remoteCandidateId;
    }
  });
  return localId + ' ' + remoteId;
}

// Disabled due to flakiness.
// TODO(jansson) fix flakiness
test('PeerConnection restart ICE sample', {skip: true}, t => {
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
    .then(() => {
      driver.findElement(webdriver.By.id('callButton')).click();
      t.pass('Pressed callButton');
      return driver.wait(() => {
        return driver.executeScript('return pc1 && pc1.iceConnectionState === \'completed\' || \'connected\';');
      }, 30 * 1000);
    })
    .then(() => {
      t.pass('pc2 ICE connected');
      // Query the candidate ID's address. It should change during the
      // ICE restart.
      return driver.wait(() => driver.findElement(webdriver.By.id('restartButton')).isEnabled(), 30 * 1000);
    })
    .then(() => seleniumHelpers.getStats(driver, 'pc1'))
    .then(stats => {
      firstStats = stats;
      return driver.findElement(webdriver.By.id('restartButton')).click();
    })
    .then(() => {
      t.pass('ICE restart triggered');
      driver.manage().timeouts().setScriptTimeout(150000);
      return driver.executeAsyncScript(
        'var callback = arguments[arguments.length - 1];' +
        'pc1.addEventListener(\'iceconnectionstatechange\', function() {' +
        '  if (pc1.iceConnectionState === \'completed\' || \'connected\') {' +
        '    callback();' +
        '  }' +
        '});');
    })
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
