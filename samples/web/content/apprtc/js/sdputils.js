/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace */
/* exported setCodecParam, iceCandidateType, maybeSetOpusOptions,
   maybePreferAudioReceiveCodec, maybePreferAudioSendCodec,
   maybeSetAudioReceiveBitRate, maybeSetAudioSendBitRate,
   maybePreferVideoReceiveCodec, maybePreferVideoSendCodec,
   maybeSetVideoReceiveBitRate, maybeSetVideoSendBitRate,
   maybeSetVideoSendInitialBitRate, mergeConstraints, removeCodecParam */

'use strict';

function mergeConstraints(cons1, cons2) {
  if (!cons1 || !cons2) {
    return cons1 || cons2;
  }
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

function maybeSetOpusOptions(sdp, params) {
  // Set Opus in Stereo, if stereo is true, unset it, if stereo is false, and
  // do nothing if otherwise.
  if (params.opusStereo === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'stereo', '1');
  } else if (params.opusStereo === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'stereo');
  }

  // Set Opus FEC, if opusfec is true, unset it, if opusfec is false, and
  // do nothing if otherwise.
  if (params.opusFec === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'useinbandfec', '1');
  } else if (params.opusFec === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'useinbandfec');
  }

  // Set Opus maxplaybackrate, if requested.
  if (params.opusMaxPbr) {
    sdp = setCodecParam(
        sdp, 'opus/48000', 'maxplaybackrate', params.opusMaxPbr);
  }
  return sdp;
}

function maybeSetAudioSendBitRate(sdp, params) {
  if (!params.audioSendBitrate) {
    return sdp;
  }
  trace('Prefer audio send bitrate: ' + params.audioSendBitrate);
  return preferBitRate(sdp, params.audioSendBitrate, 'audio');
}

function maybeSetAudioReceiveBitRate(sdp, params) {
  if (!params.audioRecvBitrate) {
    return sdp;
  }
  trace('Prefer audio receive bitrate: ' + params.audioRecvBitrate);
  return preferBitRate(sdp, params.audioRecvBitrate, 'audio');
}

function maybeSetVideoSendBitRate(sdp, params) {
  if (!params.videoSendBitrate) {
    return sdp;
  }
  trace('Prefer video send bitrate: ' + params.videoSendBitrate);
  return preferBitRate(sdp, params.videoSendBitrate, 'video');
}

function maybeSetVideoReceiveBitRate(sdp, params) {
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
    trace('Failed to add bandwidth line to sdp, as no m-line found');
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
    trace('Failed to add bandwidth line to sdp, as no c-line found');
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
function maybeSetVideoSendInitialBitRate(sdp, params) {
  var initialBitrate = params.videoSendInitialBitrate;
  if (!initialBitrate) {
    return sdp;
  }

  // Validate the initial bitrate value.
  var maxBitrate = initialBitrate;
  var bitrate = params.videoSendBitrate;
  if (bitrate) {
    if (initialBitrate > bitrate) {
      trace('Clamping initial bitrate to max bitrate of ' +
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
    trace('Failed to find video m-line');
    return sdp;
  }

  sdp = setCodecParam(sdp, 'VP8/90000', 'x-google-min-bitrate',
      params.videoSendInitialBitrate.toString());
  sdp = setCodecParam(sdp, 'VP8/90000', 'x-google-max-bitrate',
      maxBitrate.toString());

  return sdp;
}

// Promotes |audioSendCodec| to be the first in the m=audio line, if set.
function maybePreferAudioSendCodec(sdp, params) {
  return maybePreferCodec(sdp, 'audio', 'send', params.audioSendCodec);
}

// Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
function maybePreferAudioReceiveCodec(sdp, params) {
  return maybePreferCodec(sdp, 'audio', 'receive', params.audioRecvCodec);
}

// Promotes |videoSendCodec| to be the first in the m=audio line, if set.
function maybePreferVideoSendCodec(sdp, params) {
  return maybePreferCodec(sdp, 'video', 'send', params.videoSendCodec);
}

// Promotes |videoRecvCodec| to be the first in the m=audio line, if set.
function maybePreferVideoReceiveCodec(sdp, params) {
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
  var payload = getCodecPayloadType(sdpLines, codec);
  if (payload) {
    sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Set fmtp param to specific codec in SDP. If param does not exists, add it.
function setCodecParam(sdp, codec, param, value) {
  var sdpLines = sdp.split('\r\n');

  var fmtpLineIndex = findFmtpLine(sdpLines, codec);

  var fmtpObj = {};
  if (fmtpLineIndex === null) {
    var index = findLine(sdpLines, 'a=rtpmap', codec);
    if (index === null) {
      return sdp;
    }
    var payload = getCodecPayloadTypeFromLine(sdpLines[index]);
    fmtpObj.pt = payload.toString();
    fmtpObj.params = {};
    fmtpObj.params[param] = value;
    sdpLines.splice(index + 1, 0, writeFmtpLine(fmtpObj));
  } else {
    fmtpObj = parseFmtpLine(sdpLines[fmtpLineIndex]);
    fmtpObj.params[param] = value;
    sdpLines[fmtpLineIndex] = writeFmtpLine(fmtpObj);
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Remove fmtp param if it exists.
function removeCodecParam(sdp, codec, param) {
  var sdpLines = sdp.split('\r\n');

  var fmtpLineIndex = findFmtpLine(sdpLines, codec);
  if (fmtpLineIndex === null) {
    return sdp;
  }

  var map = parseFmtpLine(sdpLines[fmtpLineIndex]);
  delete map.params[param];

  var newLine = writeFmtpLine(map);
  if (newLine === null) {
    sdpLines.splice(fmtpLineIndex, 1);
  } else {
    sdpLines[fmtpLineIndex] = newLine;
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Split an fmtp line into an object including 'pt' and 'params'.
function parseFmtpLine(fmtpLine) {
  var fmtpObj = {};
  var spacePos = fmtpLine.indexOf(' ');
  var keyValues = fmtpLine.substring(spacePos + 1).split('; ');

  var pattern = new RegExp('a=fmtp:(\\d+)');
  var result = fmtpLine.match(pattern);
  if (result && result.length === 2) {
    fmtpObj.pt = result[1];
  } else {
    return null;
  }

  var params = {};
  for (var i = 0; i < keyValues.length; ++i) {
    var pair = keyValues[i].split('=');
    if (pair.length === 2) {
      params[pair[0]] = pair[1];
    }
  }
  fmtpObj.params = params;

  return fmtpObj;
}

// Generate an fmtp line from an object including 'pt' and 'params'.
function writeFmtpLine(fmtpObj) {
  if (!fmtpObj.hasOwnProperty('pt') || !fmtpObj.hasOwnProperty('params')) {
    return null;
  }
  var pt = fmtpObj.pt;
  var params = fmtpObj.params;
  var keyValues = [];
  var i = 0;
  for (var key in params) {
    keyValues[i] = key + '=' + params[key];
    ++i;
  }
  if (i === 0) {
    return null;
  }
  return 'a=fmtp:' + pt.toString() + ' ' + keyValues.join('; ');
}

// Find fmtp attribute for |codec| in |sdpLines|.
function findFmtpLine(sdpLines, codec) {
  // Find payload of codec.
  var payload = getCodecPayloadType(sdpLines, codec);
  // Find the payload in fmtp line.
  return payload ? findLine(sdpLines, 'a=fmtp:' + payload.toString()) : null;
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

// Gets the codec payload type from sdp lines.
function getCodecPayloadType(sdpLines, codec) {
  var index = findLine(sdpLines, 'a=rtpmap', codec);
  return index ? getCodecPayloadTypeFromLine(sdpLines[index]) : null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadTypeFromLine(sdpLine) {
  var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
  var result = sdpLine.match(pattern);
  return (result && result.length === 2) ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');

  // Just copy the first three parameters; codec order starts on fourth.
  var newLine = elements.slice(0, 3);

  // Put target payload first and copy in the rest.
  newLine.push(payload);
  for (var i = 3; i < elements.length; i++) {
    if (elements[i] !== payload) {
      newLine.push(elements[i]);
    }
  }
  return newLine.join(' ');
}
