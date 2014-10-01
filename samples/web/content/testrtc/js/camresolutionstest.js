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

var CamResolutionsTest = {};
CamResolutionsTest.index = 0;
CamResolutionsTest.supported = 0;
CamResolutionsTest.unsupported = 0;
CamResolutionsTest.resolutions = [ [ 160, 120],
                                   [ 320, 180],
                                   [ 320, 240],
                                   [ 640, 360],
                                   [ 640, 480],
                                   [1024, 576],
                                   [1280, 720],
                                   [1280, 768],
                                   [1280, 800],
                                   [1920,1080],
                                   [3840,2160],
                                   [4096,2160] ];

CamResolutionsTest.camResolutionsTest = function () {
  var constraintsLength = CamResolutionsTest.resolutions.length;
  trace('Checking ' + constraintsLength + ' constraint sets');

  for (var i = 0; i < constraintsLength; ++i) {
    var theResolution = CamResolutionsTest.resolutions[i];
    try {
      getUserMedia({ audio: false, video: { mandatory: {
          minWidth:  theResolution[0], minHeight: theResolution[1],
          maxWidth:  theResolution[0], maxHeight: theResolution[1] } } },
          CamResolutionsTest.successFunc,
          CamResolutionsTest.failFunc);
    } catch (e) {
      reportFatal('GetUserMedia failed.');
    }
  }
  CamResolutionsTest.waitForTestToFinish();
}

addTestSuite('CamResolutionsTest', CamResolutionsTest.camResolutionsTest);

CamResolutionsTest.successFunc = function(stream) {
  CamResolutionsTest.supported++;
  var theResolution =
      CamResolutionsTest.resolutions[CamResolutionsTest.index++];
  reportMessage('[   INFO ]', 'Supported resolution: (' +
            theResolution[0] + 'x' + theResolution[1] + ')');
  stream.stop();
}

CamResolutionsTest.failFunc = function(error) {
  CamResolutionsTest.unsupported++;
  var theResolution =
      CamResolutionsTest.resolutions[CamResolutionsTest.index++];
  reportMessage('[   INFO ]', 'Resolution NOT supported: (' +
            theResolution[0] + 'x' + theResolution[1] + ')');
}

CamResolutionsTest.waitForTestToFinish = function() {
  var constraintsLength = CamResolutionsTest.resolutions.length;
  if (CamResolutionsTest.index == constraintsLength) {
    if (CamResolutionsTest.supported) {
        reportSuccess(CamResolutionsTest.supported + '/' + constraintsLength +
                      ' resolutions supported.');
    } else {
        reportError('No camera resolutions supported, most likely the camera' +
                    ' is not accessible or dead.');
    }
    testSuiteFinished();
  } else {
    trace( 'Waiting for test to finish, ' + CamResolutionsTest.index + ' ?= ' +
           (CamResolutionsTest.resolutions.length));
    setTimeout('CamResolutionsTest.waitForTestToFinish()', 1000);
  }
}