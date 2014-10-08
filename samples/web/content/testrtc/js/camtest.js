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

function CamCaptureTest() {
  this.isMuted = false;
  this.stream = null;
  this.testActive = false;
  this.numBlackFrames = 0;
  // TODO: This needs some tweaking, increasing to be able to detect near black
  // frames. More advanced detection is in the pipeline.
  this.blackFrameThreshold = 25;
  this.constraints = {
    video: { mandatory: { minWidth: 1280, minHeight: 720} }
  };
  this.video = document.createElement('video');
  this.video.width = this.constraints.video.mandatory.minWidth;
  this.video.height = this.constraints.video.mandatory.minHeight;
  this.video.setAttribute('autoplay','');
  this.video.setAttribute('muted','');
};

addTestSuite('CamCaptureTest', function() {
  var test = new CamCaptureTest();
  test.run();
});

CamCaptureTest.prototype = {
  run: function() {
    doGetUserMedia(this.constraints, this.gotStream.bind(this));
  },

  gotStream: function(stream) {
    this.stream = stream;
    if (!this.checkVideoTracks(this.stream)) {
      testSuiteFinished();
      return;
    }
    this.setupVideoExpectations(this.stream);
    attachMediaStream(this.video, this.stream);
    this.setupCanvas();
    reportInfo('Checking if your camera is delivering frames for five ' +
               'seconds...');
    setTimeout(this.checkVideoFinish.bind(this, this.video), 5000);
  },

  checkVideoTracks: function(stream) {
    reportSuccess("getUserMedia succeeded.");
    var tracks = stream.getVideoTracks();
    if (tracks.length < 1) {
      return reportFatal('No video track in returned stream.');
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
    }
    videoTrack.onmute = function() {
      reportError('Your camera reported itself as muted.');
      // MediaStreamTrack.muted property is not wired up in Chrome yet, checking
      // isMuted local state.
      this.isMuted = true;
    }
    videoTrack.onunmute = function() {
      this.isMuted = false;
    }
  },

  checkVideoFinish: function(video) {
    assertEquals(this.constraints.video.mandatory.minWidth,
        video.videoWidth, 'Incorrect width', 'Width OK');
    assertEquals(this.constraints.video.mandatory.minHeight,
        video.videoHeight, 'Incorrect height', 'Height OK');
    if (this.stream.getVideoTracks()[0].readyState !== 'ended') {
      assertEquals(false, this.isMuted, 'Your camera reported ' +
                   'itself as muted! It is probably not delivering frames. ' +
                   'Please try another webcam.', 'Camera is delivering frames');
    }
    // Check: amount of near-black frames should be 0.
    assertEquals(this.numBlackFrames, 0, 'Your camera seems to be ' +
                 'delivering near-black frames. This might be all right or ' +
                 'it could be a symptom of a camera in a bad state; if it\'s ' +
                 'a USB WebCam, try plugging it out and in again.', 'Camera ' +
                 'is sending non-black frames.');
    this.stream.getVideoTracks()[0].onended = null;
    this.testActive = false;
    this.stream.getVideoTracks()[0].stop();
    testSuiteFinished();
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
    if (this.isBlackFrame(imageData.data, imageData.data.length))
      this.numBlackFrames++;

    if (this.testActive) {
      setTimeout(this.testFrame.bind(this), 20);
    };
  },

  isBlackFrame: function(data, length) {
    var thresh = this.blackFrameThreshold;
    for (var i = 0; i < length; i += 4) {
      if (data[i] > thresh || data[i+1] > thresh || data[i+2] > thresh) {
        return false;
      }
    }
    return true;
  }
};
