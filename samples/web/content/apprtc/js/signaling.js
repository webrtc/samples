/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, quotmark: single, undef: true, unused: strict */
/* global goog, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate */

'use strict';

var apprtc = apprtc || {};

(function() {

var Log = apprtc.Log;

/*
 * Channel over which signaling messages are sent and received. Messages are
 * received via a GAE channel constructed with |token|, and sent by POST-ing
 * to a GAE handler.
 */
var SignalingChannel = apprtc.SignalingChannel = function(
    roomId, clientId, token, onChannelMessage, onChannelReady, onChannelClose) {
  this.roomId = roomId;
  this.clientId = clientId;
  this.onChannelMessage = onChannelMessage;
  this.onChannelReady = onChannelReady;
  this.onChannelClose = onChannelClose;

  var channel = new goog.appengine.Channel(token);
  this.socket = channel.open();
  this.socket.onopen = this.onSocketOpen.bind(this);
  this.socket.onmessage = this.onSocketMessage.bind(this);
  this.socket.onerror = this.onSocketError.bind(this);
  this.socket.onclose = this.onSocketClose.bind(this);
};

// Cleanup.
SignalingChannel.prototype.shutdown = function() {
  this.socket.close();
  this.socket = null;
};

// Sends message object to GAE.
SignalingChannel.prototype.sendMessage = function(message) {
  var msgString = JSON.stringify(message);
  Log.info('C->S: ' + msgString);
  var path = '/message?r=' + this.roomId + '&u=' + this.clientId;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.send(msgString);
};

//
// goog.appengine.Socket event handlers.
//

SignalingChannel.prototype.onSocketOpen = function() {
  Log.info('Channel opened.');
  if (this.onChannelReady) {
    this.onChannelReady();
  }
};

SignalingChannel.prototype.onSocketMessage = function(event) {
  Log.info('S->C: ' + event.data);
  if (this.onChannelMessage) {
    this.onChannelMessage(JSON.parse(event.data));
  }
};

SignalingChannel.prototype.onSocketError = function() {
  var errorMessage = 'Channel error.';
  Log.error(errorMessage);
};

SignalingChannel.prototype.onSocketClose = function() {
  Log.info('Channel closed.');
  if (this.onChannelClose) {
    this.onChannelClose();
  }
};

/*
 * Handles the signaling messages required to establish a webrtc connection. 
 */
var SignalingManager = apprtc.SignalingManager = function(config) {
  this.config = config;
  this.isInitiator = this.config.isInitiator;
  this.peerConnection = null;
  this.channel = null;
  // Used to store pending messages received before peer connection is created.
  this.pendingMessages = [];
  this.localStream = null;
  // We're ready to create peer connection when we have local stream, signaling
  // channel and turn server.
  this.readyForPeerConnection = false;

  var promises = [
    this.requestUserMedia(),
    this.requestSignalingChannel(),
    this.requestTurnServer()
  ];
  Promise.all(promises).then(
      (function(values) {
        this.localStream = values[0];
        this.channel = values[1];
        this.readyForPeerConnection = true;
        this.start();
      }).bind(this),
      function(error) {
        Log.error('Failed to start signaling: ' + error.toString());
      }
  );
};

// Cleanup.
SignalingManager.prototype.shutdown = function() {
  if (this.peerConnection) {
    this.peerConnection.close();
    this.peerConnection = null;
  }
  if (this.channel) {
    // Send a BYE on refreshing or leaving a page to ensure the room is cleaned
    // up for the next session.
    this.channel.sendMessage({
      type: 'bye'
    });
    this.channel.shutdown();
    this.channel = null;
  }
};

SignalingManager.DEFAULT_CONSTRAINTS = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  },
  'optional': [{
    'VoiceActivityDetection': false
  }]
};
SignalingManager.LOCAL_STREAM_TOPIC = 'SIGNALINGMANAGER_LOCAL_STREAM';
SignalingManager.ICE_CANDIDATE_TOPIC = 'SIGNALINGMANAGER_ICE_CANDIDATE';
SignalingManager.ICE_STATE_TOPIC = 'SIGNALINGMANAGER_ICE_STATE';
SignalingManager.REMOTE_HANGUP_TOPIC = 'SIGNALINGMANAGER_REMOTE_HANGUP';
SignalingManager.REMOTE_STREAM_TOPIC = 'SIGNALINGMANAGER_REMOTE_STREAM';
SignalingManager.REMOTE_VIDEO_NONE_TOPIC = 'SIGNALINGMANAGER_REMOTE_VIDEO_NONE';
SignalingManager.REMOTE_VIDEO_PENDING_TOPIC =
    'SIGNALINGMANAGER_REMOTE_VIDEO_PENDING';
SignalingManager.SIGNALING_STATE_TOPIC = 'SIGNALINGMANAGER_SIGNALING_STATE';

// Creates a peer connection and begins signaling.
SignalingManager.prototype.start = function() {
  if (!this.readyForPeerConnection) {
    return;
  }
  apprtc.perf.record(apprtc.perf.PEER_CONNECTION_SCENARIO);
  this.setupPeerConnection();
  if (this.isInitiator) {
    this.sendOffer();
  } else {
    this.drainPendingMessages();
  }
};

// Resets signaling by tearing down the existing peerConnection. However, keeps
// signaling channel open. Used when other client disconnects and we want to
// wait for another offer.
SignalingManager.prototype.reset = function() {
  if (!this.peerConnection) {
    Log.warn('Signaling not started.');
    return;
  }
  this.peerConnection.close();
  this.peerConnection = null;
  this.isInitiator = false;
  this.pendingMessages = [];
};

// Returns a Promise for requesting the local stream.
SignalingManager.prototype.requestUserMedia = function() {
  return apprtc.util.requestUserMedia(this.config.mediaConstraints).then(
      function(stream) {
        apprtc.pubsub.publish(SignalingManager.LOCAL_STREAM_TOPIC, {
          stream: stream
        });
        return stream;
      },
      function(error) {
        return error;
      }
  );
};

// Returns a Promise for creating an open signaling channel.
SignalingManager.prototype.requestSignalingChannel = function() {
  var roomId = this.config.roomId;
  var clientId = this.config.clientId;
  var channelToken = this.config.channelToken;
  var onChannelMessage = this.onChannelMessage.bind(this);

  return new Promise(function(resolve, reject) {
    var channel = null;
    var onChannelReady = function() {
      channel.onChannelReady = null;
      resolve(channel);
    };
    var onChannelClose = function() {
      channel.onChannelClose = null;
      reject(new Error('Channel error'));
    };
    channel = new SignalingChannel(roomId, clientId, channelToken,
        onChannelMessage, onChannelReady, onChannelClose);
  });
};

// Returns a Promise for requesting a TURN server as needed.
SignalingManager.prototype.requestTurnServer = function() {
  return apprtc.util.requestTurnServer(
      this.config.turnUrl, this.config.peerConnectionConfig);
};

// Creates a peer connection.
SignalingManager.prototype.setupPeerConnection = function() {
  if (this.peerConnection) {
    Log.error('PeerConnection already exists!');
    return;
  }
  var peerConnection = null;
  try {
    var config = this.config.peerConnectionConfig;
    var constraints = this.config.peerConnectionConstraints;
    // Create an RTCPeerConnection via the polyfill (adapter.js).
    peerConnection = new RTCPeerConnection(config, constraints);
    Log.info('Created RTCPeerConnnection with:\n' +
        '  config: \'' + JSON.stringify(config) + '\';\n' +
        '  constraints: \'' + JSON.stringify(constraints) + '\'.');
  } catch (e) {
    Log.error('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object; ' +
          'WebRTC is not supported by this browser.');
    return;
  }
  if (this.localStream) {
    Log.info('Adding local stream.');
    peerConnection.addStream(this.localStream);
  } else {
    Log.info('Not sending any stream.');
  }
  peerConnection.onaddstream = this.onAddStream.bind(this);
  peerConnection.onremovestream = this.onRemoveStream.bind(this);
  peerConnection.onsignalingstatechange =
      this.onSignalingStateChange.bind(this);
  peerConnection.onicecandidate = this.onLocalIceCandidate.bind(this);
  peerConnection.oniceconnectionstatechange =
      this.onIceConnectionStateChange.bind(this);
  this.peerConnection = peerConnection;
};

// Creates an offer SDP and sends it over signaling channel.
SignalingManager.prototype.sendOffer = function() {
  var offerConstraints = apprtc.util.mergeConstraints(
      this.config.offerConstraints, SignalingManager.DEFAULT_CONSTRAINTS);
  Log.info('Sending offer to peer, with constraints: \n' +
      '  \'' + JSON.stringify(offerConstraints) + '\'.');
  this.peerConnection.createOffer(this.onLocalSessionDescription.bind(this),
      this.onSessionDescriptionError.bind(this), offerConstraints);
};

// Creates an answer SDP and sends it over signaling channel.
SignalingManager.prototype.sendAnswer = function() {
  Log.info('Sending answer to peer.');
  this.peerConnection.createAnswer(this.onLocalSessionDescription.bind(this),
      this.onSessionDescriptionError.bind(this),
      SignalingManager.DEFAULT_CONSTRAINTS);
};

//
// Session description event handlers.
//

SignalingManager.prototype.onLocalSessionDescription = function(description) {
  apprtc.util.updateLocalDescription(description, this.config);

  // Set local session description and send it to other client.
  var onSetLocalDescriptionSuccess = function() {
    Log.info('Set local description success.');
  };

  var onSetLocalDescriptionError = function(error) {
    Log.error('Failed to set local description: ' + error.toString());
  };

  this.peerConnection.setLocalDescription(
      description, onSetLocalDescriptionSuccess, onSetLocalDescriptionError);
  this.channel.sendMessage(description);
};

SignalingManager.prototype.onRemoteSessionDescription = function(description) {
  apprtc.util.updateRemoteDescription(description, this.config);

  var peerConnection = this.peerConnection;
  var onSetRemoteDescriptionSuccess = function() {
    Log.info('Set remote session description success.');
    // By now all onaddstream events for the setRemoteDescription have fired,
    // so we can know if the peer has any remote video streams that we need
    // to wait for. Otherwise, transition immediately to the active state.
    // NOTE: Ideally we could just check |remoteStream| here, which is populated
    // in the onaddstream callback. But as indicated in
    // https://code.google.com/p/webrtc/issues/detail?id=3358, sometimes this
    // callback is dispatched after the setRemoteDescription success callback.
    // Therefore, we read the remoteStreams array directly from the
    // PeerConnection, which seems to work reliably.
    var remoteStreams = peerConnection.getRemoteStreams();
    if (remoteStreams.length > 0 &&
        remoteStreams[0].getVideoTracks().length > 0) {
      apprtc.pubsub.publish(SignalingManager.REMOTE_VIDEO_PENDING_TOPIC);
    } else {
      // TODO(juberti): Make this wait for ICE connection before transitioning.
      apprtc.pubsub.publish(SignalingManager.REMOTE_VIDEO_NONE_TOPIC);
    }
  };

  var onSetRemoteDescriptionError = function(error) {
    Log.error('Failed to set remote description: ' + error.toString());
  };

  this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description),
      onSetRemoteDescriptionSuccess, onSetRemoteDescriptionError);
};

SignalingManager.prototype.onSessionDescriptionError = function(error) {
  Log.error('Failed to create session description: ' + error);
};


//
// SignalingChannel event handler.
//

SignalingManager.prototype.onChannelMessage = function(message) {
  var type = message.type;
  // It's possible to receive messages before the peer connection is established
  // because the channel is created asynchronously while requesting a TURN
  // server and local user media. We should only get messages if we're not the
  // initiator.
  if (!this.isInitiator && !this.peerConnection) {
    if (type === 'offer') {
      // Add offer to the beginning of pending messages, since we can't handle
      // early candidates before offer at present.
      this.pendingMessages.unshift(message);
      // Give us an opportunity to restart after a disconnect.
      this.start();
    } else {
      this.pendingMessages.push(message);
    }
    return;
  }
  if (!this.peerConnection) {
    Log.error('Unexpected message. Peer connection has not been created yet.');
    return;
  }
  switch (type) {
    case 'offer':
      this.onRemoteSessionDescription(message);
      this.sendAnswer();
      break;
    case 'answer':
      this.onRemoteSessionDescription(message);
      break;
    case 'candidate':
      this.onRemoteIceCandidate(message);
      break;
    case 'bye':
      this.reset();
      apprtc.pubsub.publish(SignalingManager.REMOTE_HANGUP_TOPIC);
      break;
    default:
      Log.error('Unknown message type: ' + message);
  }
};

// Handles any pending signaling messages in the queue.
SignalingManager.prototype.drainPendingMessages = function() {
  // Bail if we don't have messages or a peer connection.
  if (this.pendingMessages.length === 0 || !this.peerConnection) {
    return;
  }
  // We only drain pending messages if it begins with an offer. GAE sometimes
  // disorders message delivery due to a datastore query and we need to
  // receive an offer before we can process candidates.
  var firstMessage = this.pendingMessages[0];
  if (firstMessage.type !== 'offer') {
    return;
  }
  for (var i = 0, len = this.pendingMessages.length; i < len; i++) {
    var message = this.pendingMessages[i];
    this.onChannelMessage(message);
  }
  this.pendingMessages = [];
};

//
// PeerConnection event handlers.
//

SignalingManager.prototype.onLocalIceCandidate = function(event) {
  if (event.candidate) {
    if (this.config.iceTransports === 'relay') {
      // Filter out non relay Candidates, if iceTransports is set to relay.
      if (event.candidate.candidate.search('relay') === -1) {
        return;
      }
    }
    this.channel.sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
    apprtc.pubsub.publish(SignalingManager.ICE_CANDIDATE_TOPIC, {
      type: apprtc.util.getIceCandidateType(event.candidate.candidate),
      local: true
    });
  } else {
    Log.info('End of candidates.');
  }
};

SignalingManager.prototype.onRemoteIceCandidate = function(message) {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: message.label,
    candidate: message.candidate
  });
  apprtc.pubsub.publish(SignalingManager.ICE_CANDIDATE_TOPIC, {
      type: apprtc.util.getIceCandidateType(message.candidate),
      local: false
  });

  var onAddIceCandidateSuccess = function() {
    Log.info('Remote candidate added successfully.');
  };

  var onAddIceCandidateError = function(error) {
    Log.error('Failed to add remote candidate: ' + error.toString());
  };

  this.peerConnection.addIceCandidate(candidate,
      onAddIceCandidateSuccess, onAddIceCandidateError);
};

SignalingManager.prototype.onAddStream = function(event) {
  Log.info('Remote stream added.');
  apprtc.pubsub.publish(SignalingManager.REMOTE_STREAM_TOPIC, {
    stream: event.stream
  });
};

SignalingManager.prototype.onRemoveStream = function() {
  Log.info('Remote stream removed');
};

SignalingManager.prototype.onSignalingStateChange = function() {
  if (this.peerConnection) {
    var state = this.peerConnection.signalingState;
    apprtc.pubsub.publish(SignalingManager.SIGNALING_STATE_TOPIC, {
      state: state
    });
  }
};

SignalingManager.prototype.onIceConnectionStateChange = function() {
  if (this.peerConnection) {
    var state = this.peerConnection.iceConnectionState;
    apprtc.pubsub.publish(SignalingManager.ICE_STATE_TOPIC, {
      state: state
    });
  }
};

})();
