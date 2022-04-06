const os = require('os');
const fs = require('fs');

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const safari = require('selenium-webdriver/safari');

// setup path for webdriver binaries
if (os.platform() === 'win32') {
  process.env.PATH += ';C:\\Program Files (x86)\\Microsoft Web Driver\\';
  // FIXME: not sure why node_modules\.bin\ is not enough
  process.env.PATH += ';' + process.cwd() +
      '\\node_modules\\chromedriver\\lib\\chromedriver\\';
  process.env.PATH += ';' + process.cwd() +
      '\\node_modules\\geckodriver';
} else {
  process.env.PATH += ':node_modules/.bin';
}

function buildDriver(browser = process.env.BROWSER || 'chrome', options = {bver: process.env.BVER}) {
  // Firefox options.
  let firefoxPath;
  if (options.firefoxpath) {
    firefoxPath = options.firefoxpath;
  } else if (os.platform() == 'linux' && options.bver) {
    firefoxPath = 'browsers/bin/firefox-' + options.bver;
  } else {
    firefoxPath = firefox.Channel.RELEASE;
  }

  const firefoxOptions = new firefox.Options()
      .setPreference('media.navigator.streams.fake', true)
      .setPreference('media.navigator.permission.disabled', true)
      .setPreference('xpinstall.signatures.required', false)
      .setPreference('media.peerconnection.dtls.version.min', 771)
      .setBinary(firefoxPath);

  // Chrome options.
  let chromeOptions = new chrome.Options()
      .addArguments('allow-file-access-from-files')
      .addArguments('use-fake-device-for-media-stream')
      .addArguments('use-fake-ui-for-media-stream')
      .addArguments('disable-translate')
      .addArguments('no-process-singleton-dialog')
      .addArguments('mute-audio');
  // ensure chrome.runtime is visible.
  chromeOptions.excludeSwitches('test-type');

  if (options.chromepath) {
    chromeOptions.setChromeBinaryPath(options.chromepath);
  } else if (os.platform() === 'linux' && options.bver) {
    chromeOptions.setChromeBinaryPath('browsers/bin/chrome-' + options.bver);
  }

  const safariOptions = new safari.Options();
  safariOptions.setTechnologyPreview(options.bver === 'unstable');

  const driver = new webdriver.Builder()
      .setFirefoxOptions(firefoxOptions)
      .setChromeOptions(chromeOptions)
      .setSafariOptions(safariOptions)
      .forBrowser(browser);
  driver.getCapabilities().set('acceptInsecureCerts', true);

  return driver.build();
}

module.exports = {
  buildDriver,
};
