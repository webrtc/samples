/*
*  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/
'use strict';

const leftVideo = document.getElementById('leftVideo');
const rightVideo = document.getElementById('rightVideo');

leftVideo.addEventListener('canplay', () => {
  const stream = leftVideo.captureStream();
  rightVideo.srcObject = stream;
});
