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


WebRTCTest()

.testsuite('PeerConnection')

// Parse a "candidate:" line into a JSON object.
.helper("parseCandidate", function(t, text) {
  var candidateStr = "candidate:";
  var pos = text.indexOf(candidateStr) + candidateStr.length;
  var fields = text.substr(pos).split(" ");
  return {
    "type": fields[7],
    "protocol": fields[2],
    "address": fields[4],
  };
})

// Filter the RTCConfiguration |config| to only contain URLs with the
// specified transport protocol |protocol|.
.helper("filterConfig", function(t, config, protocol) {
  var transport = "transport=" + protocol;
  for (var i = 0; i < config.iceServers.length; ++i) {
    var iceServer = config.iceServers[i];
    var newUrls = [];
    for (var j = 0; j < iceServer.urls.length; ++j) {
      if (iceServer.urls[j].indexOf(transport) !== -1) {
        newUrls.push(iceServer.urls[j]);
      }
    }
    iceServer.urls = newUrls;
  }
})

.helper("filterRelay",function(t, c){
  return c.type === "relay";
})

.helper("filterIpv6",function(t, c){
  return (c.address.indexOf(':') !== -1);
})

.helper("gatherCandidates", function(t, config, params, isGood, callback) {
  var pc = new RTCPeerConnection(config, params);

  // In our candidate callback, stop if we get a candidate that passes |isGood|.
  pc.onicecandidate = function(e) {
    // Once we've decided, ignore future callbacks.
    if (pc.signalingState === "closed")
      return;

    if (e.candidate) {
      var parsed = t.parseCandidate(e.candidate.candidate);
      if (isGood(parsed)) {
        t.log("Gathered candidate with type: " + parsed.type +
                      " address: " + parsed.address);
        pc.close();
      }
      callback();
    } else {
      pc.close();
      t.fail("Failed to gather specified candidates");
    }

  // Create an audio-only, recvonly offer, and setLD with it.
  // This will trigger candidate gathering.

  var noop = function(){};
  var createOfferParams = { mandatory: { OfferToReceiveAudio: true } };
  pc.createOffer(function(offer) { pc.setLocalDescription(offer, noop, noop); },
                 noop, createOfferParams);
})

.helper("createTurnConfig", function(t, customCallbacks) {
  var xhr = new XMLHttpRequest();

  var defaultCallbacks = {
    success:function(config){
      t.log("Turn config complete", config)
    },
    error:function(message){
      t.fail(message)
    }
  }

  // Override with custom callbacks.
  var callbacks = t.extend( defaultCallbacks , customCallbacks );

  xhr.onreadystatechange = function onResult() {
    if (xhr.readyState != 4)
      return;

    if (xhr.status != 200) {
      callbacks.error("TURN request failed");
      return;
    }

    var response = JSON.parse(xhr.responseText);
    var iceServer = {
      'username': response.username,
      'credential': response.password,
      'urls': response.uris
    };

    callbacks.success({ "iceServers": [ iceServer ] })

  };

  xhr.open('GET', CEOD_URL, true);
  xhr.send();
})

// THE TESTS


// Get a TURN config, and try to get a relay candidate using UDP.
.test('UdpTest')

  .promises("UdpConfig")
  .does(function(t) {
    t.createTurnConfig({
      success:function( config ) { t.fulfill( "UdpConfig", config); },
      error:function( message ) { t.fail( message ); }
    });
  })

  .expects("UdpConfig")
  .promises("GatherUdp")
  .does(function(t, config){
    t.filterConfig(config, "udp");
    t.gatherCandidates(config, null, t.filterRelay,function(){
      t.fulfill("GatherUdp")
    });
  })

  .expects("GatherUdp")

.ends()


// Get a TURN config, and try to get a relay candidate using TCP.
.test('TcpTest')

  .promises("TcpConfig")
  .does(function(t) {
    t.createTurnConfig({
      success:function( config ) { t.fulfill( "TcpConfig", config); },
      error:function( message ) { t.fail( message ); }
    });
  })

  .promises("GatherTcp")
  .expects("TcpConfig")
  .does(function(t, config){
    t.filterConfig(config, "tcp");
      t.gatherCandidates(config, null, t.filterRelay, function(){
      t.fulfill("GatherTcp");
    });
  })

  .expects("GatherTcp")

.ends()


// Test IPv6
.test('IPv6Test')

  .promises("GatherIPv6")
  .does(function(t){
    var params = { optional: [ { googIPv6: true } ] };
    t.gatherCandidates(null, params, t.filterIpv6, function(){
      t.fulfill("GatherIPv6");
    });
  })

  .expects("GatherIPv6")

.ends()
