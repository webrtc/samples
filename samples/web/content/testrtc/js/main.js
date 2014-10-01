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

// Global WebAudio context that can be shared by all tests.
// There is a very finite number of WebAudio contexts.
var audioContext = new AudioContext();
var output = document.getElementById('output');
var bugButton = document.getElementById('bug-button');
var PREFIX_RUN    = "[ RUN    ]";
var PREFIX_OK     = "[     OK ]";
var PREFIX_FAILED = "[ FAILED ]";
var testSuites = [];
var nextTestIndex;
var successes;
var failures;

function addTestSuite(name, func) {
  testSuites.push({"name": name, "func": func});
}
function start() {
  nextTestIndex = successes = failures = 0;
  output.value = "";
  asyncRunNextTestSuite();
}
function reportStart(testName) {
  reportMessage(PREFIX_RUN, testName);
}
function reportSuccess(str) {
  reportMessage(PREFIX_OK, str);
  ++successes;
}
function reportError(str) {
  reportMessage(PREFIX_FAILED, str);
  ++failures;
}
function reportFatal(str) {
  reportError(str);
  testSuiteFinished();
  return false;
}
function testSuiteFinished() {
  reportMessage("[ ------ ]", "");
  asyncRunNextTestSuite();
}
function reportMessage(prefix, str) {
  output.value += prefix + " " + str + '\n';
}
function asyncRunNextTestSuite() {
  setTimeout(runNextTestSuite, 0);
}
function runNextTestSuite() {
  var index = nextTestIndex;
  if (index >= testSuites.length) {
    onComplete();
    return;
  }

  var testSuite = testSuites[nextTestIndex++];
  reportStart(testSuite.name);
  testSuite.func();
}
function onComplete() {
  var str = successes + " out of " + (successes + failures) + " tests passed";
  var prefix = (!failures) ? PREFIX_OK : PREFIX_FAILED;
  reportMessage("[ ------ ]", "");
  reportMessage(prefix, str);
  bugButton.disabled = false;
}

function doGetUserMedia(constraints, onSuccess) {
  // Call into getUserMedia via the polyfill (adapter.js).
  var successFunc = function(stream) {
    trace('User has granted access to local media.');
    onSuccess(stream);
  }
  var failFunc = function(error) {
    var errorMessage = 'Failed to get access to local media. Error name was ' +
      error.name;
    return reportFatal(errorMessage);
  }
  try {
    getUserMedia(constraints, successFunc, failFunc);
    trace('Requested access to local media with constraints:\n' +
        '  \'' + JSON.stringify(constraints) + '\'');
  } catch (e) {
    return reportFatal('getUserMedia failed with exception: ' + e.message);
  }
}
