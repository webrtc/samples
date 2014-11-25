/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals computeE2EDelay, endTime, errorMessages, extractStatAsInt,
   gatheredIceCandidateTypes, getStatsReport, getStatsTimer:true, infoDiv, pc,
   refreshStats, remoteVideo, startTime, stats */
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

function updateInfoDiv() {
  var contents = '<pre id=\"stats\" style=\"line-height: initial\">';

  if (pc) {
    // Obtain any needed values from stats.
    var rtt = extractStatAsInt(stats, 'ssrc', 'googRtt');
    var captureStart = extractStatAsInt(stats, 'ssrc',
        'googCaptureStartNtpTimeMs');
    var e2eDelay = computeE2EDelay(captureStart, remoteVideo.currentTime);
    var activeCandPair = getStatsReport(stats, 'googCandidatePair',
        'googActiveConnection', 'true');
    var localAddr, remoteAddr;
    if (activeCandPair) {
      localAddr = activeCandPair.stat('googLocalAddress');
      remoteAddr = activeCandPair.stat('googRemoteAddress');
    }

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

    if (localAddr && remoteAddr) {
      contents += buildLine('LocalAddr', localAddr);
      contents += buildLine('RemoteAddr', remoteAddr);
    }
    contents += buildLine();

    contents += buildLine('Stats');

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


