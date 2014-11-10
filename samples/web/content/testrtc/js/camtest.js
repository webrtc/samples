/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

// Test spec
// 1. TODO: Enumerate cameras.
// 2. Try opening the (a) camera in VGA.
// 3. TODO: Try camera in other resolutions, particularly HD.
// 4. TODO: Translate gum failures to user friendly messages, using
//   MediaStreamError.name in { NotSupportedError, PermissionDeniedError,
//   ConstrainNotSatisfiedError, OverconstrainedError, NotFoundError,
//   AbortError, SourceUnavailableError }.
// 4.Check that the MediaStreamTrack associated with the camera looks good.
// 4.a Capture for a couple of seconds and monitor the events on the
//   MediaStreamTrack: onEnded(), onMute(), onUnmute().
// 4.b If onEnded() fires, reportFatal() is called (e.g. camera is unplugged).
// 4.c We keep a local |isMuted| state during the capture period (4.a) to check
//   it at the end. (TODO: local isMuted can be deprecated once
//   mediaStreamTrack.muted property is wired up in Chrome).
// 4.d After the wait period we check that the video tag where the |stream| is
//   plugged in has the appropriate width and height.
// 4.e We also check that all frames were non-near-black.
// 5. Tear down the |stream|. TODO: this should be done in the test harness.

addTest('Camera', 'Test video feed', function() {
  var test = new CamCaptureTest();
  test.run();
});

function CamCaptureTest() {
  this.isMuted = false;
  this.stream = null;
  this.testActive = false;
  this.numFrames = 0;
  // Variables associated with near-black frame detection.
  this.numBlackFrames = 0;
  this.nonBlackPixelLumaThreshold = 20;
  // Variables associated with nearly-frozen frames detection.
  this.numFrozenFrames = 0;
  this.previousFrame = [];
  this.identicalFrameSsimThreshold = 0.985;
  this.frameComparator = new Ssim();

  this.constraints = {
    video: { mandatory: { minWidth: 640, minHeight: 480} }
  };
  this.video = document.createElement('video');
  this.video.width = this.constraints.video.mandatory.minWidth;
  this.video.height = this.constraints.video.mandatory.minHeight;
  this.video.setAttribute('autoplay','');
  this.video.setAttribute('muted','');
}

CamCaptureTest.prototype = {
  run: function() {
    doGetUserMedia(this.constraints, this.gotStream.bind(this));
  },

  gotStream: function(stream) {
    this.stream = stream;
    if (!this.checkVideoTracks(this.stream)) {
      testFinished();
      return;
    }
    this.setupVideoExpectations(this.stream);
    attachMediaStream(this.video, this.stream);
    this.setupCanvas();
    reportInfo('Checking if your camera is delivering frames for five ' +
               'seconds...');
    this.setTimeoutWithProgressBar(this.checkVideoFinish.bind(this, this.video), 5000);
  },

  setTimeoutWithProgressBar: function (timeoutCallback, timeoutMs) {
    var start = new Date();
    var updateProgressBar = setInterval(function () {
      var now = new Date();
      setTestProgress((now - start) * 100 / timeoutMs);
    }, 100);

    setTimeout(function () {
      clearInterval(updateProgressBar);
      setTestProgress(100);
      timeoutCallback();
    }, timeoutMs);
  },

  checkVideoTracks: function(stream) {
    reportSuccess('getUserMedia succeeded.');
    var tracks = stream.getVideoTracks();
    if (tracks.length < 1) {
      reportError('No video track in returned stream.');
      return false;
    }
    var videoTrack = tracks[0];
    reportSuccess('Video track exists with label = ' + videoTrack.label);
    this.testActive = true;
    return true;
  },

  setupVideoExpectations: function(stream) {
    var videoTrack = stream.getVideoTracks()[0];
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
  },

  checkVideoFinish: function(video) {
    // Gather all data where to base the expectations on.
    var info = {};
    info.videoWidth = video.videoWidth;
    info.videoHeight = video.videoHeight;
    info.isMuted = this.isMuted;
    info.readyState = this.stream.getVideoTracks()[0].readyState;
    info.mandatoryMinWidth = this.constraints.video.mandatory.minWidth;
    info.mandatoryMinHeight = this.constraints.video.mandatory.minHeight;
    info.testedFrames = this.numFrames;
    info.blackFrames = this.numBlackFrames;
    info.frozenFrames = this.numFrozenFrames;

    this.testExpectations(info);

    this.stream.getVideoTracks()[0].onended = null;
    this.testActive = false;
    this.stream.getVideoTracks()[0].stop();
    testFinished();
  },

  testExpectations: function(info) {
    reportInfo('Details: ' + JSON.stringify(info));

    if (info.readyState !== 'live') {
      reportError('Unexpected video state: ' + info.readyState);
    }
    if (info.isMuted === true) {
      reportError('Camera repored itself as muted.');
    }
    if (info.videoWidth !== info.mandatoryMinWidth) {
      reportError('Incorrect captured width.');
    }
    if (info.videoHeight !== info.mandatoryMinHeight) {
      reportError('Incorrect captured height.');
    }

    if (info.testedFrames === 0) {
      reportError('Could not analyze any video frame.');
    } else {
      if (info.blackFrames !== 0) {
        reportError('Camera delivering near black frames.');
      }
      if (info.frozenFrames !== 0) {
        reportError('Camera delivering frozen frames.');
      }
    }
  },

  setupCanvas: function() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.video.width;
    this.canvas.height = this.video.height;
    this.context = this.canvas.getContext('2d');
    this.video.addEventListener('play', this.testFrame.bind(this), false);
  },

  testFrame: function() {
    if (!this.testActive || this.video.ended) {
      return false;
    }
    this.context.drawImage(this.video, 0, 0, this.canvas.width,
        this.canvas.height);
    var imageData = this.context.getImageData(0, 0, this.canvas.width,
        this.canvas.height);

    if (this.isBlackFrame(imageData.data, imageData.data.length)) {
      this.numBlackFrames++;
    }

    if (this.frameComparator.calculate(this.previousFrame, imageData.data) >
        this.identicalFrameSsimThreshold) {
      this.numFrozenFrames++;
    }
    this.previousFrame = imageData.data;

    this.numFrames++;
    if (this.testActive) {
      setTimeout(this.testFrame.bind(this), 20);
    }
  },

  isBlackFrame: function(data, length) {
    // TODO: Use a statistical, histogram-based detection.
    var thresh = this.nonBlackPixelLumaThreshold;
    var accuLuma = 0;
    for (var i = 4; i < length; i += 4) {
      // Use Luma as in Rec. 709: Y′709 = 0.21R + 0.72G + 0.07B;
      accuLuma += 0.21 * data[i] +  0.72 * data[i+1] + 0.07 * data[i+2];
      // Early termination if the average Luma so far is bright enough.
      if (accuLuma  > (thresh * i / 4)) {
        return false;
      }
    }
    return true;
  }
};
