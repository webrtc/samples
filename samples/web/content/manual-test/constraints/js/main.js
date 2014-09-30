/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/**
 * See http://dev.w3.org/2011/webrtc/editor/getusermedia.html for more
 * information on getUserMedia.
 */

/**
 * Asks permission to use the webcam and mic from the browser.
 */
function doGetUserMedia() {
  // Call into getUserMedia via the polyfill (adapter.js).
  var constraints = getConstraints_();
  var constraintsString = JSON.stringify(constraints, null, ' ');
  $('getusermedia-constraints').innerHTML = constraintsString;
  if (!getUserMedia) {
    log_('Browser does not support WebRTC.');
    return;
  }
  log_('Requesting getUserMedia with constraints: ' + constraintsString);
  getUserMedia(constraints, getUserMediaOkCallback_,
               getUserMediaFailedCallback_);
}

// Internals

/**
 * Builds a Javascript constraints dictionary out of the selected options in the
 * HTML controls on the page.
 * @private
 * @return {Object} A dictionary of constraints.
 */
function getConstraints_() {
  var c = {};
  c.audio = $('audio').checked;
  if (!$('video').checked) {
    c.video = false;
  } else {
    c.video = { mandatory: {}, optional: [] };
    // Mandatory - min
    if ($('mandatory-min-width').value != '') {
      c.video.mandatory.minWidth = $('mandatory-min-width').value;
    }
    if ($('mandatory-min-height').value != '') {
      c.video.mandatory.minHeight = $('mandatory-min-height').value;
    }
    if ($('mandatory-min-fps').value != '') {
      c.video.mandatory.minFrameRate = $('mandatory-min-fps').value;
    }
    if ($('mandatory-min-ar').value != '') {
      c.video.mandatory.minAspectRatio = $('mandatory-min-ar').value;
    }
    // Mandatory - max
    if ($('mandatory-max-width').value != '') {
      c.video.mandatory.maxWidth = $('mandatory-max-width').value;
    }
    if ($('mandatory-max-height').value != '') {
      c.video.mandatory.maxHeight = $('mandatory-max-height').value;
    }
    if ($('mandatory-max-fps').value != '') {
      c.video.mandatory.maxFrameRate = $('mandatory-max-fps').value;
    }
    if ($('mandatory-max-ar').value != '') {
      c.video.mandatory.maxAspectRatio = $('mandatory-max-ar').value;
    }
    // Optional - min
    if ($('optional-min-width').value != '') {
      c.video.optional.push({ minWidth: $('optional-min-width').value });
    }
    if ($('optional-min-height').value != '') {
      c.video.optional.push({ minHeight: $('optional-min-height').value });
    }
    if ($('optional-min-fps').value != '') {
      c.video.optional.push({ minFrameRate: $('optional-min-fps').value });
    }
    if ($('optional-min-ar').value != '') {
      c.video.optional.push({ minAspectRatio: $('optional-min-ar').value });
    }
    // Optional - max
    if ($('optional-max-width').value != '') {
      c.video.optional.push({ maxWidth: $('optional-max-width').value });
    }
    if ($('optional-max-height').value != '') {
      c.video.optional.push({ maxHeight: $('optional-max-height').value });
    }
    if ($('optional-max-fps').value != '') {
      c.video.optional.push({ maxFrameRate: $('optional-max-fps').value });
    }
    if ($('optional-max-ar').value != '') {
      c.video.optional.push({ maxAspectRatio: $('optional-max-ar').value });
    }
  }
  return c;
}

/**
 * @private
 * @param {MediaStream} stream Media stream.
 */
function getUserMediaOkCallback_(stream) {
  gLocalStream = stream;
  var videoTag = $('local-view');
  attachMediaStream(videoTag, stream);

  // Due to crbug.com/110938 the size is 0 when onloadedmetadata fires.
  // videoTag.onloadedmetadata = updateVideoTagSize_(videoTag);
  // Use setTimeout as a workaround for now.
  setTimeout(function() {updateVideoTagSize_(videoTag)}, 500);
  gRequestWebcamAndMicrophoneResult = 'ok-got-stream';
}

/**
 * @private
 * @param {Object} videoTag The video tag to update.
 */
function updateVideoTagSize_(videoTag) {
  // Don't update if sizes are 0 (happens for Chrome M23).
  if (videoTag.videoWidth > 0 && videoTag.videoHeight > 0) {
    log_('Set video tag width and height: ' + videoTag.videoWidth + 'x' +
      videoTag.videoHeight);
    videoTag.width = videoTag.videoWidth;
    videoTag.height = videoTag.videoHeight;
  }
}

/**
 * @private
 * @param {NavigatorUserMediaError} error Error containing details.
 */
function getUserMediaFailedCallback_(error) {
  log_('Failed with error: ' + error);
}

$ = function(id) {
  return document.getElementById(id);
};

/**
 * Simple logging function.
 * @private
 * @param {string} message Message to print.
 */
function log_(message) {
  console.log(message);
  $('messages').innerHTML += message + '<br>';
}
