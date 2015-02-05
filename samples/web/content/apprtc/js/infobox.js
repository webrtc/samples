/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals computeBitrate, computeE2EDelay, extractStatAsInt, getStatsReport,
   iceCandidateType, computeRate */
/* exported InfoBox */

'use strict';

var InfoBox = function(infoDiv, remoteVideo, call, versionInfo) {
  this.infoDiv_ = infoDiv;
  this.remoteVideo_ = remoteVideo;
  this.call_ = call;
  this.versionInfo_ = versionInfo;

  this.errorMessages_ = [];
  // Time when the call was intiated and accepted.
  this.startTime_ = null;
  this.connectTime_ = null;
  this.stats_ = null;
  this.prevStats_ = null;
  this.getStatsTimer_ = null;

  // Types of gathered ICE Candidates.
  this.iceCandidateTypes_ = {
    Local: {},
    Remote: {}
  };
};

InfoBox.prototype.recordIceCandidateTypes = function(location, candidate) {
  var type = iceCandidateType(candidate);

  var types = this.iceCandidateTypes_[location];
  if (!types[type]) {
    types[type] = 1;
  } else {
    ++types[type];
  }
  this.updateInfoDiv();
};

InfoBox.prototype.pushErrorMessage = function(msg) {
  this.errorMessages_.push(msg);
  this.updateInfoDiv();
  this.showInfoDiv();
};

InfoBox.prototype.setSetupTimes = function(startTime, connectTime) {
  this.startTime_ =  startTime;
  this.connectTime_ = connectTime;
};

InfoBox.prototype.showInfoDiv = function() {
  this.getStatsTimer_ = setInterval(this.refreshStats_.bind(this), 1000);
  this.refreshStats_();
  this.infoDiv_.classList.add('active');
};

InfoBox.prototype.toggleInfoDiv = function() {
  if (this.infoDiv_.classList.contains('active')) {
    clearInterval(this.getStatsTimer_);
    this.infoDiv_.classList.remove('active');
  } else {
    this.showInfoDiv();
  }
};

InfoBox.prototype.refreshStats_ = function() {
  this.call_.getPeerConnectionStats(function(response) {
    this.prevStats_ = this.stats_;
    this.stats_ = response.result();
    this.updateInfoDiv();
  }.bind(this));
};

InfoBox.prototype.updateInfoDiv = function() {
  var contents = '<pre id=\"info-box-stats\" style=\"line-height: initial\">';

  if (this.stats_) {
    var states = this.call_.getPeerConnectionStates();
    if (!states) {
      return;
    }
    // Build the display.
    contents += this.buildLine_('States');
    contents += this.buildLine_('Signaling', states.signalingState);
    contents += this.buildLine_('Gathering', states.iceGatheringState);
    contents += this.buildLine_('Connection', states.iceConnectionState);
    for (var endpoint in this.iceCandidateTypes_) {
      var types = [];
      for (var type in this.iceCandidateTypes_[endpoint]) {
        types.push(type + ':' + this.iceCandidateTypes_[endpoint][type]);
      }
      contents += this.buildLine_(endpoint, types.join(' '));
    }

    var activeCandPair = getStatsReport(this.stats_, 'googCandidatePair',
        'googActiveConnection', 'true');
    var localAddr;
    var remoteAddr;
    var localAddrType;
    var remoteAddrType;
    if (activeCandPair) {
      localAddr = activeCandPair.stat('googLocalAddress');
      remoteAddr = activeCandPair.stat('googRemoteAddress');
      localAddrType = activeCandPair.stat('googLocalCandidateType');
      remoteAddrType = activeCandPair.stat('googRemoteCandidateType');
    }
    if (localAddr && remoteAddr) {
      contents += this.buildLine_('LocalAddr', localAddr +
          ' (' + localAddrType + ')');
      contents += this.buildLine_('RemoteAddr', remoteAddr +
          ' (' + remoteAddrType + ')');
    }
    contents += this.buildLine_();

    contents += this.buildStatsSection_();
  }

  if (this.errorMessages_.length) {
    this.infoDiv_.classList.add('warning');
    for (var i = 0; i !== this.errorMessages_.length; ++i) {
      contents += this.errorMessages_[i] + '\n';
    }
  } else {
    this.infoDiv_.classList.remove('warning');
  }

  if (this.versionInfo_) {
    contents += this.buildLine_();
    contents += this.buildLine_('Version');
    for (var key in this.versionInfo_) {
      contents += this.buildLine_(key, this.versionInfo_[key]);
    }
  }

  contents += '</pre>';

  if (this.infoDiv_.innerHTML !== contents) {
    this.infoDiv_.innerHTML = contents;
  }
};

InfoBox.prototype.buildStatsSection_ = function() {
  var contents = this.buildLine_('Stats');

  // Obtain setup and latency this.stats_.
  var rtt = extractStatAsInt(this.stats_, 'ssrc', 'googRtt');
  var captureStart = extractStatAsInt(this.stats_, 'ssrc',
      'googCaptureStartNtpTimeMs');
  var e2eDelay = computeE2EDelay(captureStart, this.remoteVideo_.currentTime);
  if (this.endTime_ !== null) {
    contents += this.buildLine_('Call time',
        InfoBox.formatInterval_(window.performance.now() - this.connectTime_));
    contents += this.buildLine_('Setup time',
        InfoBox.formatMsec_(this.connectTime_ - this.startTime_));
  }
  if (rtt !== null) {
    contents += this.buildLine_('RTT', InfoBox.formatMsec_(rtt));
  }
  if (e2eDelay !== null) {
    contents += this.buildLine_('End to end', InfoBox.formatMsec_(e2eDelay));
  }

  // Obtain resolution, framerate, and bitrate this.stats_.
  // TODO(juberti): find a better way to tell these apart.
  var txAudio = getStatsReport(this.stats_, 'ssrc', 'audioInputLevel');
  var rxAudio = getStatsReport(this.stats_, 'ssrc', 'audioOutputLevel');
  var txVideo = getStatsReport(this.stats_, 'ssrc', 'googFirsReceived');
  var rxVideo = getStatsReport(this.stats_, 'ssrc', 'googFirsSent');
  var txPrevAudio = getStatsReport(this.prevStats_, 'ssrc', 'audioInputLevel');
  var rxPrevAudio = getStatsReport(this.prevStats_, 'ssrc', 'audioOutputLevel');
  var txPrevVideo = getStatsReport(this.prevStats_, 'ssrc', 'googFirsReceived');
  var rxPrevVideo = getStatsReport(this.prevStats_, 'ssrc', 'googFirsSent');
  var txAudioCodec;
  var txAudioBitrate;
  var txAudioPacketRate;
  var rxAudioCodec;
  var rxAudioBitrate;
  var rxAudioPacketRate;
  var txVideoHeight;
  var txVideoFps;
  var txVideoCodec;
  var txVideoBitrate;
  var txVideoPacketRate;
  var rxVideoHeight;
  var rxVideoFps;
  var rxVideoCodec;
  var rxVideoBitrate;
  var rxVideoPacketRate;
  if (txAudio) {
    txAudioCodec = txAudio.stat('googCodecName');
    txAudioBitrate = computeBitrate(txAudio, txPrevAudio, 'bytesSent');
    txAudioPacketRate = computeRate(txAudio, txPrevAudio, 'packetsSent');
    contents += this.buildLine_('Audio Tx', txAudioCodec + ', ' +
        InfoBox.formatBitrate_(txAudioBitrate) + ', ' +
        InfoBox.formatPacketRate_(txAudioPacketRate));
  }
  if (rxAudio) {
    rxAudioCodec = rxAudio.stat('googCodecName');
    rxAudioBitrate = computeBitrate(rxAudio, rxPrevAudio, 'bytesReceived');
    rxAudioPacketRate = computeRate(rxAudio, rxPrevAudio, 'packetsReceived');
    contents += this.buildLine_('Audio Rx', rxAudioCodec + ', ' +
        InfoBox.formatBitrate_(rxAudioBitrate)  + ', ' +
        InfoBox.formatPacketRate_(rxAudioPacketRate));
  }
  if (txVideo) {
    txVideoCodec = txVideo.stat('googCodecName');
    txVideoHeight = txVideo.stat('googFrameHeightSent');
    txVideoFps = txVideo.stat('googFrameRateSent');
    txVideoBitrate = computeBitrate(txVideo, txPrevVideo, 'bytesSent');
    txVideoPacketRate = computeRate(txVideo, txPrevVideo, 'packetsSent');
    contents += this.buildLine_('Video Tx',
        txVideoCodec + ', ' + txVideoHeight.toString() + 'p' +
        txVideoFps.toString() + ', ' +
        InfoBox.formatBitrate_(txVideoBitrate) + ', ' +
        InfoBox.formatPacketRate_(txVideoPacketRate));
  }
  if (rxVideo) {
    rxVideoCodec = 'TODO';  // rxVideo.stat('googCodecName');
    rxVideoHeight = this.remoteVideo_.videoHeight;
    // TODO(juberti): this should ideally be obtained from the video element.
    rxVideoFps = rxVideo.stat('googFrameRateDecoded');
    rxVideoBitrate = computeBitrate(rxVideo, rxPrevVideo, 'bytesReceived');
    rxVideoPacketRate = computeRate(rxVideo, rxPrevVideo, 'packetsReceived');
    contents += this.buildLine_('Video Rx',
        rxVideoCodec + ', ' + rxVideoHeight.toString() + 'p' +
        rxVideoFps.toString() + ', ' +
        InfoBox.formatBitrate_(rxVideoBitrate) + ', ' +
        InfoBox.formatPacketRate_(rxVideoPacketRate));
  }
  return contents;
};

InfoBox.prototype.buildLine_ = function(label, value) {
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
};

// Convert a number of milliseconds into a '[HH:]MM:SS' string.
InfoBox.formatInterval_ = function(value) {
  var result = '';
  var seconds = Math.floor(value / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  var formatTwoDigit = function(twodigit) {
    return ((twodigit < 10) ? '0' : '') + twodigit.toString();
  };

  if (hours > 0) {
    result += formatTwoDigit(hours) + ':';
  }
  result += formatTwoDigit(minutes - hours * 60) + ':';
  result += formatTwoDigit(seconds - minutes * 60);
  return result;
};

// Convert a number of milliesconds into a 'XXX ms' string.
InfoBox.formatMsec_ = function(value) {
  return value.toFixed(0).toString() + ' ms';
};

// Convert a bitrate into a 'XXX Xbps' string.
InfoBox.formatBitrate_ = function(value) {
  if (!value) {
    return '- bps';
  }

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
};

// Convert a packet rate into a 'XXX pps' string.
InfoBox.formatPacketRate_ = function(value) {
  if (!value) {
    return '- pps';
  }
  return value.toPrecision(3) + ' ' + 'pps';
};
