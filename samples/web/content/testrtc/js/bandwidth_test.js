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

addTestSuite('Data channel throughput', testDataChannelThroughput);

function WebRTCCall() {
  this.pc1 = new RTCPeerConnection(null);
  this.pc2 = new RTCPeerConnection(null);

  this.pc1.addEventListener('icecandidate', this.onIceCandidate_.bind(this, this.pc2));
  this.pc2.addEventListener('icecandidate', this.onIceCandidate_.bind(this, this.pc1));
}

WebRTCCall.prototype = {
  establishConnection: function () {
    this.pc1.createOffer(this.gotOffer_.bind(this));
  },

  close: function () {
    this.pc1.close();
    this.pc2.close();
  },

  gotOffer_: function (offer) {
    this.pc1.setLocalDescription(offer);
    this.pc2.setRemoteDescription(offer);
    this.pc2.createAnswer(this.gotAnswer_.bind(this));
  },

  gotAnswer_: function (answer) {
    this.pc2.setLocalDescription(answer);
    this.pc1.setRemoteDescription(answer);
  },
  
  onIceCandidate_: function (otherPeer) {
    if (event.candidate) {
      otherPeer.addIceCandidate(event.candidate);
    }
  }
}

// TODO(andresp): At the moment this runs in local loopback. Improve WebRTCCall
// to allow running with constrained ice candidates.
function testDataChannelThroughput() {
  var call = new WebRTCCall();
  var timeIntervalSeconds = 1.0;
  var startTime = null;
  var sentPayloadBytes = 0;
  var receivedPayloadBytes = 0;
  var stopSending = false;
  var samplePacket = "";
  var numberOfPackets = 20;

  for (var i = 0; i != 1024; ++i) samplePacket += 'h';

  var receiveChannel = null;
  var senderChannel = call.pc1.createDataChannel(null);
  call.pc2.addEventListener('datachannel', onReceiverChannel);
  call.establishConnection();

  function onReceiverChannel(event) {
     receiveChannel = event.channel;
     receiveChannel.addEventListener('message', onMessageReceived);
     setTimeout(sendingStep, 0);
  }

  function sendingStep() {
    if (senderChannel.bufferedAmount == 0) {
      for (var i = 0; i != numberOfPackets; ++i) {
        sentPayloadBytes += samplePacket.length;
        senderChannel.send(samplePacket);
      }
    }
    var now = new Date();
    if (!startTime) startTime = now;
    if (now - startTime >= 1000 * timeIntervalSeconds) {
      stopSending = true;
    } else {
      setTimeout(sendingStep, 1);
    }
  }

  function onMessageReceived(event) {
    receivedPayloadBytes += event.data.length;
    if (stopSending && sentPayloadBytes == receivedPayloadBytes) {
      call.close();

      var elapsedTime = ((new Date()) - startTime) / 1000.0;
      reportSuccess('Sent ' + receivedPayloadBytes / 1000 + ' kilobytes in ' +
                    elapsedTime + ' seconds.');
      testSuiteFinished();
    }
  }
}
