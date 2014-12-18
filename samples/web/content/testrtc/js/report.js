/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* exported report */
'use strict';

function Report() {
  this.output_ = [ 'TestRTC-Diagnose v0.1' ];
  this.nextAsyncId_ = 0;

  // Hook console.log into the report, since that is the most common debug tool.
  this.nativeLog_ = console.log.bind(console);
  console.log = this.logHook_.bind(this);

  // Hook up window.onerror logs into the report.
  window.addEventListener('error', this.onWindowError_.bind(this));

  this.traceEventInstant('system-info', Report.getSystemInfo());
}

Report.prototype = {
  open: function () {
    document.getElementById('report-link').href = this.linkToChromiumBug_();
    document.getElementById('report-dialog').open();
  },

  downloadReport: function () {
    var content = encodeURIComponent(this.getContent_());
    var link = document.createElement('a');
    link.setAttribute('href', 'data:text/plain;charset=utf-8,' + content);
    link.click();
  },

  traceEventInstant: function (name, args) {
    var timestamp = (new Date()).getTime();
    this.output_.push( { 'ts': timestamp,
                         'name': name,
                         'args': args });
  },

  traceEventWithId: function (name, id, args) {
    var timestamp = (new Date()).getTime();
    this.output_.push( { 'ts': timestamp,
                         'name': name,
                         'id': id,
                         'args': args });
  },

  traceEventAsync: function (name) {
    return this.traceEventWithId.bind(this, name, this.nextAsyncId_++);
  },

  logTestRunResult: function (testName, status) {
    // Google Analytics event for the test result to allow to track how the
    // test is doing in the wild.
    ga('send', {
        'hitType': 'event',
        'eventCategory': 'Test',
        'eventAction': status,
        'eventLabel': testName,
        'nonInteraction': 1
    });
  },

  linkToChromiumBug_: function () {
    var info = Report.getSystemInfo();

    var description = 'Browser: ' + info.browserName + ' ' + info.browserVersion +
        ' (' + info.platform + ')\n\n' +
        'Output from the troubleshooting page at http://test.webrtc.org:\n\n' +
        'Please replace this text with the copy+pasted output from test page!';

    // Labels for the bug to be filed.
    var osLabel = 'OS-';
    if (info.platform.indexOf('Win') !== -1) { osLabel += 'Windows'; }
    if (info.platform.indexOf('Mac') !== -1) { osLabel += 'Mac'; }
    if (info.platform.match('iPhone|iPad|iPod|iOS')) { osLabel += 'iOS'; }
    if (info.platform.indexOf('Linux') !== -1) { osLabel += 'Linux'; }
    if (info.platform.indexOf('Android') !== -1) { osLabel += 'Android'; }

    var labels = 'webrtc-troubleshooter,Cr-Blink-WebRTC,' + osLabel;
    var url = 'https://code.google.com/p/chromium/issues/entry?' +
        'comment=' + encodeURIComponent(description) +
        '&labels=' + encodeURIComponent(labels);
    return url;
  },

  getContent_: function () {
    var stringArray = [];
    for (var i = 0; i != this.output_.length; ++i)
      stringArray.push(JSON.stringify(this.output_[i]));
    return "[" + stringArray.join(',\n') + "]";
  },

  onWindowError_: function (error) {
    this.traceEventInstant('error', { 'message': error.message,
                                      'filename': error.filename + ':' + error.lineno });
  },

  logHook_: function () {
    this.traceEventInstant('log', arguments);
    this.nativeLog_.apply(null, arguments);
  }
};

/*
 * Detects the running browser name, version and platform.
 */
Report.getSystemInfo = function () {
  // Code inspired by http://goo.gl/9dZZqE with
  // added support of modern Internet Explorer versions (Trident).
  var agent = navigator.userAgent;
  var browserName = navigator.appName;
  var version = '' + parseFloat(navigator.appVersion);
  var offsetName, offsetVersion, ix;

  if ((offsetVersion = agent.indexOf('Chrome')) !== -1) {
    browserName = 'Chrome';
    version = agent.substring(offsetVersion + 7);
  } else if ((offsetVersion = agent.indexOf('MSIE')) !== -1) {
    browserName = 'Microsoft Internet Explorer'; // Older IE versions.
    version = agent.substring(offsetVersion + 5);
  } else if ((offsetVersion = agent.indexOf('Trident')) !== -1) {
    browserName = 'Microsoft Internet Explorer'; // Newer IE versions.
    version = agent.substring(offsetVersion + 8);
  } else if ((offsetVersion = agent.indexOf('Firefox')) !== -1) {
    browserName = 'Firefox';
  } else if ((offsetVersion = agent.indexOf('Safari')) !== -1) {
    browserName = 'Safari';
    version = agent.substring(offsetVersion + 7);
    if ((offsetVersion = agent.indexOf('Version')) !== -1) {
      version = agent.substring(offsetVersion + 8);
    }
  } else if ( (offsetName = agent.lastIndexOf(' ') + 1) <
              (offsetVersion = agent.lastIndexOf('/')) ) {
    // For other browsers 'name/version' is at the end of userAgent
    browserName = agent.substring(offsetName, offsetVersion);
    version = agent.substring(offsetVersion + 1);
    if (browserName.toLowerCase() === browserName.toUpperCase()) {
      browserName = navigator.appName;
    }
  } // Trim the version string at semicolon/space if present.
  if ((ix = version.indexOf(';')) !== -1) {
    version = version.substring(0, ix);
  }
  if ((ix = version.indexOf(' ')) !== -1) {
    version = version.substring(0, ix);
  }
  return { 'browserName': browserName,
           'browserVersion': version,
           'platform': navigator.platform };
};

var report = new Report();
