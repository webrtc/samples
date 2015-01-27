/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

 /*
 * Analyze performance for X resolution uses getStats, canvas and the video
 * element to analyze the video frames from a capture device. It will report
 * number of black frames, frozen frames, tested frames and various stats like
 * average encode time and FPS.
 *
 * Supported resolution test tries calling getUserMedia() with each resolution
 * from the list below. Each gUM() call triggers a success or a fail callback;
 * we report ok/nok and schedule another gUM() with the next resolution until
 * the list is exhausted. Some resolutions are mandatory and make the test fail
 * if not supported.
 *
 * In generic cameras using Chrome rescaler, all resolutions should be supported
 * up to a given one and none beyond there. Special cameras, such as digitizers,
 * might support only one resolution.
 */

// Each resolution has width, height and 'mandatory' fields.
var resolutions = [[160, 120, false],
                   [320, 180, false],
                   [320, 240, true],
                   [640, 360, false],
                   [640, 480, true],
                   [768, 576, false],  // PAL
                   [1024, 576, false],
                   [1280, 720, true],
                   [1280, 768, false],
                   [1280, 800, false],
                   [1920, 1080, false],  // Full HD
                   [1920, 1200, false],
                   [3840, 2160, false],  // 4K
                   [4096, 2160, false]];

// Loop through resolutions array and create a test case where video performance
// is analyzed for for each mandatory resolution.
for (var index = 0; index < resolutions.length; index++) {
  if (resolutions[index][2]) {
    addTest('Camera', 'Analyze performance for ' +
            JSON.stringify(resolutions[index][0]) + 'x' +
            JSON.stringify(resolutions[index][1]),
            createTest_(resolutions[index]));
  }
}
function createTest_(resolution) {
  return function() {
    var test = new CamResolutionsTest([resolution]);
    test.run();
  };
}

// List resolutions supported by getUserMedia.
addTest('Camera', 'Supported resolutions', function() {
  var test = new CamResolutionsTest(resolutions);
  test.run();
});

function CamResolutionsTest(resolutionArray) {
  this.resolutions = resolutionArray;
  this.mandatoryUnsupportedResolutions = 0;
  this.numResolutions = this.resolutions.length;
  this.counter = 0;
  this.supportedResolutions = 0;
  this.unsupportedResolutions = 0;
  this.currentResolutionForCheckEncodeTime = null;

  this.isMuted = false;
  this.stream = null;
  this.isTestActive = false;
  this.timeForFirstFrameMs = null;
  this.numFrames = 0;
  // Variables associated with near-black frame detection.
  this.numBlackFrames = 0;
  this.nonBlackPixelLumaThreshold = 20;
  // Variables associated with nearly-frozen frames detection.
  this.numFrozenFrames = 0;
  this.previousFrame = [];
  this.identicalFrameSsimThreshold = 0.985;
  this.frameComparator = new Ssim();

  this.video = document.createElement('video');
  this.video.width = null;
  this.video.height = null;
  this.video.setAttribute('autoplay', '');
  this.video.setAttribute('muted', '');
}

function resolutionMatchesIndependentOfRotation_(aWidth, aHeight,
                                                 bWidth, bHeight) {
  return (aWidth === bWidth && aHeight === bHeight) ||
         (aWidth === bHeight && aHeight === bWidth);
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
    this.stream = stream;
    this.supportedResolutions++;
    var theResolution = this.resolutions[this.counter++];
    // Measure performance for mandatory resolutions only.
    if (theResolution[2] && this.numResolutions === 1) {
      this.video.width = theResolution[0];
      this.video.height = theResolution[1];
      this.currentResolutionForCheckEncodeTime = theResolution;
      this.collectAndAnalyzeStats_(stream);
      return;
    } else {
      reportInfo('Supported ' + theResolution[0] + 'x' + theResolution[1]);
    }
    stream.getVideoTracks()[0].stop();
    this.finishTestOrRetrigger_();
  },

  setupAndCheckVideoPrerequisites_: function(stream) {
    var tracks = stream.getVideoTracks();
    if (tracks.length < 1) {
      reportError('No video track in returned stream.');
      this.isTestActive = false;
      return;
    }

    var videoTrack = tracks[0];
    reportInfo('Camera label: ' + videoTrack.label);
    // Register events.
    videoTrack.onended = function() {
      reportError('Video track ended, camera stopped working');
    };
    videoTrack.onmute = function() {
      reportError('Your camera reported itself as muted.');
      // MediaStreamTrack.muted property is not wired up in Chrome yet, checking
      // isMuted local state.
      this.isMuted = true;
    };
    videoTrack.onunmute = function() {
      this.isMuted = false;
    };

    attachMediaStream(this.video, stream);
    this.setupCanvas_();
  },

  collectAndAnalyzeStats_: function(stream) {
    this.isTestActive = true;
    var call = new Call();
    call.pc1.addStream(stream);
    call.establishConnection();
    this.collectStatsStartTime = Date.now();
    this.setupAndCheckVideoPrerequisites_(stream);
    call.gatherStats(call.pc1, this.analyzeStats_.bind(this),
                     this.encoderSetupTime_.bind(this), 100);
    setTimeoutWithProgressBar(function() {
      call.close();
      this.stream.getVideoTracks()[0].onended = null;
      this.stream.getVideoTracks()[0].stop();
    }.bind(this), 8000);
  },

  analyzeStats_: function(stats) {
    var googAvgEncodeTime = [];
    var googAvgFrameRateInput = [];
    var googAvgFrameRateSent = [];
    var statsReport = {};

    for (var index = 0; index < stats.length - 1; index++) {
      if (stats[index].type === 'ssrc') {
        // Make sure to only capture stats after the encoder is setup.
        if (stats[index].stat('googFrameRateInput') > 0) {
          googAvgEncodeTime.push(
              parseInt(stats[index].stat('googAvgEncodeMs')));
          googAvgFrameRateInput.push(
              parseInt(stats[index].stat('googFrameRateInput')));
          googAvgFrameRateSent.push(
              parseInt(stats[index].stat('googFrameRateSent')));
        }
      }
    }

    if (googAvgEncodeTime.length === 0) {
      reportError('No stats collected. Check your camera.');
    } else {
      // TODO: Add a reportInfo() function with a table format to display
      // values clearer.
      statsReport.actualVideoWidth = this.video.videoWidth;
      statsReport.actualVideoHeight = this.video.videoHeight;
      statsReport.encodeSetupTime = this.timeForFirstFrameMs + ' (ms)';
      statsReport.avgEncodeTime = arrayAverage(googAvgEncodeTime) + ' (ms)';
      statsReport.minEncodeTime = arrayMin(googAvgEncodeTime) + ' (ms)';
      statsReport.maxEncodeTime = arrayMax(googAvgEncodeTime) + ' (ms)';
      statsReport.avgInput = arrayAverage(googAvgFrameRateInput) + ' (fps)';
      statsReport.minInput = arrayMin(googAvgFrameRateInput) + ' (fps)';
      statsReport.maxInput = arrayMax(googAvgFrameRateInput) + ' (fps)';
      statsReport.avgSent = arrayAverage(googAvgFrameRateSent) + ' (fps)';
      statsReport.minSent = arrayMin(googAvgFrameRateSent) + ' (fps)';
      statsReport.maxSent = arrayMax(googAvgFrameRateSent) + ' (fps)';
      statsReport.isMuted = this.isMuted;
      statsReport.readyState = this.stream.getVideoTracks()[0].readyState;
      statsReport.testedFrames = this.numFrames;
      statsReport.blackFrames = this.numBlackFrames;
      statsReport.frozenFrames = this.numFrozenFrames;

      this.testExpectations_(statsReport);
    }
    report.traceEventInstant('video-stats', statsReport);
    this.finishTestOrRetrigger_();
  },

  encoderSetupTime_: function(timeForFirstFrame) {
    this.timeForFirstFrameMs =
        JSON.stringify(timeForFirstFrame - this.collectStatsStartTime);
  },

  testExpectations_: function(info) {
    for (var key in info) {
      if (info.hasOwnProperty(key)) {
        reportInfo(key + ': ' + info[key]);
      }
    }

    if (info.avgFPSSent < 5) {
      reportError('Low average sent FPS: ' + info.avgFPSSent);
    } else {
      reportSuccess('Average FPS above threshold');
    }
    if (!resolutionMatchesIndependentOfRotation_(info.videoWidth,
                                                info.videoHeight,
                                                info.mandatoryMinWidth,
                                                info.mandatoryMinHeight)) {
      reportError('Incorrect captured resolution.');
    } else {
      reportSuccess('Captured video using expected resolution.');
    }
    if (info.testedFrames === 0) {
      reportError('Could not analyze any video frame.');
    } else {
      if (info.blackFrames > info.testedFrames / 3) {
        reportError('Camera delivering lots of black frames.');
      }
      if (info.frozenFrames > info.testedFrames / 3) {
        reportError('Camera delivering lots of frozen frames.');
      }
    }
  },

  setupCanvas_: function() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.video.width;
    this.canvas.height = this.video.height;
    this.context = this.canvas.getContext('2d');
    this.video.addEventListener('play', this.checkVideoFrame_.bind(this),
                                false);
  },

  checkVideoFrame_: function() {
    if (this.video.ended) {
      return false;
    }
    this.context.drawImage(this.video, 0, 0, this.canvas.width,
        this.canvas.height);
    var imageData = this.context.getImageData(0, 0, this.canvas.width,
        this.canvas.height);

    if (this.isBlackFrame_(imageData.data, imageData.data.length)) {
      this.numBlackFrames++;
    }

    if (this.frameComparator.calculate(this.previousFrame, imageData.data) >
        this.identicalFrameSsimThreshold) {
      this.numFrozenFrames++;
    }
    this.previousFrame = imageData.data;

    this.numFrames++;
    if (this.isTestActive) {
      setTimeout(this.checkVideoFrame_.bind(this), 20);
    }
  },

  isBlackFrame_: function(data, length) {
    // TODO: Use a statistical, histogram-based detection.
    var thresh = this.nonBlackPixelLumaThreshold;
    var accuLuma = 0;
    for (var i = 4; i < length; i += 4) {
      // Use Luma as in Rec. 709: Y′709 = 0.21R + 0.72G + 0.07B;
      accuLuma += 0.21 * data[i] +  0.72 * data[i + 1] + 0.07 * data[i + 2];
      // Early termination if the average Luma so far is bright enough.
      if (accuLuma > (thresh * i / 4)) {
        return false;
      }
    }
    return true;
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
          // Assume analyze video performance path if only one resolution.
          if (this.numResolutions > 1) {
            reportSuccess(this.supportedResolutions + '/' +
                          this.numResolutions + ' resolutions supported.');
          }
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
