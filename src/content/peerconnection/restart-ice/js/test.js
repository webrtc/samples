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

/* Firefox TODO once ice restarts are implemented
 * https://bugzilla.mozilla.org/show_bug.cgi?id=906986
 * 1) re-enable test
 * 2) fix getStats, ideally using spec-stats
 *
 * TODO: once onselectedcandidatepairchange is supported this test gets simpler.
 */

function getTransportAddresses(stats) {
  var localAddress;
  var remoteAddress;
  Object.keys(stats).forEach(function(id) {
    var report = stats[id];
    if (report.googActiveConnection === 'true') {
      var localCandidate = stats[report.localCandidateId];
      var remoteCandidate = stats[report.remoteCandidateId];
      localAddress = localCandidate.ipAddress + ':' +
          localCandidate.portNumber;
      remoteAddress = remoteCandidate.ipAddress + ':' +
          remoteCandidate.portNumber;
    }
  });
  return localAddress + ' ' + remoteAddress;
}
test('PeerConnection restart ICE sample', function(t) {
  if (process.env.BROWSER === 'firefox') {
    t.pass('skipping. ICE restart is not yet implemented in Firefox');
    t.end();
    return;
  }
  var driver = seleniumHelpers.buildDriver();

  var firstStats = null;
  driver.get('file://' + process.cwd() +
      '/src/content/peerconnection/restart-ice/index.html')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id('startButton')).click();
  })
  .then(function() {
    t.pass('got media');
    return driver.findElement(webdriver.By.id('callButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return pc1 && pc1.iceConnectionState === \'completed\';');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('pc2 ICE connected');
    // Query the transport address. It should change during the
    // ICE restart.
    return seleniumHelpers.getStats(driver, 'pc1');
  })
  .then(function(stats) {
    firstStats = stats;
    return driver.findElement(webdriver.By.id('restartButton')).click();
  })
  .then(function() {
    t.pass('ICE restart triggered');
    driver.manage().timeouts().setScriptTimeout(15000);
    return driver.executeAsyncScript(
        'var callback = arguments[arguments.length - 1];' +
        'pc1.addEventListener(\'iceconnectionstatechange\', function() {' +
        '  if (pc1.iceConnectionState === \'completed\') {' +
        '    callback();' +
        '  }' +
        '});');
  })
  .then(function() {
    return seleniumHelpers.getStats(driver, 'pc1');
  })
  .then(function(newStats) {
    var newAddress = getTransportAddresses(newStats);
    var oldAddress = getTransportAddresses(firstStats);
    t.ok(newAddress !== oldAddress, 'address changed during ICE restart');
  })
  .then(function() {
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
