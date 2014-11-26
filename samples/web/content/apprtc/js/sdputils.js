/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals displayError, params, maybePreferCodec, findLine, findLineInRange,
   getCodecPayloadType */
/* exported iceCandidateType,
   maybePreferAudioReceiveCodec, maybePreferAudioSendCodec,
   maybeSetAudioReceiveBitRate, maybeSetAudioSendBitRate,
   maybePreferVideoReceiveCodec, maybePreferVideoSendCodec,
   maybeSetVideoReceiveBitRate, maybeSetVideoSendBitRate,
   maybeSetVideoSendInitialBitRate, mergeConstraints */

'use strict';

function mergeConstraints(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional = merged.optional.concat(cons2.optional);
  return merged;
}

function iceCandidateType(candidateStr) {
  return candidateStr.split(' ')[7];
}

function maybeSetAudioSendBitRate(sdp) {
  if (!params.audioSendBitrate) {
    return sdp;
  }
  trace('Prefer audio send bitrate: ' + params.audioSendBitrate);
  return preferBitRate(sdp, params.audioSendBitrate, 'audio');
}

function maybeSetAudioReceiveBitRate(sdp) {
  if (!params.audioRecvBitrate) {
    return sdp;
  }
  trace('Prefer audio receive bitrate: ' + params.audioRecvBitrate);
  return preferBitRate(sdp, params.audioRecvBitrate, 'audio');
}

function maybeSetVideoSendBitRate(sdp) {
  if (!params.videoSendBitrate) {
    return sdp;
  }
  trace('Prefer video send bitrate: ' + params.videoSendBitrate);
  return preferBitRate(sdp, params.videoSendBitrate, 'video');
}

function maybeSetVideoReceiveBitRate(sdp) {
  if (!params.videoRecvBitrate) {
    return sdp;
  }
  trace('Prefer video receive bitrate: ' + params.videoRecvBitrate);
  return preferBitRate(sdp, params.videoRecvBitrate, 'video');
}

// Add a b=AS:bitrate line to the m=mediaType section.
function preferBitRate(sdp, bitrate, mediaType) {
  var sdpLines = sdp.split('\r\n');

  // Find m line for the given mediaType.
  var mLineIndex = findLine(sdpLines, 'm=', mediaType);
  if (mLineIndex === null) {
    displayError('Failed to add bandwidth line to sdp, as no m-line found');
    return sdp;
  }

  // Find next m-line if any.
  var nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, 'm=');
  if (nextMLineIndex === null) {
    nextMLineIndex = sdpLines.length;
  }

  // Find c-line corresponding to the m-line.
  var cLineIndex = findLineInRange(sdpLines, mLineIndex + 1,
      nextMLineIndex, 'c=');
  if (cLineIndex === null) {
    displayError('Failed to add bandwidth line to sdp, as no c-line found');
    return sdp;
  }

  // Check if bandwidth line already exists between c-line and next m-line.
  var bLineIndex = findLineInRange(sdpLines, cLineIndex + 1,
      nextMLineIndex, 'b=AS');
  if (bLineIndex) {
    sdpLines.splice(bLineIndex, 1);
  }

  // Create the b (bandwidth) sdp line.
  var bwLine = 'b=AS:' + bitrate;
  // As per RFC 4566, the b line should follow after c-line.
  sdpLines.splice(cLineIndex + 1, 0, bwLine);
  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Add an a=fmtp: x-google-min-bitrate=kbps line, if videoSendInitialBitrate
// is specified. We'll also add a x-google-min-bitrate value, since the max
// must be >= the min.
function maybeSetVideoSendInitialBitRate(sdp) {
  var initialBitrate = params.videoSendInitialBitrate;
  if (!initialBitrate) {
    return sdp;
  }

  // Validate the initial bitrate value.
  var maxBitrate = initialBitrate;
  var bitrate = params.videoSendBitrate;
  if (bitrate) {
    if (initialBitrate > bitrate) {
      displayError('Clamping initial bitrate to max bitrate of ' +
                   bitrate + ' kbps.');
      initialBitrate = bitrate;
      params.videoSendInitialBitrate = initialBitrate;
    }
    maxBitrate = bitrate;
  }

  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === null) {
    displayError('Failed to find video m-line');
    return sdp;
  }

  var vp8RtpmapIndex = findLine(sdpLines, 'a=rtpmap', 'VP8/90000');
  var vp8Payload = getCodecPayloadType(sdpLines[vp8RtpmapIndex]);
  var vp8Fmtp = 'a=fmtp:' + vp8Payload + ' x-google-min-bitrate=' +
      params.videoSendInitialBitrate.toString() + '; x-google-max-bitrate=' +
      maxBitrate.toString();
  sdpLines.splice(vp8RtpmapIndex + 1, 0, vp8Fmtp);
  return sdpLines.join('\r\n');
}

// Promotes |audioSendCodec| to be the first in the m=audio line, if set.
function maybePreferAudioSendCodec(sdp) {
  return maybePreferCodec(sdp, 'audio', 'send', params.audioSendCodec);
}

// Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
function maybePreferAudioReceiveCodec(sdp) {
  return maybePreferCodec(sdp, 'audio', 'receive', params.audioRecvCodec);
}

// Promotes |videoSendCodec| to be the first in the m=audio line, if set.
function maybePreferVideoSendCodec(sdp) {
  return maybePreferCodec(sdp, 'video', 'send', params.videoSendCodec);
}

// Promotes |videoRecvCodec| to be the first in the m=audio line, if set.
function maybePreferVideoReceiveCodec(sdp) {
  return maybePreferCodec(sdp, 'video', 'receive', params.videoRecvCodec);
}
