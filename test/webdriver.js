/*
 *  Copyright (c) 2022 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
const os = require('os');

const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const safari = require('selenium-webdriver/safari');

if (os.platform() === 'win32') {
  process.env.PATH += ';' + process.cwd() + '\\node_modules\\chromedriver\\lib\\chromedriver\\';
  process.env.PATH += ';' + process.cwd() + '\\node_modules\\geckodriver';
} else {
  process.env.PATH += ':node_modules/.bin';
}

function buildDriver(browser = process.env.BROWSER || 'chrome', options = {bver: process.env.BVER}) {
  // Chrome options.
  const chromeOptions = new chrome.Options()
      .addArguments('allow-insecure-localhost')
      .addArguments('use-fake-device-for-media-stream')
      .addArguments('allow-file-access-from-files');
  if (options.chromeFlags) {
    options.chromeFlags.forEach((flag) => chromeOptions.addArguments(flag));
  }

  if (options.chromepath) {
    chromeOptions.setChromeBinaryPath(options.chromepath);
  } else if (os.platform() === 'linux' && options.version) {
    chromeOptions.setChromeBinaryPath('browsers/bin/chrome-' + options.version);
  }

  if (!options.devices || options.headless) {
    // GUM doesn't work in headless mode so we need this. See
    // https://bugs.chromium.org/p/chromium/issues/detail?id=776649
    chromeOptions.addArguments('use-fake-ui-for-media-stream');
  } else {
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=459532#c22
    const domain = 'https://' + (options.devices.domain || 'localhost') + ':' + (options.devices.port || 443) + ',*';
    const exceptions = {
      media_stream_mic: {},
      media_stream_camera: {},
    };

    exceptions.media_stream_mic[domain] = {
      last_used: Date.now(),
      setting: options.devices.audio ? 1 : 2 // 0: ask, 1: allow, 2: denied
    };
    exceptions.media_stream_camera[domain] = {
      last_used: Date.now(),
      setting: options.devices.video ? 1 : 2
    };

    chromeOptions.setUserPreferences({
      profile: {
        content_settings: {
          exceptions: exceptions
        }
      }
    });
  }

  const safariOptions = new safari.Options();
  safariOptions.setTechnologyPreview(options.bver === 'unstable');

  // Firefox options.
  const firefoxOptions = new firefox.Options();
  let firefoxPath = firefox.Channel.RELEASE;
  if (options.firefoxpath) {
    firefoxPath = options.firefoxpath;
  } else if (os.platform() == 'linux' && options.version) {
    firefoxPath = 'browsers/bin/firefox-' + options.version;
  }
  if (options.headless) {
    firefoxOptions.addArguments('-headless');
  }
  firefoxOptions.setBinary(firefoxPath);
  firefoxOptions.setPreference('media.navigator.streams.fake', true);
  firefoxOptions.setPreference('media.navigator.permission.disabled', true);

  const driver = new webdriver.Builder()
      .setChromeOptions(chromeOptions)
      .setSafariOptions(safariOptions)
      .setFirefoxOptions(firefoxOptions)
      .forBrowser(browser)
      .setChromeService(
          new chrome.ServiceBuilder().addArguments('--disable-build-check')
      );

  if (browser === 'firefox') {
    driver.getCapabilities().set('marionette', true);
    driver.getCapabilities().set('acceptInsecureCerts', true);
  }
  return driver.build();
}

module.exports = {
  buildDriver,
};
