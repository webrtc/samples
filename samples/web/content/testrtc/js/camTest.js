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

// 1. Enumerate Cameras
// 2. Try each camera in VGA
// 3. Try each camera in HD
// 4. MediaStreamTrack associated with the camera is fine
// 4.a Monitor the events on the MediaStreamTrack (onended, onmute, onunmute)
// 4.b MediaStreamTrack muted property
var CamTest = {};
CamTest.isMuted = false;

CamTest.camTest = function () {
  var constraints = { video: true , audio: false};
  doGetUserMedia(constraints, function(stream) {
    if (CamTest.checkVideoTracks(stream)) {
      CamTest.checkVideoStart(stream);

      var video = document.getElementById('main-video');
      attachMediaStream(video, stream);

      reportInfo("Checking if your camera is delivering frames for five " +
                 "seconds...");
      setTimeout(function() {
        CamTest.checkVideoFinish(video);
      }, 5000);
    }
  }, function(err) {
    reportFatal("Failed to acquire camera: " + err);
  });
}

addTestSuite("CameraTestRes", CamTest.camTest);

CamTest.checkVideoTracks = function(stream) {
  reportSuccess("getUserMedia succeeded.");
  var tracks = stream.getVideoTracks();
  if (tracks.length < 1) {
    return reportFatal("No video track in returned stream.");
  }
  var videoTrack = tracks[0];
  reportSuccess("Video track exists with label=" + videoTrack.label);
  return true;
}

CamTest.checkVideoStart = function(stream) {
  var videoTrack = stream.getVideoTracks()[0];
  videoTrack.onended = function() {
    reportFatal("Video track ended, camera stopped working");
  }
  videoTrack.onmute = function() {
    reportWarning("Your camera reported itself as muted.");
    CamTest.isMuted = true;
  }
  videoTrack.onunmute = function() {
    CamTest.isMuted = false;
  }
}

CamTest.checkVideoFinish = function(videoTag) {
  assertEquals(640, videoTag.videoWidth, 'Expected VGA width');
  assertEquals(480, videoTag.videoHeight, 'Expected VGA height');
  if (CamTest.isMuted)
    reportFatal("Your camera reported itself as muted! It is probably " +
                "not delivering frames. Please try another webcam.");
  reportSuccess("");
  testSuiteFinished();
}
