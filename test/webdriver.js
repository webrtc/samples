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

function buildDriver(browser = 'chrome', options = {}) {
  // Firefox options.
  let profile;
  profile = new firefox.Profile();
  profile.setAcceptUntrustedCerts(true);

  profile.setPreference('media.navigator.streams.fake', true);
  profile.setPreference('media.navigator.permission.disabled', true);
  profile.setPreference('xpinstall.signatures.required', false);
  profile.setPreference('media.peerconnection.dtls.version.min', 771); // force DTLS 1.2

  const firefoxOptions = new firefox.Options()
      .setProfile(profile);
  let firefoxPath;
  if (options.firefoxpath) {
      firefoxPath = options.firefoxpath;
  } else {
    if (os.platform() == 'linux' && options.bver) {
      firefoxPath = 'browsers/bin/firefox-' + options.bver;
    }
  }
  const firefoxBinary = new firefox.Binary(firefoxPath);
  if (options.headless) {
    firefoxBinary.addArguments('-headless');
  }
  firefoxOptions.setBinary(firefoxBinary);

  // Chrome options.
  let chromeOptions = new chrome.Options()
      .addArguments('allow-file-access-from-files')
      .addArguments('allow-insecure-localhost')
      .addArguments('use-fake-device-for-media-stream')
      .addArguments('disable-translate')
      .addArguments('no-process-singleton-dialog')
      // .addArguments('disable-dev-shm-usage')
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

  const loggingPreferences = new webdriver.logging.Preferences();
  if (options.browserLogging) {
    loggingPreferences.setLevel(webdriver.logging.Type.BROWSER, webdriver.logging.Level.ALL);
  }

  let driver = new webdriver.Builder()
      .setFirefoxOptions(firefoxOptions)
      .setChromeOptions(chromeOptions)
      .setSafariOptions(safariOptions)
      .setLoggingPrefs(loggingPreferences)
      .forBrowser(browser);

  if (browser === 'chrome') {
    driver.getCapabilities().set('goog:chromeOptions', chromeOptions);
  }
  if (browser === 'firefox') {
    driver.getCapabilities().set('moz:firefoxOptions', firefoxOptions);
  }
  if (browser === 'firefox') {
    driver.getCapabilities().set('marionette', true);
    driver.getCapabilities().set('acceptInsecureCerts', true);
  }
  if (options.applicationName) {
    driver.getCapabilities().set('applicationName', options.applicationName);
  }

  driver = driver.build();
  // Set global executeAsyncScript() timeout (default is 0) to allow async
  // callbacks to be caught in tests.
  driver
    .manage().timeouts().setScriptTimeout(5 * 1000);
  driver
  return driver;
}

module.exports = {
  buildDriver,
};
