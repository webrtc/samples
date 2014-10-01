/**
 * Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 * Use of this source code is governed by a BSD-style license
 * that can be found in the LICENSE file in the root of the source
 * tree. An additional intellectual property rights grant can be found
 * in the file PATENTS.  All contributing project authors may
 * be found in the AUTHORS file in the root of the source tree.
 */

// LoopbackTest establish a one way loopback call between 2 peer connections
// while continuously monitoring bandwidth stats. The idea is to use this as
// a base for other future tests and to keep track of more than just bandwidth
// stats.
//
// Usage:
//  var test = new LoopbackTest(stream, callDurationMs,
//                              forceTurn, pcConstraints,
//                              maxVideoBitrateKbps);
//  test.run(onDone);
//  function onDone() {
//    test.getResults(); // return stats recorded during the loopback test.
//  }
//
function LoopbackTest(
    stream,
    callDurationMs,
    forceTurn,
    pcConstraints,
    maxVideoBitrateKbps) {

  var pc1StatTracker;
  var pc2StatTracker;

  // In order to study effect of network (e.g. wifi) on peer connection one can
  // establish a loopback call and force it to go via a turn server. This way
  // the call won't switch to local addresses. That is achieved by filtering out
  // all non-relay ice candidades on both peers.
  function constrainTurnCandidates(pc) {
    var origAddIceCandidate = pc.addIceCandidate;
    pc.addIceCandidate = function (candidate, successCallback,
                                   failureCallback) {
      if (forceTurn && candidate.candidate.indexOf("typ relay ") == -1) {
        trace("Dropping non-turn candidate: " + candidate.candidate);
        successCallback();
        return;
      } else {
        origAddIceCandidate.call(this, candidate, successCallback,
                                 failureCallback);
      }
    }
  }

  // FEC makes it hard to study bwe estimation since there seems to be a spike
  // when it is enabled and disabled. Disable it for now. FEC issue tracked on:
  // https://code.google.com/p/webrtc/issues/detail?id=3050
  function constrainOfferToRemoveFec(pc) {
    var origCreateOffer = pc.createOffer;
    pc.createOffer = function (successCallback, failureCallback, options) {
      function filteredSuccessCallback(desc) {
        desc.sdp = desc.sdp.replace(/(m=video 1 [^\r]+)(116 117)(\r\n)/g,
                                    '$1\r\n');
        desc.sdp = desc.sdp.replace(/a=rtpmap:116 red\/90000\r\n/g, '');
        desc.sdp = desc.sdp.replace(/a=rtpmap:117 ulpfec\/90000\r\n/g, '');
        successCallback(desc);
      }
      origCreateOffer.call(this, filteredSuccessCallback, failureCallback,
                           options);
    }
  }

  // Constraint max video bitrate by modifying the SDP when creating an answer.
  function constrainBitrateAnswer(pc) {
    var origCreateAnswer = pc.createAnswer;
    pc.createAnswer = function (successCallback, failureCallback, options) {
      function filteredSuccessCallback(desc) {
        if (maxVideoBitrateKbps) {
          desc.sdp = desc.sdp.replace(
              /a=mid:video\r\n/g,
              'a=mid:video\r\nb=AS:' + maxVideoBitrateKbps + '\r\n');
        }
        successCallback(desc);
      }
      origCreateAnswer.call(this, filteredSuccessCallback, failureCallback,
                            options);
    }
  }

  // Run the actual LoopbackTest.
  this.run = function(doneCallback) {
    if (forceTurn) requestTurn(start, fail);
    else start();

    function start(turnServer) {
      var pcConfig = forceTurn ? { iceServers: [turnServer] } : null;
      console.log(pcConfig);
      var pc1 = new RTCPeerConnection(pcConfig, pcConstraints);
      constrainTurnCandidates(pc1);
      constrainOfferToRemoveFec(pc1);
      pc1StatTracker = new StatisticsReport();
      pc1StatTracker.collectStatsFromPeerConnection(pc1);
      // pc1StatTracker = new StatTracker(pc1, 50);
      // pc1StatTracker.recordStat("EstimatedSendBitrate",
      //                           "bweforvideo", "googAvailableSendBandwidth");
      // pc1StatTracker.recordStat("TransmitBitrate",
      //                           "bweforvideo", "googTransmitBitrate");
      // pc1StatTracker.recordStat("TargetEncodeBitrate",
      //                           "bweforvideo", "googTargetEncBitrate");
      // pc1StatTracker.recordStat("ActualEncodedBitrate",
      //                           "bweforvideo", "googActualEncBitrate");

      var pc2 = new RTCPeerConnection(pcConfig, pcConstraints);
      constrainTurnCandidates(pc2);
      constrainBitrateAnswer(pc2);
      // pc2StatTracker = new StatTracker(pc2, 50);
      // pc2StatTracker.recordStat("REMB",
      //                           "bweforvideo", "googAvailableReceiveBandwidth");

      pc1.addStream(stream);
      var call = new Call(pc1, pc2);

      call.start();
      setTimeout(function () {
          call.stop();
          pc1StatTracker.stop();
          // pc2StatTracker.stop();
          success();
        }, callDurationMs);
    }

    function success() {
      trace("Success");
      doneCallback();
    }

    function fail(msg) {
      trace("Fail: " + msg);
      doneCallback();
    }
  }

  // Returns a google visualization datatable with the recorded samples during
  // the loopback test.
  this.getResults = function () {
    return pc1StatTracker.getStats();
  }

  // Helper class to establish and manage a call between 2 peer connections.
  // Usage:
  //   var c = new Call(pc1, pc2);
  //   c.start();
  //   c.stop();
  //
  function Call(pc1, pc2) {
    pc1.onicecandidate = applyIceCandidate.bind(pc2);
    pc2.onicecandidate = applyIceCandidate.bind(pc1);

    function applyIceCandidate(e) {
      if (e.candidate) {
        this.addIceCandidate(new RTCIceCandidate(e.candidate),
                             onAddIceCandidateSuccess,
                             onAddIceCandidateError);
      }
    }

    function onAddIceCandidateSuccess() {}
    function onAddIceCandidateError(error) {
      trace("Failed to add Ice Candidate: " + error.toString());
    }

    this.start = function() {
      pc1.createOffer(gotDescription1, onCreateSessionDescriptionError);

      function onCreateSessionDescriptionError(error) {
        trace('Failed to create session description: ' + error.toString());
      }

      function gotDescription1(desc){
        trace("Offer: " + desc.sdp);
        pc1.setLocalDescription(desc);
        pc2.setRemoteDescription(desc);
        // Since the "remote" side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        pc2.createAnswer(gotDescription2, onCreateSessionDescriptionError);
      }

      function gotDescription2(desc){
        trace("Answer: " + desc.sdp);
        pc2.setLocalDescription(desc);
        pc1.setRemoteDescription(desc);
      }
    }

    this.stop = function() {
      pc1.close();
      pc2.close();
    }
  }

  // Request a turn server. This uses the same servers as apprtc.
  function requestTurn(successCallback, failureCallback) {
    var currentDomain = document.domain;
    if (currentDomain.search('localhost') === -1 &&
        currentDomain.search('webrtc.googlecode.com') === -1) {
      failureCallback("Domain not authorized for turn server: " +
                      currentDomain);
      return;
    }

    // Get a turn server from computeengineondemand.appspot.com.
    var turnUrl = 'https://computeengineondemand.appspot.com/' +
                  'turn?username=156547625762562&key=4080218913';
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = onTurnResult;
    xmlhttp.open('GET', turnUrl, true);
    xmlhttp.send();

    function onTurnResult() {
      if (this.readyState !== 4) {
        return;
      }

      if (this.status === 200) {
        var turnServer = JSON.parse(xmlhttp.responseText);
        // Create turnUris using the polyfill (adapter.js).
        turnServer.uris = turnServer.uris.filter(
            function (e) { return e.search('transport=udp') != -1; }
        );
        var iceServers = createIceServers(turnServer.uris,
                                          turnServer.username,
                                          turnServer.password);
        if (iceServers !== null) {
          successCallback(iceServers);
          return;
        }
      }
      failureCallback("Failed to get a turn server.");
    }
  }
}
