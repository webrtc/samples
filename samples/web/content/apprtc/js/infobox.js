/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals computeBitrate, computeE2EDelay, computeRate, endTime, errorMessages,
   extractStatAsInt, gatheredIceCandidateTypes, getStatsReport,
   getStatsTimer:true, infoDiv, pc,
   prevStats:true, remoteVideo, startTime, stats:true */
/* exported toggleInfoDiv, updateInfoDiv */

'use strict';

function showInfoDiv() {
  getStatsTimer = setInterval(refreshStats, 1000);
  infoDiv.classList.add('active');
}

function toggleInfoDiv() {
  if (infoDiv.classList.contains('active')) {
    clearInterval(getStatsTimer);
    infoDiv.classList.remove('active');
  } else {
    showInfoDiv();
  }
}

function refreshStats() {
  if (pc) {
    pc.getStats(function(response) {
      prevStats = stats;
      stats = response.result();
      updateInfoDiv();
    });
  }
}

function updateInfoDiv() {
  var contents = '<pre id=\"stats\" style=\"line-height: initial\">';

  if (stats) {
    // Build the display.
    contents += buildLine('States');
    contents += buildLine('Signaling', pc.signalingState);
    contents += buildLine('Gathering', pc.iceGatheringState);
    contents += buildLine('Connection', pc.iceConnectionState);
    for (var endpoint in gatheredIceCandidateTypes) {
      var types = [];
      for (var type in gatheredIceCandidateTypes[endpoint]) {
        types.push(type + ':' + gatheredIceCandidateTypes[endpoint][type]);
      }
      contents += buildLine(endpoint, types.join(' '));
    }

    var activeCandPair = getStatsReport(stats, 'googCandidatePair',
        'googActiveConnection', 'true');
    var localAddr, remoteAddr, localAddrType, remoteAddrType;
    if (activeCandPair) {
      localAddr = activeCandPair.stat('googLocalAddress');
      remoteAddr = activeCandPair.stat('googRemoteAddress');
      localAddrType = activeCandPair.stat('googLocalCandidateType');
      remoteAddrType = activeCandPair.stat('googRemoteCandidateType');
    }
    if (localAddr && remoteAddr) {
      contents += buildLine('LocalAddr', localAddr +
          ' (' + localAddrType + ')');
      contents += buildLine('RemoteAddr', remoteAddr +
          ' (' + remoteAddrType + ')');
    }
    contents += buildLine();

    contents += buildStatsSection();
  }

  if (errorMessages.length) {
    infoDiv.classList.add('warning');
    for (var i = 0; i !== errorMessages.length; ++i) {
      contents += errorMessages[i] + '\n';
    }
  } else {
    infoDiv.classList.remove('warning');
  }

  contents += '</pre>';

  if (infoDiv.innerHTML !== contents) {
    infoDiv.innerHTML = contents;
  }
}

function buildStatsSection() {
  var contents = buildLine('Stats');

  // Obtain setup and latency stats.
  var rtt = extractStatAsInt(stats, 'ssrc', 'googRtt');
  var captureStart = extractStatAsInt(stats, 'ssrc',
      'googCaptureStartNtpTimeMs');
  var e2eDelay = computeE2EDelay(captureStart, remoteVideo.currentTime);
  if (endTime !== null) {
    contents += buildLine('Setup time',
        (endTime - startTime).toFixed(0).toString() + 'ms');
  }
  if (rtt !== null) {
    contents += buildLine('RTT', rtt.toString() + 'ms');
  }
  if (e2eDelay !== null) {
    contents += buildLine('End to end', e2eDelay.toString() + 'ms');
  }

  // Obtain resolution, framerate, and bitrate stats.
  // TODO(juberti): find a better way to tell these apart.
  var txAudio = getStatsReport(stats, 'ssrc', 'audioInputLevel');
  var rxAudio = getStatsReport(stats, 'ssrc', 'audioOutputLevel');
  var txVideo = getStatsReport(stats, 'ssrc', 'googFirsReceived');
  var rxVideo = getStatsReport(stats, 'ssrc', 'googFirsSent');
  var txPrevAudio = getStatsReport(prevStats, 'ssrc', 'audioInputLevel');
  var rxPrevAudio = getStatsReport(prevStats, 'ssrc', 'audioOutputLevel');
  var txPrevVideo = getStatsReport(prevStats, 'ssrc', 'googFirsReceived');
  var rxPrevVideo = getStatsReport(prevStats, 'ssrc', 'googFirsSent');
  var txAudioCodec, txAudioBitrate, txAudioPacketRate;
  var rxAudioCodec, rxAudioBitrate, rxAudioPacketRate;
  var txVideoHeight, txVideoFps, txVideoCodec;
  var txVideoBitrate, txVideoPacketRate;
  var rxVideoHeight, rxVideoFps, rxVideoCodec;
  var rxVideoBitrate, rxVideoPacketRate;
  if (txAudio) {
    txAudioCodec = txAudio.stat('googCodecName');
    txAudioBitrate = computeBitrate(txAudio, txPrevAudio, 'bytesSent');
    txAudioPacketRate = computeRate(txAudio, txPrevAudio, 'packetsSent');
  }
  if (rxAudio) {
    rxAudioCodec = rxAudio.stat('googCodecName');
    rxAudioBitrate = computeBitrate(rxAudio, rxPrevAudio, 'bytesReceived');
    rxAudioPacketRate = computeRate(rxAudio, rxPrevAudio, 'packetsReceived');
  }
  if (txVideo) {
    txVideoCodec = txVideo.stat('googCodecName');
    txVideoHeight = txVideo.stat('googFrameHeightSent');
    txVideoFps = txVideo.stat('googFrameRateSent');
    txVideoBitrate = computeBitrate(txVideo, txPrevVideo, 'bytesSent');
    txVideoPacketRate = computeRate(txVideo, txPrevVideo, 'packetsSent');
  }
  if (rxVideo) {
    rxVideoCodec = 'TODO';  // rxVideo.stat('googCodecName');
    rxVideoHeight = remoteVideo.videoHeight;
    // TODO(juberti): this should ideally be obtained from the video element.
    rxVideoFps = rxVideo.stat('googFrameRateDecoded');
    rxVideoBitrate = computeBitrate(rxVideo, rxPrevVideo, 'bytesReceived');
    rxVideoPacketRate = computeRate(rxVideo, rxPrevVideo, 'packetsReceived');
  }
  contents += buildLine('Audio Tx', txAudioCodec + ', ' +
      formatBitrate(txAudioBitrate) + ', ' +
      formatPacketRate(txAudioPacketRate));
  contents += buildLine('Audio Rx', rxAudioCodec + ', ' +
      formatBitrate(rxAudioBitrate)  + ', ' +
      formatPacketRate(rxAudioPacketRate));
  contents += buildLine('Video Tx',
      txVideoCodec + ', ' + txVideoHeight.toString() + 'p' +
      txVideoFps.toString() + ', ' + formatBitrate(txVideoBitrate) + ', ' +
      formatPacketRate(txVideoPacketRate));
  contents += buildLine('Video Rx',
      rxVideoCodec + ', ' + rxVideoHeight.toString() + 'p' +
      rxVideoFps.toString() + ', ' + formatBitrate(rxVideoBitrate) + ', ' +
      formatPacketRate(rxVideoPacketRate));
  return contents;
}

function buildLine(label, value) {
  var columnWidth = 12;
  var line = '';
  if (label) {
    line += label + ':';
    while (line.length < columnWidth) {
      line += ' ';
    }

    if (value) {
      line += value;
    }
  }
  line += '\n';
  return line;
}

function formatBitrate(value) {
  var suffix;
  if (value < 1000) {
    suffix = 'bps';
  } else if (value < 1000000) {
    suffix = 'kbps';
    value /= 1000;
  } else {
    suffix = 'Mbps';
    value /= 1000000;
  }

  var str = value.toPrecision(3) + ' ' + suffix;
  return str;
}

function formatPacketRate(value) {
  return value.toPrecision(3) + ' ' + 'pps';
}
