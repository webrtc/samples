/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals displayError, params */
/* exported addCodecParam, iceCandidateType,
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

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function maybePreferCodec(sdp, type, dir, codec) {
  var str = type + ' ' + dir + ' codec';
  if (codec === '') {
    trace('No preference on ' + str + '.');
    return sdp;
  }

  trace('Prefer ' + str + ': ' + codec);

  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = findLine(sdpLines, 'm=', type);
  if (mLineIndex === null) {
    return sdp;
  }

  // If the codec is available, set it as the default in m line.
  var codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
  if (codecIndex) {
    var payload = getCodecPayloadType(sdpLines[codecIndex]);
    if (payload) {
      sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Add fmtp param to specified codec in SDP.
function addCodecParam(sdp, codec, param) {
  var sdpLines = sdp.split('\r\n');

  // Find opus payload.
  var index = findLine(sdpLines, 'a=rtpmap', codec);
  var payload;
  if (index) {
    payload = getCodecPayloadType(sdpLines[index]);
  }

  // Find the payload in fmtp line.
  var fmtpLineIndex = findLine(sdpLines, 'a=fmtp:' + payload.toString());
  if (fmtpLineIndex === null) {
    return sdp;
  }

  sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat('; ', param);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines, prefix, substr) {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
  var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
  for (var i = startLine; i < realEndLine; ++i) {
    if (sdpLines[i].indexOf(prefix) === 0) {
      if (!substr ||
          sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadType(sdpLine) {
  var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
  var result = sdpLine.match(pattern);
  return (result && result.length === 2) ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;

  // Just copy the first three parameters; codec order starts on fourth.
  newLine[index++] = elements[0];
  newLine[index++] = elements[1];
  newLine[index++] = elements[2];

  // Put target payload first and copy in the rest.
  newLine[index++] = payload;
  for (var i = 3; i < elements.length; i++) {
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}
