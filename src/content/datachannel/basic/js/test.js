'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
/* jshint node: true */
var test = require('tape');

var webdriver = require('selenium-webdriver');
var seleniumHelpers = require('../../../../../test/selenium-lib');

test('Basic datachannel sample', function(t) {
  var driver = seleniumHelpers.buildDriver();

  driver.get('file://' + process.cwd() +
      '/src/content/datachannel/basic/index.html')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id('startButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return remoteConnection && ' +
          'remoteConnection.iceConnectionState === \'connected\';');
    });
  })
  .then(function() {
    t.pass('remoteConnection ICE connected');
    return driver.findElement(webdriver.By.id('dataChannelSend'))
        .sendKeys('hello world');
  })
  .then(function() {
    return driver.findElement(webdriver.By.id('sendButton')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return document.getElementById(\'dataChannelReceive\').value ' +
          '!== \'\'');
    });
  })
  .then(function() {
    return driver.findElement(webdriver.By.id('dataChannelReceive'))
        .getAttribute('value');
  })
  .then(function(value) {
    t.ok(value === 'hello world', 'Text was received');
  })
  .then(function() {
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
});
