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

leftVideo.onplay = function() {
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
};

leftVideo.play();
