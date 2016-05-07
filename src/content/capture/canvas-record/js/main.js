/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';


var theStream;
var thePlayback;

function startStreaming() {
    document.getElementById("btn1").disabled = true;

  // Create a MediaStream out of the <canvas> tag.
  theStream = document.getElementById("c").captureStream();
  document.body.appendChild(document.createElement("br"));
  createButton("btn2", "Play back captured Stream to a <video>", startPlayback);
  document.body.appendChild(document.createElement("br"));
}

function startPlayback() {
  document.getElementById("btn2").disabled = true;

  // And plug the created MediaStream into another <video> tag.
  createVideoTag("playbackTag", 480, 270, theStream);
  thePlayback = document.getElementById("playbackTag");
  document.body.appendChild(document.createElement("br"));

  createButton("btn3", "Stop theStream captured from <canvas>", stopStreaming);
}

function stopStreaming() {
  document.getElementById("btn3").disabled = true;
  theStream.getVideoTracks()[0].stop();
}
