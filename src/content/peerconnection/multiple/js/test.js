'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
var test = require('tape');

var webdriver = require('selenium-webdriver');
var seleniumHelpers = require('../../../../../test/selenium-lib');

test('PeerConnection multiple sample', function(t) {
  var driver = seleniumHelpers.buildDriver();

  driver.get('file://' + process.cwd() +
      '/src/content/peerconnection/multiple/index.html')
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
          'return pc1Remote && pc1Remote.iceConnectionState === \'connected\'' +
          ' && pc2Remote && pc2Remote.iceConnectionState === \'connected\';');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('multiple connections connected');
    return driver.findElement(webdriver.By.id('hangupButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript('return pc1Local === null && ' +
           'pc2Local === null');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('hangup');
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
