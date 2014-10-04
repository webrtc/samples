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

 WebRTCTest

.testsuite(
  'CamResolutionTest',
  'Checks for supported camera resolutions'
)

.test('camResolutionsTest', function (t, h) {
  t.log('Checking ' + h.resolutions.length + ' constraint sets');
  h.triggerGetUserMedia(t, h, h.resolutions[0]);
})

.helper({
  index:0,
  supported:0,
  unsupported:0,
  resolutions:[ [ 160, 120, false],
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
                [4096,2160, false] ],
  mandatory_yet_unsupported_resolutions:0
})

.helper('successFunc', function(t, h, stream) {
  h.supported++;
  var theResolution = h.resolutions[h.index++];
  t.log('Supported resolution: (' +
            theResolution[0] + 'x' + theResolution[1] + ')');
  stream.stop();
  h.finishTestOrRetrigger(t, h);
})

.helper('failFunc', function(t, h, error) {
  h.unsupported++;
  var theResolution =
      h.resolutions[h.index++];
  if (theResolution[2]) {
    h.mandatory_yet_unsupported_resolutions++;
    t.error('Camera does not support a mandatory resolution, (' +
                theResolution[0] + 'x' + theResolution[1] + ')');
  } else {
    t.log('Resolution NOT supported: (' +
                  theResolution[0] + 'x' + theResolution[1] + ')');
  }
  h.finishTestOrRetrigger(t, h);
})

.helper('finishTestOrRetrigger',function(t, h) {
  var numResolutions = h.resolutions.length;
  if (h.index == numResolutions) {
    if (h.mandatory_yet_unsupported_resolutions == 0) {
      if (h.supported) {
        t.success(h.supported + '/' + numResolutions +
                      ' resolutions supported.');
      } else {
        t.error('No camera resolutions supported, most likely the camera' +
                    ' is not accessible or dead.');
      }
    }
    t.complete();
  } else {
    h.triggerGetUserMedia(t, h, h.resolutions[h.index]);
  }
})

.helper('triggerGetUserMedia', function(t, h, resolution) {
  try {
    getUserMedia({ audio: false, video: { mandatory: {
        minWidth:  resolution[0], minHeight: resolution[1],
        maxWidth:  resolution[0], maxHeight: resolution[1] } } },
        function(stream){ h.successFunc(t, h, stream) },
        function(error){ h.failFunc(t, h, error) });
  } catch (e) {
    t.fatal('GetUserMedia failed.');
  }
})
