// https://code.google.com/p/selenium/wiki/WebDriverJs
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var firefox = require('selenium-webdriver/firefox');
var profile = null;
var firefoxOptions = null;
var chromeOptions = null;

// Firefox options.
// http://selenium.googlecode.com/git/docs/api/javascript/module_selenium-webdriver_firefox.html
var profile = new firefox.Profile();
profile.setPreference('media.navigator.streams.fake', true);
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

function buildDriver() {
  return new webdriver.Builder()
      .forBrowser(process.env.BROWSER)
      .setFirefoxOptions(firefoxOptions)
      .setChromeOptions(chromeOptions)
      .build();
}

module.exports = {
    buildDriver: buildDriver
};
