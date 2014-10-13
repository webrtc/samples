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

function CamResolutionsTest() {
  // Each resolution has width, height and 'mandatory' fields.
  this.resolutions = [ [ 160, 120, false],
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
  this.mandatoryUnsupportedResolutions = 0;
  this.numResolutions = this.resolutions.length;
  this.counter = 0;
  this.supportedResolutions = 0;
  this.unSupportedResolutions = 0;
};

addTestSuite('CamResolutionsTest', function() {
  var test = new CamResolutionsTest();
  test.run();
});

CamResolutionsTest.prototype = {
  run: function() {
    trace('Checking ' + this.numResolutions + ' constraint sets');
    this.triggerGetUserMedia(this.resolutions[0]);
  },

  triggerGetUserMedia: function(resolution) {
    try {
      getUserMedia({ audio: false, video: { mandatory: {
          minWidth:  resolution[0], minHeight: resolution[1],
          maxWidth:  resolution[0], maxHeight: resolution[1] } } },
          this.successFunc.bind(this),
          this.failFunc.bind(this));
    } catch (e) {
      reportFatal('GetUserMedia failed.');
    }
  },

  successFunc: function(stream) {
    this.supportedResolutions++;
    var theResolution = this.resolutions[this.counter++];
    reportMessage('[   INFO ]', 'Supported resolution: (' + theResolution[0] +
                  'x' + theResolution[1] + ')');
    stream.stop();
    this.finishTestOrRetrigger();
  },

  failFunc: function(error) {
    this.unSupportedResolutions++;
    var theResolution = this.resolutions[this.counter++];
    if (theResolution[2]) {
      this.mandatoryUnsupportedResolutions++;
      reportError('Camera does not support a mandatory resolution, (' +
                  theResolution[0] + 'x' + theResolution[1] + ')');
    } else {
      reportInfo('Resolution NOT supported: (' + theResolution[0] + 'x' +
                 theResolution[1] + ')');
    }
    this.finishTestOrRetrigger();
  },

  finishTestOrRetrigger: function() {
    if (this.counter === this.numResolutions) {
      if (this.mandatoryUnsupportedResolutions === 0) {
        if (this.supportedResolutions) {
          reportSuccess(this.supportedResolutions + '/' + this.numResolutions +
                        ' resolutions supported.');
        } else {
          reportError('No camera resolutions supported, most likely the ' +
                      'camera is not accessible or dead.');
        }
      }
      testSuiteFinished();
    } else {
      this.triggerGetUserMedia(this.resolutions[this.counter]);
    }
  }
};
