/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

function Call(config) {
  this.traceEvent = report.traceEventAsync('call');
  this.traceEvent({ config: config });

  this.pc1 = new RTCPeerConnection(config);
  this.pc2 = new RTCPeerConnection(config);

  this.pc1.addEventListener('icecandidate', this.onIceCandidate_.bind(this, this.pc2));
  this.pc2.addEventListener('icecandidate', this.onIceCandidate_.bind(this, this.pc1));

  this.iceCandidateFilter_ = Call.noFilter;
}

Call.prototype = {
  establishConnection: function () {
    this.traceEvent({ state: 'start' });
    this.pc1.createOffer(this.gotOffer_.bind(this));
  },

  close: function () {
    this.traceEvent({ state: 'end' });
    this.pc1.close();
    this.pc2.close();
  },

  setIceCandidateFilter: function (filter) {
    this.iceCandidateFilter_ = filter;
  },

  // Constraint max video bitrate by modifying the SDP when creating an answer.
  constrainVideoBitrate: function (maxVideoBitrateKbps) {
    this.constrainVideoBitrateKbps_ = maxVideoBitrateKbps;
  },

  // Remove video FEC if available on the offer.
  disableVideoFec: function () {
    this.constrainOfferToRemoveVideoFec_ = true;
  },

  // When the peerConnection is closed the callback is called once returning
  // with an array of gathered stats.
  gatherStats: function(peerConnection, callback, interval) {
    var stats = [];
    getStats_();

    function getStats_() {
      if (peerConnection.signalingState === 'closed') {
        callback(stats);
        return;
      }
      setTimeout(function() {
        peerConnection.getStats(gotStats_.bind(this));
      }, interval);
    }

    function gotStats_(response) {
      for (var index in response.result()) {
        stats.push(response.result()[index]);
      }
      getStats_();
    }
  },

  gotOffer_: function (offer) {
    if (this.constrainOfferToRemoveVideoFec_) {
      offer.sdp = offer.sdp.replace(/(m=video 1 [^\r]+)(116 117)(\r\n)/g,
                                    '$1\r\n');
      offer.sdp = offer.sdp.replace(/a=rtpmap:116 red\/90000\r\n/g, '');
      offer.sdp = offer.sdp.replace(/a=rtpmap:117 ulpfec\/90000\r\n/g, '');
    }
    this.pc1.setLocalDescription(offer);
    this.pc2.setRemoteDescription(offer);
    this.pc2.createAnswer(this.gotAnswer_.bind(this));
  },

  gotAnswer_: function (answer) {
    if (this.constrainVideoBitrateKbps_) {
      answer.sdp = answer.sdp.replace(
          /a=mid:video\r\n/g,
          'a=mid:video\r\nb=AS:' + this.constrainVideoBitrateKbps_ + '\r\n');
    }
    this.pc2.setLocalDescription(answer);
    this.pc1.setRemoteDescription(answer);
  },

  onIceCandidate_: function (otherPeer) {
    if (event.candidate) {
      var parsed = Call.parseCandidate(event.candidate.candidate);
      if (this.iceCandidateFilter_(parsed)) {
        otherPeer.addIceCandidate(event.candidate);
      }
    }
  }
};

Call.noFilter = function () {
  return true;
};

Call.isRelay = function (candidate) {
  return candidate.type === 'relay';
};

Call.isIpv6 = function (candidate) {
  return candidate.address.indexOf(':') !== -1;
};

// Parse a 'candidate:' line into a JSON object.
Call.parseCandidate = function (text) {
  var candidateStr = 'candidate:';
  var pos = text.indexOf(candidateStr) + candidateStr.length;
  var fields = text.substr(pos).split(' ');
  return {
    'type': fields[7],
    'protocol': fields[2],
    'address': fields[4],
  };
};

// Ask computeengineondemand to give us TURN server credentials and URIs.
Call.CEOD_URL = 'https://computeengineondemand.appspot.com/turn?username=1234&key=5678';
Call.asyncCreateTurnConfig = function (onSuccess, onError) {
  var xhr = new XMLHttpRequest();
  function onResult() {
    if (xhr.readyState !== 4) {
      return;
    }

    if (xhr.status !== 200) {
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
  xhr.open('GET', Call.CEOD_URL, true);
  xhr.send();
};
