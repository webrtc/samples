/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, quotmark: single, undef: true, unused: strict */

'use strict';

function reportBug() {
  // Detect browser and version. Code inspired by http://goo.gl/9dZZqE with
  // added support of modern Internet Explorer versions (Trident).
  var agent = navigator.userAgent;
  var browserName = navigator.appName;
  var version = '' + parseFloat(navigator.appVersion);
  var offsetName, offsetVersion, ix;

  if ((offsetVersion = agent.indexOf('Chrome')) != -1) {
    browserName = 'Chrome';
    version = agent.substring(offsetVersion + 7);
  } else if ((offsetVersion = agent.indexOf('MSIE')) != -1) {
    browserName = 'Microsoft Internet Explorer'; // Older IE versions.
    version = agent.substring(offsetVersion + 5);
  } else if ((offsetVersion = agent.indexOf('Trident')) != -1) {
    browserName = 'Microsoft Internet Explorer'; // Newer IE versions.
    version = agent.substring(offsetVersion + 8);
  } else if ((offsetVersion = agent.indexOf('Firefox')) != -1) {
    browserName = 'Firefox';
  } else if ((offsetVersion = agent.indexOf('Safari')) != -1) {
    browserName = 'Safari';
    version = agent.substring(offsetVersion + 7);
    if ((offsetVersion = agent.indexOf('Version')) != -1) {
      version = agent.substring(offsetVersion + 8);
    }
  } else if ( (offsetName = agent.lastIndexOf(' ') + 1) <
              (offsetVersion = agent.lastIndexOf('/')) ) {
    // For other browsers 'name/version' is at the end of userAgent
    browserName = agent.substring(offsetName, offsetVersion);
    version = agent.substring(offsetVersion + 1);
    if (browserName.toLowerCase() == browserName.toUpperCase()) {
      browserName = navigator.appName;
    }
  } // Trim the version string at semicolon/space if present.
  if ((ix = version.indexOf(';')) != -1)
    version = version.substring(0, ix);
  if ((ix = version.indexOf(' ')) != -1)
    version = version.substring(0, ix);

  console.log('Detected browser: ' + browserName + ' ' + version);

  var output = document.getElementById('output');
  var bugDescription = 'Browser: ' + browserName + ' ' + version + '\n\n' +
      'Output from the troubleshooting page at http://test.webrtc.org:\n\n' +
      output.value;

  // Labels.
  var osLabel = 'OS-';
  if (navigator.platform.indexOf('Win') != -1) osLabel += 'Windows';
  if (navigator.platform.indexOf('Mac') != -1) osLabel += 'Mac';
  if (navigator.platform.match('iPhone|iPad|iPod|iOS')) osLabel += 'iOS';
  if (navigator.platform.indexOf('Linux') != -1) osLabel += 'Linux';
  if (navigator.platform.indexOf('Android') != -1) osLabel += 'Android';

  var labels = 'webrtc-troubleshooter,Cr-Blink-WebRTC,' + osLabel;
  var url = 'https://code.google.com/p/chromium/issues/entry?' +
      'comment=' + encodeURIComponent(bugDescription) +
      '&labels=' + encodeURIComponent(labels);
  console.log('Navigating to: ' + url);
  window.location.href = url;
}
