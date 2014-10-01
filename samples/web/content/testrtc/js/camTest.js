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

CamTest.camTest = function () {
  var constraints = { video: true , audio: false};
  doGetUserMedia(constraints, function(stream) {
    if (CamTest.checkVideoTracks(stream)) {
      CamTest.checkVideoStart(stream);
    }
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
    reportError("Video track ended, camera stopped working")
  }
  videoTrack.onmute = function() {
    reportError("Camera stopped delivering frames to the track")
  }
  videoTrack.onunmute = function() {
    reportError("Camera started delivering frames to the track again")
  }
}

CamTest.checkVideoFinish = function(videoTag) {
  reportSuccess("");
  testSuiteFinished();
}
