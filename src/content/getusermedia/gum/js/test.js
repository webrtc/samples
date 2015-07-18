'use strict';
// This is a basic test file for use with testling.
// The test script language comes from tape.
/* jshint node: true */
var test = require('tape');

// https://code.google.com/p/selenium/wiki/WebDriverJs
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var firefox = require('selenium-webdriver/firefox');

var profile;
var ffoptions;
var croptions;

// firefox options
var profile = new firefox.Profile();
// from http://selenium.googlecode.com/git/docs/api/javascript/module_selenium-webdriver_firefox.html
profile.setPreference('media.navigator.streams.fake', true);
var ffoptions = new firefox.Options()
    .setProfile(profile);
// assume it's running chrome
// http://selenium.googlecode.com/git/docs/api/javascript/module_selenium-webdriver_chrome_class_Options.html#addArguments
var croptions = new chrome.Options()
    .addArguments('use-fake-device-for-media-stream')
    .addArguments('use-fake-ui-for-media-stream');

test('video width and video height are set on GUM sample', function(t) {
  // FIXME: use env[SELENIUM_BROWSER] instead?
  var driver = new webdriver.Builder()
      .forBrowser(process.env.BROWSER)
      .setFirefoxOptions(ffoptions)
      .setChromeOptions(croptions)
      .build();

  driver.get('https://webrtc.github.io/samples/src/content/getusermedia/gum/')
  .then(function() {
    t.pass('page loaded');
    return driver.findElement(webdriver.By.id('gum-local'));
  })
  .then(function(videoElement) {
    t.pass('found video element');
    var width = 0;
    var height = 0;
    return new webdriver.promise.Promise(function(resolve) {
      videoElement.getAttribute('videoWidth').then(function(w) {
        width = w;
        t.pass('got videoWidth ' + w);
        if (width && height) {
          resolve([width, height]);
        }
      });
      videoElement.getAttribute('videoHeight').then(function(h) {
        height = h;
        t.pass('got videoHeight ' + h);
        if (width && height) {
          resolve([width, height]);
        }
      });
    });
  })
  .then(function(dimensions) {
    t.pass('got video dimensions ' + dimensions.join('x'));
    driver.quit();
    t.end();
  })
  .then(null, function (err) {
    t.fail(err);
    driver.quit();
    t.end();
  });
});
