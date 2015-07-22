'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
/* jshint node: true */
var test = require('tape');

var webdriver = require('selenium-webdriver');
var seleniumHelpers = require('../../../../../test/selenium-lib');

test('Candidate Gathering', function(t) {
  var driver = seleniumHelpers.buildDriver();

  driver.get('file://' + process.cwd() +
      '/src/content/peerconnection/trickle-ice/index.html')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id('gather')).click();
  })
  .then(function() {
    return driver.wait(function() {
      return driver.executeScript(
          'return pc === null && candidates.length > 0;');
    }, 30 * 1000);
  })
  .then(function() {
    t.pass('got candidates');
    driver.close();
    driver.quit();
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    driver.close();
    driver.quit();
    t.end();
  });
});
