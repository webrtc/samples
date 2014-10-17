/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

var apprtc = apprtc || {};
apprtc.util = apprtc.util || {};

(function() {

var Log = apprtc.Log;

apprtc.util.updateTurnServerUrl = function(options, onTurnCompleted) {
  var turnUrl = options.turnUrl;
  // Allow to skip turn by passing ts=false to apprtc.
  if (turnUrl === '') {
    onTurnCompleted();
    return;
  }

  var peerConnectionConfig = options.peerConnectionConfig;
  for (var i = 0, len = peerConnectionConfig.iceServers.length; i < len; i++) {
    if (peerConnectionConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      onTurnCompleted();
      return;
    }
  }

  var currentDomain = document.domain;
  if (currentDomain.search('localhost') === -1 &&
      currentDomain.search('apprtc') === -1) {
    // Not authorized domain. Try with default STUN instead.
    onTurnCompleted();
    return;
  }

  // No TURN server. Get one from computeengineondemand.appspot.com.
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) {
      return;
    }
    if (xhr.status === 200) {
      var turnServer = JSON.parse(xhr.responseText);
      // Create turnUris using the polyfill (adapter.js).
      var iceServers = createIceServers(turnServer.uris,
          turnServer.username, turnServer.password);
      if (iceServers !== null) {
        peerConnectionConfig.iceServers =
            peerConnectionConfig.iceServers.concat(iceServers);
      }
    } else {
      Log.error('No TURN server; unlikely that media will traverse networks. ' +
          'If this persists please report it to ' +
          'discuss-webrtc@googlegroups.com.');
    }
    // If TURN request failed, continue the call with default STUN.
    onTurnCompleted();
  };
  xhr.open('GET', turnUrl, true);
  xhr.send();  
};

apprtc.util.getIceCandidateType = function(candidateSdp) {
  switch (candidateSdp.split(' ')[7]) {
    case 'host':
      return 'HOST';
    case 'srflx':
      return 'STUN';
    case 'relay':
      return 'TURN';
    default:
      return 'UNKNOWN';
  }
};

apprtc.util.mergeConstraints = function(cons1, cons2) {
  var merged = cons1;
  for (var name in cons2.mandatory) {
    merged.mandatory[name] = cons2.mandatory[name];
  }
  merged.optional = merged.optional.concat(cons2.optional);
  return merged;
};

apprtc.util.updateAudioSendBitRate = function(sdp, options) {
  var audioSendBitrate = options.audioSendBitrate;
  if (!audioSendBitrate) {
    return sdp;
  }
  Log.info('Prefer audio send bitrate: ' + audioSendBitrate);
  return apprtc.util.updateBitRate(sdp, audioSendBitrate, 'audio');
};

apprtc.util.updateAudioReceiveBitRate = function(sdp, options) {
  var audioRecvBitrate = options.audioRecvBitrate;
  if (!audioRecvBitrate) {
    return sdp;
  }
  Log.info('Prefer audio receive bitrate: ' + audioRecvBitrate);
  return apprtc.util.updateBitRate(sdp, audioRecvBitrate, 'audio');
};

apprtc.util.updateVideoSendBitRate = function(sdp, options) {
  var videoSendBitrate = options.videoSendBitrate;
  if (!videoSendBitrate) {
    return sdp;
  }
  Log.info('Prefer video send bitrate: ' + videoSendBitrate);
  return apprtc.util.updateBitRate(sdp, videoSendBitrate, 'video');
};

apprtc.util.updateVideoReceiveBitRate = function(sdp, options) {
  var videoRecvBitrate = options.videoRecvBitrate;
  if (!videoRecvBitrate) {
    return sdp;
  }
  Log.info('Prefer video receive bitrate: ' + videoRecvBitrate);
  return apprtc.util.updateBitRate(sdp, videoRecvBitrate, 'video');
};

// Adds a b=AS:bitrate line to the m=mediaType section.
apprtc.util.updateBitRate = function(sdp, bitrate, mediaType) {
  var sdpLines = sdp.split('\r\n');

  // Find m line for the given mediaType.
  var mLineIndex = findLine(sdpLines, 'm=', mediaType);
  if (mLineIndex === null) {
    Log.error('Failed to add bandwidth line to sdp, as no m-line found');
    return sdp;
  }

  // Find next m-line if any.
  var nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, 'm=');
  if (nextMLineIndex === null) {
    nextMLineIndex = sdpLines.length;
  }

  // Find c-line corresponding to the m-line.
  var cLineIndex = findLineInRange(sdpLines, mLineIndex + 1, nextMLineIndex,
      'c=');
  if (cLineIndex === null) {
    Log.error('Failed to add bandwidth line to sdp, as no c-line found');
    return sdp;
  }

  // Check if bandwidth line already exists between c-line and next m-line.
  var bLineIndex = apprtc.util.findLineInRange(
      sdpLines, cLineIndex + 1, nextMLineIndex, 'b=AS');
  if (bLineIndex) {
    sdpLines.splice(bLineIndex, 1);
  }

  // Create the b (bandwidth) sdp line.
  var bwLine = 'b=AS:' + bitrate;
  // As per RFC 4566, the b line should follow after c-line.
  sdpLines.splice(cLineIndex + 1, 0, bwLine);
  sdp = sdpLines.join('\r\n');
  return sdp;
};

// Adds an a=fmtp: x-google-min-bitrate=kbps line, if videoSendInitialBitrate
// is specified. We'll also add a x-google-min-bitrate value, since the max
// must be >= the min.
apprtc.util.updateVideoSendInitialBitRate = function(sdp, options) {
  var videoSendInitialBitrate = options.videoSendInitialBitrate;
  if (!videoSendInitialBitrate) {
    return sdp;
  }

  // Validate the initial bitrate value.
  var maxBitrate = videoSendInitialBitrate;
  var videoSendBitrate = options.videoSendBitrate;
  if (videoSendBitrate) {
    if (videoSendInitialBitrate > videoSendBitrate) {
      Log.error('Clamping initial bitrate to max bitrate of ' +
          videoSendBitrate + ' kbps.');
      videoSendInitialBitrate = videoSendBitrate;
    }
    maxBitrate = videoSendBitrate;
  }

  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = apprtc.util.findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === null) {
    Log.error('Failed to find video m-line');
    return sdp;
  }

  var vp8RtpmapIndex = apprtc.util.findLine(sdpLines, 'a=rtpmap', 'VP8/90000');
  var vp8Payload = apprtc.util.getCodecPayloadType(sdpLines[vp8RtpmapIndex]);
  var vp8Fmtp = 'a=fmtp:' + vp8Payload + ' x-google-min-bitrate=' +
      videoSendInitialBitrate.toString() + '; x-google-max-bitrate=' +
      maxBitrate.toString();
  sdpLines.splice(vp8RtpmapIndex + 1, 0, vp8Fmtp);
  return sdpLines.join('\r\n');
};

// Promotes |audioSendCodec| to be the first in the m=audio line, if set.
apprtc.util.updateAudioSendCodec = function(sdp, options) {
  var audioSendCodec = options.audioSendCodec;
  if (audioSendCodec === '') {
    Log.info('No preference on audio send codec.');
    return sdp;
  }
  Log.info('Prefer audio send codec: ' + audioSendCodec);
  return apprtc.util.updateAudioCodec(sdp, audioSendCodec);
};

// Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
apprtc.util.updateAudioReceiveCodec = function(sdp, options) {
  var audioRecvCodec = options.audioRecvCodec;
  if (audioRecvCodec === '') {
    Log.info('No preference on audio receive codec.');
    return sdp;
  }
  Log.info('Prefer audio receive codec: ' + audioRecvCodec);
  return apprtc.util.updateAudioCodec(sdp, audioRecvCodec);
};

// Sets |codec| as the default audio codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
apprtc.util.updateAudioCodec = function(sdp, codec) {
  var sdpLines = sdp.split('\r\n');

  // Search for m line.
  var mLineIndex = apprtc.util.findLine(sdpLines, 'm=', 'audio');
  if (mLineIndex === null) {
    return sdp;
  }

  // If the codec is available, set it as the default in m line.
  var codecIndex = apprtc.util.findLine(sdpLines, 'a=rtpmap', codec);
  if (codecIndex) {
    var payload = apprtc.util.getCodecPayloadType(sdpLines[codecIndex]);
    if (payload) {
      sdpLines[mLineIndex] =
          apprtc.util.setDefaultCodec(sdpLines[mLineIndex], payload);
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
};

// Adds fmtp param to specified codec in SDP.
apprtc.util.addCodecParam = function(sdp, codec, param) {
  var sdpLines = sdp.split('\r\n');

  // Find opus payload.
  var index = apprtc.util.findLine(sdpLines, 'a=rtpmap', codec);
  var payload;
  if (index) {
    payload = apprtc.util.getCodecPayloadType(sdpLines[index]);
  }

  // Find the payload in fmtp line.
  var fmtpLineIndex = apprtc.util.findLine(
      sdpLines, 'a=fmtp:' + payload.toString());
  if (fmtpLineIndex === null) {
    return sdp;
  }

  sdpLines[fmtpLineIndex] = sdpLines[fmtpLineIndex].concat('; ', param);

  sdp = sdpLines.join('\r\n');
  return sdp;
};

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
apprtc.util.findLine = function(sdpLines, prefix, substr) {
  return apprtc.util.findLineInRange(sdpLines, 0, -1, prefix, substr);
};

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
apprtc.util.findLineInRange = function(
    sdpLines, startLine, endLine, prefix, substr) {
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
};

// Gets the codec payload type from an a=rtpmap:X line.
apprtc.util.getCodecPayloadType = function(sdpLine) {
  var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
  var result = sdpLine.match(pattern);
  return (result && result.length === 2) ? result[1] : null;
};

// Returns a new m= line with the specified codec as the first one.
apprtc.util.setDefaultCodec = function(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
};

// Updates the session description with overrides if present.
apprtc.util.updateLocalDescription = function(desc, options) {
  desc.sdp = apprtc.util.updateAudioReceiveCodec(desc.sdp, options);
  desc.sdp = apprtc.util.updateAudioReceiveBitRate(desc.sdp, options);
  desc.sdp = apprtc.util.updateVideoReceiveBitRate(desc.sdp, options);
};

// Updates the remote description with overrides if present.
apprtc.util.updateRemoteDescription = function(desc, options) {
  // Set Opus in Stereo, if stereo enabled.
  if (options.stereo) {
    desc.sdp = apprtc.util.addCodecParam(
        desc.sdp, 'opus/48000', 'stereo=1');
  }
  if (options.opusfec) {
    desc.sdp = apprtc.util.addCodecParam(
        desc.sdp, 'opus/48000', 'useinbandfec=1');
  }
  // Set Opus maxplaybackrate, if requested.
  if (options.opusMaxPbr) {
    desc.sdp = apprtc.util.addCodecParam(
        desc.sdp, 'opus/48000', 'maxplaybackrate=' + options.opusMaxPbr);
  }
  desc.sdp = apprtc.util.updateAudioSendCodec(desc.sdp, options);
  desc.sdp = apprtc.util.updateAudioSendBitRate(desc.sdp, options);
  desc.sdp = apprtc.util.updateVideoSendBitRate(desc.sdp, options);
  desc.sdp = apprtc.util.updateVideoSendInitialBitRate(desc.sdp, options);
};

})();
