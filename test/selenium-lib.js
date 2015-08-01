/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* jshint node: true */

 'use strict';

// https://code.google.com/p/selenium/wiki/WebDriverJs
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var firefox = require('selenium-webdriver/firefox');

var sharedDriver = null;

function buildDriver() {
  if (sharedDriver) {
    return sharedDriver;
  }
  // Firefox options.
  // http://selenium.googlecode.com/git/docs/api/javascript/module_selenium-webdriver_firefox.html
  var profile = new firefox.Profile();
  profile.setPreference('media.navigator.streams.fake', true);
  // This enables device labels for enumerateDevices when using fake devices.
  profile.setPreference('media.navigator.permission.disabled', true);
  var firefoxOptions = new firefox.Options()
      .setProfile(profile)
      .setBinary('node_modules/.bin/start-firefox');

  // Chrome options.
  // http://selenium.googlecode.com/git/docs/api/javascript/module_selenium-webdriver_chrome_class_Options.html#addArguments
  var chromeOptions = new chrome.Options()
      .setChromeBinaryPath('node_modules/.bin/start-chrome')
      .addArguments('allow-file-access-from-files')
      .addArguments('use-fake-device-for-media-stream')
      .addArguments('use-fake-ui-for-media-stream');

  sharedDriver = new webdriver.Builder()
      .forBrowser(process.env.BROWSER)
      .setFirefoxOptions(firefoxOptions)
      .setChromeOptions(chromeOptions)
      .build();
  return sharedDriver;
}

// getStats is async so we need to call it,
// assign the result to a temporary variable
// and wait for it to return.
function getStats(driver, peerConnection) {
  var tmp = '_getStats_' + Math.floor(Math.random() * 65536);
  // Execute getStats on peerconnection named `peerConnection`
  driver.executeScript(
      'window.' + tmp + ' = null;' +
      peerConnection + '.getStats(null, function(report) {' +
      '  window.' + tmp + ' = report;' +
      '});');
  // Wait for result.
  return driver.wait(function() {
    return driver.executeScript(
        'return window.' + tmp + ' !== null && ' +
        '(function() {' +
        '  var val = window.' + tmp + ';' +
        '  delete window.' + tmp + ';' +
        '  return val;' +
        '})()');
  }, 30 * 1000);
}

module.exports = {
  buildDriver: buildDriver,
  getStats: getStats
};
