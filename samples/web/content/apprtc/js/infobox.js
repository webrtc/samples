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

var InfoBox = function(infoDiv, remoteVideo, call) {
  this.infoDiv_ = infoDiv;
  this.remoteVideo_ = remoteVideo;
  this.call_ = call;

  this.errorMessages_ = [];
  this.stats_ = null;
  this.prevStats_ = null;
  this.callSetupDelay_ = null;
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

InfoBox.prototype.setCallSetupDelay = function(delay) {
  this.callSetupDelay_ = delay;
};

InfoBox.prototype.showInfoDiv = function() {
  this.getStatsTimer_ = setInterval(this.refreshStats_.bind(this), 1000);
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
  var contents = '<pre id=\"this.stats_\" style=\"line-height: initial\">';

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
    var localAddr, remoteAddr, localAddrType, remoteAddrType;
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
  if (this.callSetupDelay_ !== null) {
    contents += this.buildLine_('Setup time',
        this.callSetupDelay_.toFixed(0).toString() + 'ms');
  }
  if (rtt !== null) {
    contents += this.buildLine_('RTT', rtt.toString() + 'ms');
  }
  if (e2eDelay !== null) {
    contents += this.buildLine_('End to end', e2eDelay.toString() + 'ms');
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
    rxVideoHeight = this.remoteVideo_.videoHeight;
    // TODO(juberti): this should ideally be obtained from the video element.
    rxVideoFps = rxVideo.stat('googFrameRateDecoded');
    rxVideoBitrate = computeBitrate(rxVideo, rxPrevVideo, 'bytesReceived');
    rxVideoPacketRate = computeRate(rxVideo, rxPrevVideo, 'packetsReceived');
  }
  contents += this.buildLine_('Audio Tx', txAudioCodec + ', ' +
      this.formatBitrate_(txAudioBitrate) + ', ' +
      this.formatPacketRate_(txAudioPacketRate));
  contents += this.buildLine_('Audio Rx', rxAudioCodec + ', ' +
      this.formatBitrate_(rxAudioBitrate)  + ', ' +
      this.formatPacketRate_(rxAudioPacketRate));
  contents += this.buildLine_('Video Tx',
      txVideoCodec + ', ' + txVideoHeight.toString() + 'p' +
      txVideoFps.toString() + ', ' +
      this.formatBitrate_(txVideoBitrate) + ', ' +
      this.formatPacketRate_(txVideoPacketRate));
  contents += this.buildLine_('Video Rx',
      rxVideoCodec + ', ' + rxVideoHeight.toString() + 'p' +
      rxVideoFps.toString() + ', ' +
      this.formatBitrate_(rxVideoBitrate) + ', ' +
      this.formatPacketRate_(rxVideoPacketRate));

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

InfoBox.prototype.formatBitrate_ = function(value) {
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

InfoBox.prototype.formatPacketRate_ = function(value) {
  if (!value) {
    return '- pps';
  }
  return value.toPrecision(3) + ' ' + 'pps';
};
