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
