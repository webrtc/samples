/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, mergeConstraints, parseJSON, iceCandidateType,
   maybePreferAudioReceiveCodec, maybePreferVideoReceiveCodec,
   maybePreferAudioSendCodec, maybePreferVideoSendCodec,
   maybeSetAudioSendBitRate, maybeSetVideoSendBitRate,
   maybeSetAudioReceiveBitRate, maybeSetVideoSendInitialBitRate,
   maybeSetVideoReceiveBitRate, maybeSetVideoSendInitialBitRate,
   maybeSetOpusOptions */

/* exported PeerConnectionClient */

'use strict';

var PeerConnectionClient = function(params, startTime) {
  this.params_ = params;
  this.startTime_ = startTime;

  trace('Creating RTCPeerConnnection with:\n' +
    '  config: \'' + JSON.stringify(params.peerConnectionConfig) + '\';\n' +
    '  constraints: \'' + JSON.stringify(params.peerConnectionConstraints) +
    '\'.');

  // Create an RTCPeerConnection via the polyfill (adapter.js).
  this.pc_ = new RTCPeerConnection(
      params.peerConnectionConfig, params.peerConnectionConstraints);
  this.pc_.onicecandidate = this.onIceCandidate_.bind(this);
  this.pc_.onaddstream = this.onRemoteStreamAdded_.bind(this);
  this.pc_.onremovestream = trace.bind(null, 'Remote stream removed.');
  this.pc_.onsignalingstatechange = this.onSignalingStateChanged_.bind(this);
  this.pc_.oniceconnectionstatechange =
      this.onIceConnectionStateChanged_.bind(this);

  this.hasRemoteSdp_ = false;
  this.messageQueue_ = [];
  this.isInitiator_ = false;
  this.started_ = false;

  // TODO(jiayl): Replace callbacks with events.
  // Public callbacks. Keep it sorted.
  this.onerror = null;
  this.oniceconnectionstatechange = null;
  this.onnewicecandidate = null;
  this.onremotehangup = null;
  this.onremotesdpset = null;
  this.onremotestreamadded = null;
  this.onsignalingmessage = null;
  this.onsignalingstatechange = null;
};

// Set up audio and video regardless of what devices are present.
// Disable comfort noise for maximum audio quality.
PeerConnectionClient.DEFAULT_SDP_CONSTRAINTS_ = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  },
  'optional': [{
    'VoiceActivityDetection': false
  }]
};

PeerConnectionClient.prototype.addStream = function(stream) {
  if (!this.pc_) {
    return;
  }
  this.pc_.addStream(stream);
};

PeerConnectionClient.prototype.startAsCaller = function(offerConstraints) {
  if (!this.pc_) {
    return false;
  }

  if (this.started_) {
    return false;
  }

  this.isInitiator_ = true;
  this.started_ = true;
  var constraints = mergeConstraints(
      offerConstraints, PeerConnectionClient.DEFAULT_SDP_CONSTRAINTS_);
  trace('Sending offer to peer, with constraints: \n\'' +
      JSON.stringify(constraints) + '\'.');
  this.pc_.createOffer(this.setLocalSdpAndNotify_.bind(this),
      this.onError_.bind(this, 'createOffer'),
      constraints);

  return true;
};

PeerConnectionClient.prototype.startAsCallee = function(initialMessages) {
  if (!this.pc_) {
    return false;
  }

  if (this.started_) {
    return false;
  }

  this.isInitiator_ = false;
  this.started_ = true;

  if (initialMessages && initialMessages.length > 0) {
    // Convert received messages to JSON objects and add them to the message
    // queue.
    for (var i = 0, len = initialMessages.length; i < len; i++) {
      this.receiveSignalingMessage(initialMessages[i]);
    }
    return true;
  }

  // We may have queued messages received from the signaling channel before
  // started.
  if (this.messageQueue_.length > 0) {
    this.drainMessageQueue_();
  }
  return true;
};

PeerConnectionClient.prototype.receiveSignalingMessage = function(message) {
  var messageObj = parseJSON(message);
  if (!messageObj) {
    return;
  }
  if ((this.isInitiator_ && messageObj.type === 'answer') ||
      (!this.isInitiator_ && messageObj.type === 'offer')) {
    this.hasRemoteSdp_ = true;
    // Always process offer before candidates.
    this.messageQueue_.unshift(messageObj);
  } else if (messageObj.type === 'candidate') {
    this.messageQueue_.push(messageObj);
  } else if (messageObj.type === 'bye') {
    if (this.onremotehangup) {
      this.onremotehangup();
    }
  }
  this.drainMessageQueue_();
};

PeerConnectionClient.prototype.close = function() {
  if (!this.pc_) {
    return;
  }
  this.pc_.close();
  this.pc_ = null;
};

PeerConnectionClient.prototype.getPeerConnectionStates = function() {
  if (!this.pc_) {
    return null;
  }
  return {
    'signalingState': this.pc_.signalingState,
    'iceGatheringState': this.pc_.iceGatheringState,
    'iceConnectionState': this.pc_.iceConnectionState
  };
};

PeerConnectionClient.prototype.getPeerConnectionStats = function(callback) {
  if (!this.pc_) {
    return;
  }
  this.pc_.getStats(callback);
};

PeerConnectionClient.prototype.doAnswer_ = function() {
  trace('Sending answer to peer.');
  this.pc_.createAnswer(this.setLocalSdpAndNotify_.bind(this),
      this.onError_.bind(this, 'createAnswer'),
      PeerConnectionClient.DEFAULT_SDP_CONSTRAINTS_);
};

PeerConnectionClient.prototype.setLocalSdpAndNotify_ =
    function(sessionDescription) {
  sessionDescription.sdp = maybePreferAudioReceiveCodec(
    sessionDescription.sdp,
    this.params_);
  sessionDescription.sdp = maybePreferVideoReceiveCodec(
    sessionDescription.sdp,
    this.params_);
  sessionDescription.sdp = maybeSetAudioReceiveBitRate(
    sessionDescription.sdp,
    this.params_);
  sessionDescription.sdp = maybeSetVideoReceiveBitRate(
    sessionDescription.sdp,
    this.params_);
  this.pc_.setLocalDescription(sessionDescription,
      trace.bind(null, 'Set session description success.'),
      this.onError_.bind(this, 'setLocalDescription'));

  if (this.onsignalingmessage) {
    this.onsignalingmessage(sessionDescription);
  }
};

PeerConnectionClient.prototype.setRemoteSdp_ = function(message) {
  message.sdp = maybeSetOpusOptions(message.sdp, this.params_);
  message.sdp = maybePreferAudioSendCodec(message.sdp, this.params_);
  message.sdp = maybePreferVideoSendCodec(message.sdp, this.params_);
  message.sdp = maybeSetAudioSendBitRate(message.sdp, this.params_);
  message.sdp = maybeSetVideoSendBitRate(message.sdp, this.params_);
  message.sdp = maybeSetVideoSendInitialBitRate(message.sdp, this.params_);
  this.pc_.setRemoteDescription(new RTCSessionDescription(message),
      this.onSetRemoteDescriptionSuccess_.bind(this),
      this.onError_.bind(this, 'setRemoteDescription'));
};

PeerConnectionClient.prototype.onSetRemoteDescriptionSuccess_ = function() {
  trace('Set remote session description success.');
  // By now all onaddstream events for the setRemoteDescription have fired,
  // so we can know if the peer has any remote video streams that we need
  // to wait for. Otherwise, transition immediately to the active state.
  var remoteStreams = this.pc_.getRemoteStreams();
  if (this.onremotesdpset) {
    this.onremotesdpset(remoteStreams.length > 0 &&
                        remoteStreams[0].getVideoTracks().length > 0);
  }
};

PeerConnectionClient.prototype.processSignalingMessage_ = function(message) {
  if (message.type === 'offer' && !this.isInitiator_) {
    if (this.pc_.signalingState !== 'stable') {
      trace('ERROR: remote offer received in unexpected state: ' +
            this.pc_.signalingState);
      return;
    }
    this.setRemoteSdp_(message);
    this.doAnswer_();
  } else if (message.type === 'answer' && this.isInitiator_) {
    if (this.pc_.signalingState !== 'have-local-offer') {
      trace('ERROR: remote answer received in unexpected state: ' +
            this.pc_.signalingState);
      return;
    }
    this.setRemoteSdp_(message);
  } else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    this.recordIceCandidate_('Remote', candidate);
    this.pc_.addIceCandidate(candidate,
        trace.bind(null, 'Remote candidate added successfully.'),
        this.onError_.bind(this, 'addIceCandidate'));
  } else {
    trace('WARNING: unexpected message: ' + JSON.stringify(message));
  }
};

// When we receive messages from GAE registration and from the WSS connection,
// we add them to a queue and drain it if conditions are right.
PeerConnectionClient.prototype.drainMessageQueue_ = function() {
  // It's possible that we finish registering and receiving messages from WSS
  // before our peer connection is created or started. We need to wait for the
  // peer connection to be created and started before processing messages.
  //
  // Also, the order of messages is in general not the same as the POST order
  // from the other client because the POSTs are async and the server may handle
  // some requests faster than others. We need to process offer before
  // candidates so we wait for the offer to arrive first if we're answering.
  // Offers are added to the front of the queue.
  if (!this.pc_ || !this.started_ || !this.hasRemoteSdp_) {
    return;
  }
  for (var i = 0, len = this.messageQueue_.length; i < len; i++) {
    this.processSignalingMessage_(this.messageQueue_[i]);
  }
  this.messageQueue_ = [];
};

PeerConnectionClient.prototype.onIceCandidate_ = function(event) {
  if (event.candidate) {
    // Eat undesired candidates.
    if (this.filterIceCandidate_(event.candidate)) {
      var message = {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      };
      if (this.onsignalingmessage) {
        this.onsignalingmessage(message);
      }
      this.recordIceCandidate_('Local', event.candidate);
    }
  } else {
    trace('End of candidates.');
  }
};

PeerConnectionClient.prototype.onSignalingStateChanged_ = function() {
  if (!this.pc_) {
    return;
  }
  trace('Signaling state changed to: ' + this.pc_.signalingState);

  if (this.onsignalingstatechange) {
    this.onsignalingstatechange();
  }
};

PeerConnectionClient.prototype.onIceConnectionStateChanged_ = function() {
  if (!this.pc_) {
    return;
  }
  trace('ICE connection state changed to: ' + this.pc_.iceConnectionState);
  if (this.pc_.iceConnectionState === 'completed') {
    trace('ICE complete time: ' +
        (window.performance.now() - this.startTime_).toFixed(0) + 'ms.');
  }

  if (this.oniceconnectionstatechange) {
    this.oniceconnectionstatechange();
  }
};

// Return false if the candidate should be dropped, true if not.
PeerConnectionClient.prototype.filterIceCandidate_ = function(candidateObj) {
  var candidateStr = candidateObj.candidate;

  // Always eat TCP candidates. Not needed in this context.
  if (candidateStr.indexOf('tcp') !== -1) {
    return false;
  }

  // If we're trying to eat non-relay candidates, do that.
  if (this.params_.peerConnectionConfig.iceTransports === 'relay' &&
      iceCandidateType(candidateStr) !== 'relay') {
    return false;
  }

  return true;
};

PeerConnectionClient.prototype.recordIceCandidate_ =
    function(location, candidateObj) {
  if (this.onnewicecandidate) {
    this.onnewicecandidate(location, candidateObj.candidate);
  }
};

PeerConnectionClient.prototype.onRemoteStreamAdded_ = function(event) {
  if (this.onremotestreamadded) {
    this.onremotestreamadded(event.stream);
  }
};

PeerConnectionClient.prototype.onError_ = function(tag, error) {
  if (this.onerror) {
    this.onerror(tag + ': ' + error.toString());
  }
};
