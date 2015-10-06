'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
var test = require('tape');

var webdriver = require('selenium-webdriver');
var seleniumHelpers = require('../../../../../test/selenium-lib');

function sendFile(t, path) {
  var driver = seleniumHelpers.buildDriver();

  driver.get('file://' + process.cwd() +
      '/src/content/datachannel/filetransfer/index.html')
  .then(function() {
    t.pass('page loaded');
    // Based on https://saucelabs.com/resources/articles/selenium-file-upload
    return driver.findElement(webdriver.By.id('fileInput'))
       .sendKeys(path);
  })
  .then(function() {
    // Wait for the received element to be displayed.
    return driver.wait(webdriver.until.elementIsVisible(
        driver.findElement(webdriver.By.id('received'))));
  })
  .then(function() {
    t.end();
  })
  .then(null, function(err) {
    t.fail(err);
    t.end();
  });
}

// Test various files with different sizes
test('Filetransfer via Datachannels: small text file', function(t) {
  sendFile(t, process.cwd() + '/index.html');
});

test('Filetransfer via Datachannels: image', function(t) {
  sendFile(t, process.cwd() + '/src/content/devices/multi/images/poster.jpg');
});

test('Filetransfer via Datachannels: audio', function(t) {
  sendFile(t, process.cwd() + '/src/content/devices/multi/audio/audio.mp3');
});

test('Filetransfer via Datachannels: video', function(t) {
  sendFile(t, process.cwd() + '/src/content/devices/multi/video/chrome.webm');
});
