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
      this.collectAndAnlyzeStats_(stream);
      return;
    }
    reportInfo('Supported ' + theResolution[0] + 'x' + theResolution[1]);
    stream.getVideoTracks()[0].stop();
    this.finishTestOrRetrigger_();
    return;
  },

  collectAndAnlyzeStats_: function(stream) {
    var call = new Call();
    call.pc1.addStream(stream);
    call.establishConnection();
    call.gatherStats(call.pc1, this.analyzeStats_.bind(this), 100);
    setTimeoutWithProgressBar( function() {
      call.close();
      stream.getVideoTracks()[0].stop();
      this.finishTestOrRetrigger_();
    }.bind(this), 5000);
  },

  analyzeStats_: function(stats) {
    var currentRes = this.currentResolutionForCheckEncodeTime;
    var googAvgEncodeTime = [];

    for (var index = 0; index < stats.length - 1; index++) {
      if (stats[index].type === 'ssrc') {
        // Make sure to only capture stats after the encoder is setup.
        // TODO(jansson) expand to cover audio as well.
        if (stats[index].stat('googFrameRateInput') > 0) {
          googAvgEncodeTime.push(parseInt(stats[index].stat('googAvgEncodeMs')));
        }
      }
    }

    function average_(statArray) {
      Math.average = function() {
        var cnt, tot, i;
        cnt = arguments.length;
        tot = i = 0;
        while (i < cnt) {
          tot += arguments[i++];
        }
        return tot / cnt;
      };
      return Math.floor(Math.average.apply(Math, statArray));
    }
    function max_(statArray) {
      return Math.max.apply(Math, statArray);
    }
    function min_(statArray) {
      return Math.min.apply(Math, statArray);
    }

    var userMessage = 'Supported ' + currentRes[0] + 'x' + currentRes[1];
    var avgMinMaxStats = ' Average: ' + average_(googAvgEncodeTime) +
                         ' Max: ' + max_(googAvgEncodeTime) +
                         ' Min: ' + min_(googAvgEncodeTime);
    if (googAvgEncodeTime.length === 0) {
      reportError(userMessage + ' but no stats collected, check your chamera.');
    } else {
      reportInfo(userMessage + avgMinMaxStats + ' encode time (ms)');
    }
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
