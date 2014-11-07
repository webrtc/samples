/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* exported addTest, doGetUserMedia, reportInfo, expectEquals, testFinished, start, setTestProgress, audioContext */
'use strict';

// Global WebAudio context that can be shared by all tests.
// There is a very finite number of WebAudio contexts.
var audioContext = new AudioContext();
var output = document.getElementById('output');
var startButton = document.getElementById('start-button');
var bugButton = document.getElementById('bug-button');
var audioSelect = document.querySelector('select#audioSource');
var videoSelect = document.querySelector('select#videoSource');
var PREFIX_RUN     = '[ RUN    ]';
var PREFIX_INFO    = '[   INFO ]';
var PREFIX_SKIPPED = '[   SKIP ]';
var PREFIX_OK      = '[     OK ]';
var PREFIX_FAILED  = '[ FAILED ]';
var testSuites = [];
var testFilters = [];
var currentTest;
var successes;
var failures;

// A test suite is a composition of many tests.
function TestSuite(name) {
  this.name = name;
  this.tests = [];
}

TestSuite.prototype = {
  addTest: function(testName, testFunction) {
    this.tests.push(new Test(testName, testFunction));
  },

  run: function(doneCallback) {
    runAllSequentially(this.tests, doneCallback);
  }
};

function Test(name, func) {
  this.name = name;
  this.func = func;
  this.doneCallback_ = null;
  this.isDisabled = testIsDisabled(name);
}

Test.prototype = {
  run: function(doneCallback) {
    this.doneCallback_ = doneCallback;

    currentTest = this;

    if (!this.isDisabled) {
      this.reportMessage_(PREFIX_RUN, this.name);
      this.func();
    } else {
      this.reportMessage_(PREFIX_SKIPPED, this.name);
      this.done();
    }
  },

  done: function() {
    this.reportMessage_('[ ------ ]', '');
    this.doneCallback_();
  },

  setProgress: function(/*value*/) {
    // TODO(andresp): Wire up to UI.
  },

  reportSuccess: function(str) {
    this.reportMessage_(PREFIX_OK, str);
    ++successes;
  },

  reportError: function(str) {
    this.reportMessage_(PREFIX_FAILED, str);
    ++failures;
  },

  reportFatal: function(str) {
    this.reportError(str);
    this.done();
  },

  reportInfo: function(str) {
    this.reportMessage_(PREFIX_INFO, str);
  },

  reportMessage_: function(prefix, str) {
    output.textContent += prefix + ' ' + str + '\n';
  }
};

// TODO(andresp): Pass Test object to test instead of using global methods.
function reportSuccess(str) { currentTest.reportSuccess(str); }
function reportError(str) { currentTest.reportError(str); }
function reportFatal(str) { currentTest.reportFatal(str); }
function reportInfo(str) { currentTest.reportInfo(str); }
function setTestProgress(value) { currentTest.setProgress(value); }
function testFinished() { currentTest.done(); }

function expectEquals(expected, actual, failMsg, OkMsg) {
  if (expected !== actual) {
    reportError('Expected: ' + expected + ' !== ' + actual + ': ' + failMsg);
  } else {
    reportSuccess('Expected: ' + expected + ' === ' + actual + ': ' + OkMsg);
  }
}

function addTest(suiteName, testName, func) {
  for (var i = 0; i !== testSuites.length; ++i) {
    if (testSuites[i].name === suiteName) {
      testSuites[i].addTest(testName, func);
      return;
    }
  }
  // Non-existent suite.
  var testSuite = new TestSuite(suiteName);
  testSuite.addTest(testName, func);
  testSuites.push(testSuite);
}

// Helper to run a list of tasks sequentially:
//   tasks - Array of { run: function(doneCallback) {} }.
//   doneCallback - called once all tasks have run sequentially.
function runAllSequentially(tasks, doneCallback) {
  var current = -1;
  var runNextAsync = setTimeout.bind(null, runNext);

  runNextAsync();

  function runNext() {
    current++;
    if (current === tasks.length) {
      doneCallback();
      return;
    }
    tasks[current].run(runNextAsync);
  }
}

function start() {
  successes = failures = 0;
  output.textContent = '';
  startButton.setAttribute('disabled', null);

  runAllSequentially(testSuites, onComplete);

  function onComplete() {
    var str = successes + ' out of ' + (successes + failures) + ' tests passed';
    var prefix = (!failures) ? PREFIX_OK : PREFIX_FAILED;
    output.textContent += '[ ----- ]\n' + prefix + ' ' + str + '\n';

    bugButton.removeAttribute('disabled');
    startButton.removeAttribute('disabled');
  }
}

function doGetUserMedia(constraints, onSuccess, onFail) {
  // Call into getUserMedia via the polyfill (adapter.js).
  var successFunc = function(stream) {
    trace('User has granted access to local media.');
    onSuccess(stream);
  };
  var failFunc = onFail || function(error) {
    // If onFail function is provided error callback is propagated to the
    // caller.
    var errorMessage = 'Failed to get access to local media. Error name was ' +
        error.name;
    return reportFatal(errorMessage);
  };
  try {
    // Append the constraints with the getSource constraints.
    appendSourceId(audioSelect.value, 'audio', constraints);
    appendSourceId(videoSelect.value, 'video', constraints);

    getUserMedia(constraints, successFunc, failFunc);
    trace('Requested access to local media with constraints:\n' +
        '  \'' + JSON.stringify(constraints) + '\'');
  } catch (e) {
    return reportFatal('getUserMedia failed with exception: ' + e.message);
  }
}

function appendSourceId(id, type, constraints) {
  if (constraints[type] === true) {
    constraints[type] = {optional: [{sourceId: id}]};
  } else if (typeof constraints[type] === 'object') {
    if (typeof constraints[type].optional === 'undefined') {
      constraints[type].optional = [];
    }
    constraints[type].optional.push({sourceId: id});
  }
}

function gotSources(sourceInfos) {
  for (var i = 0; i !== sourceInfos.length; ++i) {
    var sourceInfo = sourceInfos[i];
    var option = document.createElement('option');
    option.value = sourceInfo.id;
    appendOption(sourceInfo, option);
  }
}

function appendOption(sourceInfo, option) {
  if (sourceInfo.kind === 'audio') {
    option.text = sourceInfo.label || 'microphone ' + (audioSelect.length + 1);
    audioSelect.appendChild(option);
  } else if (sourceInfo.kind === 'video') {
    option.text = sourceInfo.label || 'camera ' + (videoSelect.length + 1);
    videoSelect.appendChild(option);
  } else {
    console.log('Some other kind of source');
  }
}

if (typeof MediaStreamTrack === 'undefined') {
  reportFatal('This browser does not support MediaStreamTrack.\n Try Chrome Canary.');
} else {
  MediaStreamTrack.getSources(gotSources);
}

function testIsDisabled(testName) {
  if (testFilters.length === 0) {
    return false;
  }

  for (var i = 0; i !== testFilters.length; ++i) {
    if (testFilters[i] === testName) {
      return false;
    }
  }
  return true;
}

// Parse URL parameters and configure test filters.
{
  var parseUrlParameters = function() {
    var output = {};
    // python SimpleHTTPServer always adds a / on the end of the request.
    // Remove it so developers can easily run testrtc on their machines.
    // Note that an actual / is still sent in most cases as %2F.
    var args = window.location.search.replace(/\//g, '').substr(1).split('&');
    for (var i = 0; i !== args.length; ++i) {
      var split = args[i].split('=');
      output[decodeURIComponent(split[0])] = decodeURIComponent(split[1]);
    }
    return output;
  };

  var parameters = parseUrlParameters();
  var filterParameterName = 'test_filter';
  if (filterParameterName in parameters) {
    testFilters = parameters[filterParameterName].split(',');
  }
}
