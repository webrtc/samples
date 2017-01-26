/*
*  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

var leftVideo = document.getElementById('leftVideo');
var rightVideo = document.getElementById('rightVideo');

var stream;

function maybeCreateStream() {
  if (stream) {
    return;
  }
  if (leftVideo.captureStream) {
    stream = leftVideo.captureStream();
    rightVideo.srcObject = stream;
    console.log('Captured stream from leftVideo with captureStream',
      stream);
  } else if (leftVideo.mozCaptureStream) {
    stream = leftVideo.mozCaptureStream();
    rightVideo.srcObject = stream;
    console.log('Captured stream from leftVideo with mozCaptureStream()',
      stream);
  } else {
    console.log('captureStream() not supported');
  }
}

// Video tag capture must be set up after video tracks are loaded.
leftVideo.oncanplay = maybeCreateStream;
if (leftVideo.readyState >= 3) {  // HAVE_FUTURE_DATA
  // Video is already ready to play, call maybeCreateStream in case oncanplay
  // fired before we registered the event handler.
  maybeCreateStream();
}

leftVideo.play();
