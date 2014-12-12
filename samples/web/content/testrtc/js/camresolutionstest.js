/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
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

addTest('Camera', 'Supported resolutions', function() {
  var test = new CamResolutionsTest();
  test.run();
});

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
  this.unsupportedResolutions = 0;
  this.currentResolutionForCheckEncodeTime = null;
  this.collectStatsDuration = 5000;
}

CamResolutionsTest.prototype = {
  run: function() {
    this.triggerGetUserMedia_(this.resolutions[0]);
  },

  triggerGetUserMedia_: function(resolution) {
    var constraints = {
      audio: false,
      video: {
        mandatory: {
          minWidth:  resolution[0],
          minHeight: resolution[1],
          maxWidth:  resolution[0],
          maxHeight: resolution[1]
        }
      }
    };
    try {
      doGetUserMedia(constraints, this.successFunc_.bind(this),
          this.failFunc_.bind(this));
    } catch (e) {
      reportFatal('GetUserMedia failed.');
    }
  },

  successFunc_: function(stream) {
    this.supportedResolutions++;
    var theResolution = this.resolutions[this.counter++];
    // Check stats for mandatory resolutions only.
    if (theResolution[2]) {
      this.currentResolutionForCheckEncodeTime = theResolution;
      this.getEncodeTime = new GetStats();
      this.getEncodeTime.start(stream, 'googAvgEncodeMs',
          this.collectStat_.bind(this), this.collectStatsDuration);
      this.stream = stream;
      // Not sure on how to this with the progress bar properly.
      setTimeoutWithProgressBar(function() { return; },
          this.collectStatsDuration);
      return;
    }
    reportInfo('Supported ' + theResolution[0] + 'x' + theResolution[1]);
    stream.getVideoTracks()[0].stop();
    this.finishTestOrRetrigger_();
    return;
  },

  collectStat_: function(stats) {
    this.analyzeStats_(stats);
    this.stream.getVideoTracks()[0].stop();
    this.finishTestOrRetrigger_();
  },

  analyzeStats_: function(stats) {
    var currentRes = this.currentResolutionForCheckEncodeTime;
    if (stats.length === 0) {
      // Consider making this an error in the future.
      reportInfo('Supported ' + currentRes[0] + 'x' +  currentRes[1] +
          ' - Stats are empty indicating the camera is not delivering video.');
      return;
    }
    // Taken from http://javascriptexample.net/extobjects81.php.
    Math.average = function() {
      var cnt, tot, i;
      cnt = arguments.length;
      tot = i = 0;
      while (i < cnt) {
        tot += arguments[i++];
      }
      return tot / cnt;
    };
    var average = Math.average.apply(Math, stats);
    var max = Math.max.apply(Math, stats);
    var min = Math.min.apply(Math, stats);
    reportInfo('Supported ' + currentRes[0] + 'x' + currentRes[1] +
               ' Average: ' + Math.floor(average) + ' Max: ' +  max + ' Min: ' +
               min + ' encode time (ms)');
  },

  failFunc_: function() {
    this.unsupportedResolutions++;
    var theResolution = this.resolutions[this.counter++];
    if (theResolution[2]) {
      this.mandatoryUnsupportedResolutions++;
      reportError('Camera does not support a mandatory resolution: ' +
                  theResolution[0] + 'x' + theResolution[1]);
    } else {
      reportInfo('NOT supported ' + theResolution[0] + 'x' +
                 theResolution[1]);
    }
    this.finishTestOrRetrigger_();
  },

  finishTestOrRetrigger_: function() {
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
      testFinished();
    } else {
      this.triggerGetUserMedia_(this.resolutions[this.counter]);
    }
  }

};
