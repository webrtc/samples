/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

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
    video: {mandatory: {minWidth: 640, minHeight: 480}}
  };
  this.video = document.createElement('video');
  this.video.width = this.constraints.video.mandatory.minWidth;
  this.video.height = this.constraints.video.mandatory.minHeight;
  this.video.setAttribute('autoplay', '');
  this.video.setAttribute('muted', '');
}

function resolutionMatchesIndependentOfRotation(aWidth, aHeight,
                                                bWidth, bHeight) {
  return (aWidth === bWidth && aHeight === bHeight) ||
         (aWidth === bHeight && aHeight === bWidth);
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
    setTimeoutWithProgressBar(this.checkVideoFinish.bind(this, this.video),
                                                         5000);
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
      reportError('Camera reported itself as muted.');
    }
    if (!resolutionMatchesIndependentOfRotation(info.videoWidth,
                                                info.videoHeight,
                                                info.mandatoryMinWidth,
                                                info.mandatoryMinHeight)) {
      reportError('Incorrect captured resolution.');
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
      accuLuma += 0.21 * data[i] +  0.72 * data[i + 1] + 0.07 * data[i + 2];
      // Early termination if the average Luma so far is bright enough.
      if (accuLuma > (thresh * i / 4)) {
        return false;
      }
    }
    return true;
  }
};
