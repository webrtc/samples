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
// TODO 1. Enumerate cameras
// 2. Try camera in VGA
// TODO 3.Try camera in HD
// TODO 4.Translate gum failures to user friendly messages
//   (MediaStreamError.name):
//   NotSupportedError, PermissionDeniedError, ConstrainNotSatisfiedError,
//   OverconstrainedError, NotFoundError, AbortError, SourceUnavailableError
// 4.MediaStreamTrack associated with the camera is fine.
// 4.a Capture for a couple of secs and monitor the events on the
//   MediaStreamTrack (onEnded(), onMute(), onUnmute()).
// 4.b If onEnded() fires reportFatal() is called (e.g. camera is unplugged).
// 4.c We keep local isMuted state during the capture period (4.a) and it's
//   checked at the end. (TODO local isMuted will be deprecated once
  //   mediaStreamTrack.muted property is wired up in Chrome)
// TODO 5. General tear down method


var CamWorksInVGATest = {};
CamWorksInVGATest.isMuted = false;
CamWorksInVGATest.stream = null;

CamWorksInVGATest.camWorksInVGATest = function () {
  var constraints = { video: true, audio: false};
  doGetUserMedia(constraints, function(stream) {
    CamWorksInVGATest.stream = stream;
    if (CamWorksInVGATest.checkVideoTracks(stream)) {
      CamWorksInVGATest.checkVideoStart(stream);

      var video = document.getElementById('main-video');
      attachMediaStream(video, stream);

      reportInfo("Checking if your camera is delivering frames for five " +
                 "seconds...");
      setTimeout(function() {
        CamWorksInVGATest.checkVideoFinish(video);
      }, 5000);
    }
  });
}

addTestSuite("CamWorksInVGATest", CamWorksInVGATest.camWorksInVGATest);

CamWorksInVGATest.checkVideoTracks = function(stream) {
  reportSuccess("getUserMedia succeeded.");
  var tracks = stream.getVideoTracks();
  if (tracks.length < 1) {
    return reportFatal("No video track in returned stream.");
  }
  var videoTrack = tracks[0];
  reportSuccess("Video track exists with label=" + videoTrack.label);
  return true;
}

CamWorksInVGATest.checkVideoStart = function(stream) {
  var videoTrack = stream.getVideoTracks()[0];
  videoTrack.onended = function() {
    reportFatal("Video track ended, camera stopped working");
  }
  videoTrack.onmute = function() {
    reportError("Your camera reported itself as muted.");
    CamWorksInVGATest.isMuted = true;
  }
  videoTrack.onunmute = function() {
    CamWorksInVGATest.isMuted = false;
  }
}

CamWorksInVGATest.checkVideoFinish = function(videoTag) {
  assertEquals(640, videoTag.videoWidth, 'Expected VGA width');
  assertEquals(480, videoTag.videoHeight, 'Expected VGA height');
  if (CamWorksInVGATest.isMuted)
    reportFatal("Your camera reported itself as muted! It is probably " +
                "not delivering frames. Please try another webcam.");
  reportSuccess("Camera successfully capture video in VGA");

  CamWorksInVGATest.stream.getVideoTracks()[0].onended = null;
  CamWorksInVGATest.stream.stop();
  testSuiteFinished();
}
