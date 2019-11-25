/*
*  Copyright (c) 2019 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

'use strict';

onmessage = function(e) {
  const command = e.data[0];
  if (command == 'stream') {
    const inputStream = e.data[1];
    const transformStream = new TransformStream();
    inputStream.pipeTo(transformStream.writable);
    postMessage(['response', transformStream.readable],
        [transformStream.readable]);
  }
};
