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

// Tests whether
// 1) We can connect via UDP to a TURN server
// 2) We can connect via TCP to a TURN server
// 3) We have IPv6 enabled (TODO: test IPv6 to a destination)
addTestSuite('UdpConnectivityTest', udpConnectivityTest);
addTestSuite('TcpConnectivityTest', tcpConnectivityTest);
addTestSuite('HasIpv6Test', hasIpv6Test);

var CEOD_URL = ('https://computeengineondemand.appspot.com/turn?' +
                'username=1234&key=5678');

// Get a TURN config, and try to get a relay candidate using UDP.
function udpConnectivityTest() {
  asyncCreateTurnConfig(
      function(config) { 
        filterConfig(config, 'udp');
        gatherCandidates(config, null, checkRelay);
      },
      reportFatal);
}

// Get a TURN config, and try to get a relay candidate using TCP.
function tcpConnectivityTest() {
  asyncCreateTurnConfig(
      function(config) { 
        filterConfig(config, 'tcp');
        gatherCandidates(config, null, checkRelay);
      },
      reportFatal);
}

// Turn on IPv6, and try to get an IPv6 host candidate.
function hasIpv6Test() {
  var params = { optional: [ { googIPv6: true } ] };
  gatherCandidates(null, params, checkIpv6);                        
}

// Ask computeengineondemand to give us TURN server credentials and URIs.
function asyncCreateTurnConfig(onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  function onResult() {
    if (xhr.readyState != 4)
      return;

    if (xhr.status != 200) {
      onError('TURN request failed');
      return;
    }

    var response = JSON.parse(xhr.responseText); 
    var iceServer = { 
      'username': response.username,
      'credential': response.password,
      'urls': response.uris
    };
    onSuccess({ 'iceServers': [ iceServer ] });
  }

  xhr.onreadystatechange = onResult;
  xhr.open('GET', CEOD_URL, true);
  xhr.send();
}

// Filter the RTCConfiguration |config| to only contain URLs with the
// specified transport protocol |protocol|.
function filterConfig(config, protocol) {
  var transport = 'transport=' + protocol;
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
}

function checkRelay(c) {
  return c.type === 'relay';
}

function checkIpv6(c) {
  return (c.address.indexOf(':') !== -1);
}

// Create a PeerConnection, and gather candidates using RTCConfig |config|
// and ctor params |params|. Succeed if any candidates pass the |isGood| 
// check, fail if we complete gathering without any passing.
function gatherCandidates(opt_config, opt_params, isGood) {
  var pc = new RTCPeerConnection(opt_config, opt_params);

  // In our candidate callback, stop if we get a candidate that passes |isGood|.
  pc.onicecandidate = function(e) {
    // Once we've decided, ignore future callbacks.
    if (pc.signalingState === 'closed')
      return;

    if (e.candidate) {
      var parsed = parseCandidate(e.candidate.candidate);
      if (isGood(parsed)) {
        reportSuccess('Gathered candidate with type: ' + parsed.type +
                      ' address: ' + parsed.address);
        pc.close();
        testSuiteFinished();
      }
    } else {
      pc.close();
      reportFatal('Failed to gather specified candidates');
    }
  };

  // Create an audio-only, recvonly offer, and setLD with it.
  // This will trigger candidate gathering.
  var createOfferParams = { mandatory: { OfferToReceiveAudio: true } };
  pc.createOffer(function(offer) { pc.setLocalDescription(offer, noop, noop); },
                 noop, createOfferParams);
}

// Parse a 'candidate:' line into a JSON object.
function parseCandidate(text) {
  var candidateStr = 'candidate:';
  var pos = text.indexOf(candidateStr) + candidateStr.length;
  var fields = text.substr(pos).split(' ');
  return {
    'type': fields[7],
    'protocol': fields[2],
    'address': fields[4],
  };
}

function noop() {
}
