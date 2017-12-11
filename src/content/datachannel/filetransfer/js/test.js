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
var emptyFilePath =
  process.cwd() + '/src/content/datachannel/filetransfer/emptyFile';

function sendFile(t, path) {
  var driver = seleniumHelpers.buildDriver();

  return driver.get((process.env.BASEURL ? process.env.BASEURL :
      ('file://' + process.cwd())) +
    '/src/content/datachannel/filetransfer/index.html')
  .then(function() {
    t.pass('page loaded');
    // Based on https://saucelabs.com/resources/articles/selenium-file-upload
    return driver.findElement(webdriver.By.id('fileInput'))
    .sendKeys(path);
  })
  .then(function() {
    if (path === emptyFilePath) {
      return driver.wait(function() {
        return driver.findElement(webdriver.By.id('status'))
        .getText().then(function(text) {
          return (text === 'File is empty, please select a non-empty file');
        });
      }, 2000);
    }
    // Wait for the download element to be displayed.
    return driver.wait(webdriver.until.elementIsVisible(
        driver.findElement(webdriver.By.id('download'))), 90 * 1000);
  })
  .then(function() {
    if (path === emptyFilePath) {
      t.pass('Empty file error displayed');
    } else {
      t.pass('download element found');
    }
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
}

// Test various files with different sizes
// Disabling on firefox until sendKeys is fixed.
// https://github.com/mozilla/geckodriver/issues/683
test('Filetransfer via Datachannels: small text file',
  {skip: process.env.BROWSER === 'firefox'}, function(t) {
    sendFile(t, process.cwd() + '/index.html');
  });

test('Filetransfer via Datachannels: image',
  {skip: process.env.BROWSER === 'firefox'}, function(t) {
    sendFile(t, process.cwd() +
        '/src/content/devices/multi/images/poster.jpg');
  });

test('Filetransfer via Datachannels: audio',
  {skip: process.env.BROWSER === 'firefox'},function(t) {
    sendFile(t, process.cwd() +
        '/src/content/devices/multi/audio/audio.mp3');
  });

test('Filetransfer via Datachannels: video',
  {skip: process.env.BROWSER === 'firefox'}, function(t) {
    sendFile(t, process.cwd() +
        '/src/content/devices/multi/video/chrome.webm');
  });

test('Filetransfer via Datachannels: empty file', function(t) {
  // TODO: Remove when supported in Firefox.
  if (process.env.BROWSER === 'firefox') {
    t.skip('Empty file selection is not supported on firefox');
    t.end();
  } else {
    var fs = require('fs');
    // Create empty file.
    fs.writeFileSync(emptyFilePath, '');
    sendFile(t, emptyFilePath)
        .then(() => {
          // Remove the empty file.
          fs.unlink(emptyFilePath, function(error) {
            console.log('Failed to remove file: ' + error);
          });
        });
  }
});
