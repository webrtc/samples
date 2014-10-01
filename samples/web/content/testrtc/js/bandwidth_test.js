/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, quotmark: single, undef: true, unused: strict */

'use strict';

// Creates a loopback via relay candidates and tries to send as many packets
// with 1024 chars as possible while keeping dataChannel bufferedAmmount above
// zero.
addTestSuite('Data channel throughput',
  asyncCreateTurnConfig.bind(null, testDataChannelThroughput, reportFatal));

function testDataChannelThroughput(config) {
  var call = new WebRTCCall(config);
  call.isGoodCandidate = checkRelay;
  var testDurationSeconds = 5.0;
  var startTime = null;
  var sentPayloadBytes = 0;
  var receivedPayloadBytes = 0;
  var stopSending = false;
  var samplePacket = "";
  for (var i = 0; i != 1024; ++i) samplePacket += 'h';

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

    for (var i = 0; i != maxNumberOfPacketsToSend; ++i) {
      if (senderChannel.bufferedAmount >= bytesToKeepBuffered) {
        break;
      }
      sentPayloadBytes += samplePacket.length;
      senderChannel.send(samplePacket);
    }

    if (now - startTime >= 1000 * testDurationSeconds) {
      stopSending = true;
    } else {
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
    if (stopSending && sentPayloadBytes == receivedPayloadBytes) {
      call.close();

      var elapsedTime = Math.round((now - startTime) * 10) / 10000.0;
      var receivedKBits = receivedPayloadBytes * 8 / 1000;
      reportSuccess('Total transmitted: ' + receivedKBits + ' kilo-bits in ' +
                    elapsedTime + ' seconds.');
      testSuiteFinished();
    }
  }
}

// Measures video bandwidth estimation performance by doing a loopback call via
// relay candidates during 40 seconds. Computes rtt and bandwidth estimation
// average and maximum as well as time to ramp up (defined as reaching 75% of
// the max bitrate. It reports infinity time to ramp up if never reaches it.
addTestSuite('Video Bandwidth Test',
  asyncCreateTurnConfig.bind(null, testVideoBandwidth, reportFatal));

function testVideoBandwidth(config) {
  var maxVideoBitrateKbps = 2000;
  var durationMs = 40000;
  var statStepMs = 100;
  var bweStats = new StatisticsAggregate(0.75 * maxVideoBitrateKbps * 1000);
  var rttStats = new StatisticsAggregate();

  var call = new WebRTCCall(config);
  var startTime;
  call.isGoodCandidate = checkRelay;

  // FEC makes it hard to study bwe estimation since there seems to be a spike
  // when it is enabled and disabled. Disable it for now. FEC issue tracked on:
  // https://code.google.com/p/webrtc/issues/detail?id=3050
  constrainOfferToRemoveFec(call.pc1);

  constrainBitrateAnswer(call.pc2, maxVideoBitrateKbps);

  doGetUserMedia({audio: false, video: true}, gotStream, reportFatal);

  function gotStream(stream) {
     call.pc1.addStream(stream);
     call.establishConnection();
     startTime = new Date();
     setTimeout(gatherStats, statStepMs);
  }

  function gatherStats() {
     if ((new Date()) - startTime > durationMs)
       completed();
     else
       call.pc1.getStats(gotStats);
  }

  function gotStats(response) {
    for (var index in response.result()) {
      var report = response.result()[index];
      if (report.id == "bweforvideo") {
        bweStats.add(Date.parse(report.timestamp),
          parseInt(report.stat("googAvailableSendBandwidth")));
      } else if (report.type == "ssrc") {
        rttStats.add(Date.parse(report.timestamp),
          parseInt(report.stat("googRtt")));
      }
    }
    setTimeout(gatherStats, statStepMs);
  }

  function completed() {
    call.close();
    reportSuccess("RTT average: " + rttStats.getAverage() + " ms");
    reportSuccess("RTT max: " + rttStats.getMax() + " ms");
    reportSuccess("Send bandwidth average: " + bweStats.getAverage() + " bps");
    reportSuccess("Send bandwidth max: " + bweStats.getMax() + " bps");
    reportSuccess("Send bandwidth ramp-up time: " + bweStats.getRampUpTime() + " ms");
    reportSuccess('Test finished');
    testSuiteFinished();
  }
}
