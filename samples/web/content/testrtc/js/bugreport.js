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

function bugreport() {
  // Detect browser and version. Code inspired by http://goo.gl/9dZZqE with
  // added support of modern Internet Explorer versions (Trident).
  var agent = navigator.userAgent;
  var browserName = navigator.appName;
  var version = ''+parseFloat(navigator.appVersion);
  var offsetName, offsetVersion, ix;

  // Chrome.
  if ((offsetVersion=agent.indexOf('Chrome')) != -1) {
    browserName = 'Chrome';
    version = agent.substring(offsetVersion + 7);
  }
  // Microsoft Internet Explorer (older versions).
  else if ((offsetVersion=agent.indexOf('MSIE')) != -1) {
    browserName = 'Microsoft Internet Explorer';
    version = agent.substring(offsetVersion + 5);
  }
  else if ((offsetVersion=agent.indexOf('Trident')) != -1) {
    browserName = 'Microsoft Internet Explorer';
    version = agent.substring(offsetVersion + 8);
  }
  // Firefox.
  else if ((offsetVersion=agent.indexOf('Firefox')) != -1) {
    browserName = 'Firefox';
  }
  // Safari.
  else if ((offsetVersion=agent.indexOf('Safari')) != -1) {
    browserName = 'Safari';
    version = agent.substring(offsetVersion + 7);
    if ((offsetVersion=agent.indexOf('Version')) != -1)
      version = agent.substring(offsetVersion + 8);
  }
  // For other browsers 'name/version' is at the end of userAgent
  else if ( (offsetName=agent.lastIndexOf(' ')+1) <
            (offsetVersion=agent.lastIndexOf('/')) ) {
    browserName = agent.substring(offsetName, offsetVersion);
    version = agent.substring(offsetVersion + 1);
    if (browserName.toLowerCase()==browserName.toUpperCase()) {
      browserName = navigator.appName;
    }
  } // Trim the version string at semicolon/space if present.
  if ((ix=version.indexOf(';'))!=-1)
    version=version.substring(0,ix);
  if ((ix=version.indexOf(' '))!=-1)
    version=version.substring(0,ix);

  console.log('Detected browser: ' + browserName + ' ' + version);

  var output = document.getElementById('output');
  var bug_description = 'Browser: ' + browserName + ' ' + version + '\n\n' +
      'Output from the troubleshooting page at http://test.webrtc.org:\n\n' +
      output.value;

  // Labels.
  var os_label = 'OS-';
  if (navigator.platform.indexOf('Win') != -1) os_label += 'Windows';
  if (navigator.platform.indexOf('Mac') != -1) os_label += 'Mac';
  if (navigator.platform.match('iPhone|iPad|iPod|iOS')) os_label += 'iOS';
  if (navigator.platform.indexOf('Linux') != -1) os_label += 'Linux';
  if (navigator.platform.indexOf('Android') != -1) os_label += 'Android';

  var labels = 'webrtc-troubleshooter,Cr-Blink-WebRTC,' + os_label;
  var url = 'https://code.google.com/p/chromium/issues/entry?' +
      'comment=' + encodeURIComponent(bug_description) +
      '&labels=' + encodeURIComponent(labels);
  console.log('Navigating to: ' + url);
  window.location.href = url;
}
