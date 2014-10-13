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

/* This test tries calling getUserMedia() with each resolution from the list
 * below. Each gUM() call triggers a success or a fail callback; we report
 * ok/nok and schedule another gUM() with the next resolution until the list
 * is exhausted. Some resolutions are mandatory and make the test fail if not
 * supported.
 *
 * In generic cameras using Chrome rescaler, all resolutions should be supported
 * up to a given one and none beyond there. Special cameras, such as digitizers,
 * might support only one resolution.
 */

var CamResolutionsTest = {};
CamResolutionsTest.index = 0;
CamResolutionsTest.supported = 0;
CamResolutionsTest.unsupported = 0;
// Each resolution has width, height and 'mandatory' fields.
CamResolutionsTest.resolutions = [ [ 160, 120, false],
                                   [ 320, 180, false],
                                   [ 320, 240,  true],  // QVGA
                                   [ 640, 360, false],
                                   [ 640, 480,  true],  // VGA
                                   [ 768, 576, false],  // PAL
                                   [1024, 576, false],
                                   [1280, 720,  true],  // HD
                                   [1280, 768, false],
                                   [1280, 800, false],
                                   [1920,1080, false],  // Full HD
                                   [1920,1200, false],
                                   [3840,2160, false],  // 4K
                                   [4096,2160, false] ];
CamResolutionsTest.mandatory_yet_unsupported_resolutions = 0;
CamResolutionsTest.numResolutions = CamResolutionsTest.resolutions.length;

CamResolutionsTest.camResolutionsTest = function () {
  trace('Checking ' + CamResolutionsTest.numResolutions + ' constraint sets');
  CamResolutionsTest.triggerGetUserMedia(CamResolutionsTest.resolutions[0]);
}

addTestSuite('CamResolutionsTest', CamResolutionsTest.camResolutionsTest);

CamResolutionsTest.successFunc = function(stream) {
  CamResolutionsTest.supported++;
  var theResolution =
      CamResolutionsTest.resolutions[CamResolutionsTest.index++];
  reportMessage('[   INFO ]', 'Supported resolution: (' +
            theResolution[0] + 'x' + theResolution[1] + ')');
  stream.stop();
  CamResolutionsTest.finishTestOrRetrigger();
}

CamResolutionsTest.failFunc = function(error) {
  CamResolutionsTest.unsupported++;
  var theResolution =
      CamResolutionsTest.resolutions[CamResolutionsTest.index++];
  if (theResolution[2]) {
    CamResolutionsTest.mandatory_yet_unsupported_resolutions++;
    reportError('Camera does not support a mandatory resolution, (' +
                theResolution[0] + 'x' + theResolution[1] + ')');
  } else {
    reportMessage('[   INFO ]', 'Resolution NOT supported: (' +
                  theResolution[0] + 'x' + theResolution[1] + ')');
  }
  CamResolutionsTest.finishTestOrRetrigger();
}

CamResolutionsTest.finishTestOrRetrigger = function() {
  var numResolutions = CamResolutionsTest.numResolutions;
  if (CamResolutionsTest.index == numResolutions) {
    if (CamResolutionsTest.mandatory_yet_unsupported_resolutions == 0) {
      if (CamResolutionsTest.supported) {
        reportSuccess(CamResolutionsTest.supported + '/' + numResolutions +
                      ' resolutions supported.');
      } else {
        reportError('No camera resolutions supported, most likely the camera' +
                    ' is not accessible or dead.');
      }
    }
    CamResolutionsTest.index = 0;
    CamResolutionsTest.supported = 0;
    CamResolutionsTest.unsupported = 0;
    testSuiteFinished();
  } else {
    CamResolutionsTest.triggerGetUserMedia(
        CamResolutionsTest.resolutions[CamResolutionsTest.index]);
  }
}

CamResolutionsTest.triggerGetUserMedia = function(resolution) {
  try {
    getUserMedia({ audio: false, video: { mandatory: {
        minWidth:  resolution[0], minHeight: resolution[1],
        maxWidth:  resolution[0], maxHeight: resolution[1] } } },
        CamResolutionsTest.successFunc,
        CamResolutionsTest.failFunc);
  } catch (e) {
    reportFatal('GetUserMedia failed.');
  }
}
