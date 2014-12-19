/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

// Creates a loopback via relay candidates and tries to send as many packets
// with 1024 chars as possible while keeping dataChannel bufferedAmmount above
// zero.
addTest('Connectivity', 'Data throughput',
  Call.asyncCreateTurnConfig.bind(null, testDataChannelThroughput, reportFatal));

function testDataChannelThroughput(config) {
  var call = new Call(config);
  call.setIceCandidateFilter(Call.isRelay);
  var testDurationSeconds = 5.0;
  var startTime = null;
  var sentPayloadBytes = 0;
  var receivedPayloadBytes = 0;
  var stopSending = false;
  var samplePacket = '';

  for (var i = 0; i !== 1024; ++i) {
    samplePacket += 'h';
  }

  var maxNumberOfPacketsToSend = 100;
  var bytesToKeepBuffered = 1024 * maxNumberOfPacketsToSend;

  var lastBitrateMeasureTime;
  var lastReceivedPayloadBytes = 0;

  var receiveChannel = null;
  var senderChannel = call.pc1.createDataChannel(null);
  senderChannel.addEventListener('open', sendingStep);

  call.pc2.addEventListener('datachannel', onReceiverChannel);
  call.establishConnection();

  function onReceiverChannel(event) {
     receiveChannel = event.channel;
     receiveChannel.addEventListener('message', onMessageReceived);
  }

  function sendingStep() {
    var now = new Date();
    if (!startTime) {
      startTime = now;
      lastBitrateMeasureTime = now;
    }

    for (var i = 0; i !== maxNumberOfPacketsToSend; ++i) {
      if (senderChannel.bufferedAmount >= bytesToKeepBuffered) {
        break;
      }
      sentPayloadBytes += samplePacket.length;
      senderChannel.send(samplePacket);
    }

    if (now - startTime >= 1000 * testDurationSeconds) {
      setTestProgress(100);
      stopSending = true;
    } else {
      setTestProgress((now - startTime) / (10 * testDurationSeconds));
      setTimeout(sendingStep, 1);
    }
  }

  function onMessageReceived(event) {
    receivedPayloadBytes += event.data.length;
    var now = new Date();
    if (now - lastBitrateMeasureTime >= 1000) {
      var bitrate = (receivedPayloadBytes - lastReceivedPayloadBytes) /
                    (now - lastBitrateMeasureTime);
      bitrate = Math.round(bitrate * 1000 * 8) / 1000;
      reportSuccess('Transmitting at ' + bitrate + ' kbps.');
      lastReceivedPayloadBytes = receivedPayloadBytes;
      lastBitrateMeasureTime = now;
    }
    if (stopSending && sentPayloadBytes === receivedPayloadBytes) {
      call.close();

      var elapsedTime = Math.round((now - startTime) * 10) / 10000.0;
      var receivedKBits = receivedPayloadBytes * 8 / 1000;
      reportSuccess('Total transmitted: ' + receivedKBits + ' kilo-bits in ' +
                    elapsedTime + ' seconds.');
      testFinished();
    }
  }
}

// Measures video bandwidth estimation performance by doing a loopback call via
// relay candidates for 40 seconds. Computes rtt and bandwidth estimation
// average and maximum as well as time to ramp up (defined as reaching 75% of
// the max bitrate. It reports infinite time to ramp up if never reaches it.
addTest('Connectivity', 'Video bandwidth',
  Call.asyncCreateTurnConfig.bind(null, testVideoBandwidth, reportFatal));

function testVideoBandwidth(config) {
  var maxVideoBitrateKbps = 2000;
  var durationMs = 40000;
  var statStepMs = 100;
  var bweStats = new StatisticsAggregate(0.75 * maxVideoBitrateKbps * 1000);
  var rttStats = new StatisticsAggregate();
  var startTime;

  var call = new Call(config);
  call.setIceCandidateFilter(Call.isRelay);
  call.constrainVideoBitrate(maxVideoBitrateKbps);

  // FEC makes it hard to study bandwidth estimation since there seems to be
  // a spike when it is enabled and disabled. Disable it for now. FEC issue
  // tracked on: https://code.google.com/p/webrtc/issues/detail?id=3050
  call.disableVideoFec();

  doGetUserMedia({audio: false, video: true}, gotStream, reportFatal);

  function gotStream(stream) {
    call.pc1.addStream(stream);
    call.establishConnection();
    startTime = new Date();
    setTimeout(gatherStats, statStepMs);
  }

  function gatherStats() {
    var now = new Date();
    if (now - startTime > durationMs) {
      setTestProgress(100);
      completed();
    } else {
      setTestProgress((now - startTime) * 100 / durationMs);
      call.pc1.getStats(gotStats);
    }
  }

  function gotStats(response) {
    for (var index in response.result()) {
      var report = response.result()[index];
      if (report.id === 'bweforvideo') {
        bweStats.add(Date.parse(report.timestamp),
          parseInt(report.stat('googAvailableSendBandwidth')));
      } else if (report.type === 'ssrc') {
        rttStats.add(Date.parse(report.timestamp),
          parseInt(report.stat('googRtt')));
      }
    }
    setTimeout(gatherStats, statStepMs);
  }

  function completed() {
    call.pc1.getLocalStreams()[0].getVideoTracks()[0].stop();
    call.close();
    reportSuccess('RTT average: ' + rttStats.getAverage() + ' ms');
    reportSuccess('RTT max: ' + rttStats.getMax() + ' ms');
    reportSuccess('Send bandwidth estimate average: ' + bweStats.getAverage() + ' bps');
    reportSuccess('Send bandwidth estimate max: ' + bweStats.getMax() + ' bps');
    reportSuccess('Send bandwidth ramp-up time: ' + bweStats.getRampUpTime() + ' ms');
    reportSuccess('Test finished');
    testFinished();
  }
}

addExplicitTest('Connectivity', 'WiFi Periodic Scan',
  Call.asyncCreateTurnConfig.bind(null, testForWiFiPeriodicScan, reportFatal));

function testForWiFiPeriodicScan(config) {
  var testDurationMs = 5 * 60 * 1000;
  var sendIntervalMs = 100;
  var testFinished = false;
  var delays = [];
  var call = new Call(config);
  call.setIceCandidateFilter(Call.isRelay);

  var senderChannel = call.pc1.createDataChannel(null);
  senderChannel.addEventListener('open', send);
  call.pc2.addEventListener('datachannel', onReceiverChannel);
  call.establishConnection();

  setTimeoutWithProgressBar(finishTest, testDurationMs);

  function onReceiverChannel(event) {
     event.channel.addEventListener('message', receive);
  }

  function send() {
    if (testFinished) { return; }
    senderChannel.send('' + Date.now());
    setTimeout(send, sendIntervalMs);
  }

  function receive(event) {
    if (testFinished) { return; }
    var sendTime = parseInt(event.data);
    var delay = Date.now() - sendTime;
    delays.push(delay);
  }

  function finishTest() {
    report.traceEventInstant('periodic-delay', { delays: delays });
    testFinished = true;
    testFinished();
  }
}
