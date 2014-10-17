/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

var apprtc = apprtc || {};

(function() {

var Log = apprtc.Log;
//var WSS_POST_URL = "https://apprtc-ws.webrtc.org:8089/";
//var WSS_URL = "wss://apprtc-ws.webrtc.org:8089/ws";
var WSS_POST_URL = "http://localhost:8089/";
var WSS_URL = "ws://localhost:8089/ws";

/*
 * Channel over which signaling data is sent. Creates a websocket for
 * communication with web socket server. Capable of sending POST data to both
 * web socket server and app engine instance as required.
 */
var SignalingChannel = apprtc.SignalingChannel = function(
    roomId, clientId, onSignalingMessage) {
  this.roomId = roomId;
  this.clientId = clientId;
  this.onSignalingMessage = onSignalingMessage;
  this.socket = new WebSocket(WSS_URL);
  this.socket.onopen = this.onSocketOpen.bind(this);
  this.socket.onmessage = this.onSocketMessage.bind(this);
  this.socket.onerror = this.onSocketError.bind(this);
  this.socket.onclose = this.onSocketClose.bind(this);

  // Used to store messages before web socket is open.
  this.pendingMessages = [];
};

// Cleanup.
SignalingChannel.prototype.shutdown = function() {
  this.socket.close();
  this.socket = null;
};

// Registers with WSS. Required before sending.
SignalingChannel.prototype.register = function() {
  if (this.socket.readyState != WebSocket.OPEN) {
    return;
  }
  Log.info('Registering on WSS.');
  var registerMessage = {
    cmd: 'register',
    roomID: this.roomId,
    clientID: this.clientId
  };
  this.socket.send(JSON.stringify(registerMessage));
};

// Sends message object over web socket connection.
SignalingChannel.prototype.sendMessage = function(message) {
  var msgString = JSON.stringify({
    cmd: 'send',
    msg: JSON.stringify(message)
  });
  if (this.socket.readyState != WebSocket.OPEN) {
    Log.info('Pushing message onto queue: ' + message);
    this.pendingMessages.push(msgString);
    return;
  }
  Log.info('WSS C->S: ' + msgString);
  this.socket.send(msgString);
};

// Posts message object to web socket server.
SignalingChannel.prototype.postMessage = function(message) {
  var msgString = JSON.stringify(message);
  Log.info('WSS POST C->S: ' + msgString);
  var path = WSS_POST_URL + this.roomId + "/" + this.clientId;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  // WSS looks as POST data.
  xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
  xhr.send("msg=" + msgString);
};

// Posts messages object to app engine instance.
SignalingChannel.prototype.postAppEngineMessage = function(message) {
  var msgString = JSON.stringify(message);
  Log.info('GAE POST C->S: ' + msgString);
  var path = '/wssmessage?r=' + this.roomId + '&u=' + this.clientId;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  // GAE looks at body.
  xhr.send(msgString);
};

//
// WebSocket event handlers.
//

SignalingChannel.prototype.onSocketOpen = function(event) {
  Log.info('WebSocket connection opened.');
  this.register();
  // Send any pending messages.
  while (this.pendingMessages.length > 0) {
    var message = this.pendingMessages.shift();
    Log.info('WSS C->S: ' + message);
    this.socket.send(message);
  }
};

SignalingChannel.prototype.onSocketMessage = function(event) {
  var wssMessage = JSON.parse(event.data);
  if (wssMessage.error.length > 0) {
    Log.error('WSS error: ' + wssMessage.error);
    return;
  }
  this.onSignalingMessage(JSON.parse(wssMessage.msg));
};

SignalingChannel.prototype.onSocketError = function(event) {
  var errorMessage = "WebSocket connection error.";
  Log.error(errorMessage);
};

SignalingChannel.prototype.onSocketClose = function(event) {
  Log.info('WebSocket connection closed.');
};

/*
 * Handles the signaling messages required to establish a webrtc connection. 
 */
var SignalingManager = apprtc.SignalingManager = function(config) {
  this.config = config;
  this.isInitiator = this.config.messages.length == 0;
  this.peerConnection = null;
  this.channel = new SignalingChannel(
      this.config.roomId,
      this.config.clientId,
      this.onSignalingMessage.bind(this));
  // Used to store pending messages received before peer connection is created.
  this.pendingMessages = [];
};

// Cleanup.
SignalingManager.prototype.shutdown = function() {
  this.channel.postAppEngineMessage({
    type: 'bye'
  });
  if (this.peerConnection) {
    this.peerConnection.close();
    this.peerConnection = null;
  }
  this.channel.shutdown();
  this.channel = null;
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
SignalingManager.ICE_CANDIDATE_TOPIC = "ICE_CANDIDATE";
SignalingManager.REMOTE_STREAM_TOPIC = "REMOTE_STREAM";
SignalingManager.SIGNALING_STATE_TOPIC = "SIGNALING_STATE";
SignalingManager.ICE_STATE_TOPIC = "ICE_STATE";
SignalingManager.REMOTE_VIDEO_NONE_TOPIC = "REMOTE_VIDEO_NONE";
SignalingManager.REMOTE_VIDEO_PENDING_TOPIC = "REMOTE_VIDEO_PENDING";
SignalingManager.REMOTE_HANGUP_TOPIC = "REMOTE_HANGUP";

SignalingManager.prototype.start = function(localStream) {
//  this.startTime = window.performance.now();
  this.setupPeerConnection(localStream);
  if (this.isInitiator) {
    this.sendOffer();
  } else {
    var messages = this.config.messages;
    // Should only contain offer SDP.
    for (var i = 0, len = messages.length; i < len; i++) {
      this.onSignalingMessage(JSON.parse(messages[i]));
    }
    this.config.messages = [];
  }

  // Clear out any pending signals now that we have a peer connection. Do this
  // after we've had a chance to process offer SDP.
  for (var i = 0, len = this.pendingMessages.length; i < len; i++) {
    this.onSignalingMessage(this.pendingMessages[i]);
  }
  this.pendingMessages = [];
};

SignalingManager.prototype.setupPeerConnection = function(localStream) {
  if (this.peerConnection != null) {
    Log.error("PeerConnection already exists!");
    return;
  }
  var peerConnection = null;
  try {
    // Create an RTCPeerConnection via the polyfill (adapter.js).
    peerConnection = new RTCPeerConnection(
        this.config.peerConnectionConfig,
        this.config.peerConnectionConstraints);
  } catch (e) {
    Log.error('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object; ' +
          'WebRTC is not supported by this browser.');
    return;
  }
  if (localStream) {
    Log.info('Adding local stream.');
    peerConnection.addStream(localStream);
  } else {
    Log.info('Not sending any stream.');
  };
  peerConnection.onaddstream = this.onAddStream.bind(this);
  peerConnection.onremovestream = this.onRemoveStream.bind(this);
  peerConnection.onsignalingstatechange =
      this.onSignalingStateChange.bind(this);
  peerConnection.onicecandidate = this.onLocalIceCandidate.bind(this);
  peerConnection.oniceconnectionstatechange =
      this.onIceConnectionStateChange.bind(this);
  this.peerConnection = peerConnection;
};

SignalingManager.prototype.sendOffer = function() {
  var offerConstraints = apprtc.util.mergeConstraints(
      this.config.offerConstraints, SignalingManager.DEFAULT_CONSTRAINTS);
  Log.info('Sending offer to peer, with constraints: \n' +
      '  \'' + JSON.stringify(offerConstraints) + '\'.');
  this.peerConnection.createOffer(this.onLocalSessionDescription.bind(this),
      this.onSessionDescriptionError.bind(this), offerConstraints);
};

SignalingManager.prototype.sendAnswer = function() {
  Log.info('Sending answer to peer.');
  this.peerConnection.createAnswer(this.onLocalSessionDescription.bind(this),
      this.onSessionDescriptionError.bind(this),
      SignalingManager.DEFAULT_CONSTRAINTS);
};

//
// SignalingChannel event handler.
//

SignalingManager.prototype.onSignalingMessage = function(message) {
  if (!this.peerConnection) {
    Log.info('Received signal without peer connection');
    this.pendingMessages.push(message);
    return;
  }
  Log.info('S->C: ' + JSON.stringify(message));
  var type = message.type;
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
      apprtc.pubsub.publish(SignalingManager.REMOTE_HANGUP_TOPIC);
      break;
    default:
      Log.error('Unknown message type: ' + message);
  };
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

  // Offerer posts to app engine, answerer posts through wss.
  if (this.isInitiator) {
    this.channel.postAppEngineMessage(description);
  } else {
    this.channel.postMessage(description);
  }
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
//      trace('Waiting for remote video.');
//      waitForRemoteVideo();
    } else {
      // TODO(juberti): Make this wait for ICE connection before transitioning.
      apprtc.pubsub.publish(SignalingManager.REMOTE_VIDEO_NONE_TOPIC);
//      trace('No remote video stream; not waiting for media to arrive.');
//      transitionToActive();
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

// This isn't a PeerConnection handler, but it fits here.
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
//  attachMediaStream(this.remoteVideoElt, event.stream);
};

SignalingManager.prototype.onRemoveStream = function(event) {
  Log.info('Remote stream removed');
};

SignalingManager.prototype.onSignalingStateChange = function() {
  if (this.peerConnection) {
    var state = this.peerConnection.signalingState;
    apprtc.pubsub.publish(SignalingManager.SIGNALING_STATE_TOPIC, {
      state: state
    });
//    trace('Signaling state changed to: ' + state);
  }
//  logger.updateInfoDiv();
};

SignalingManager.prototype.onIceConnectionStateChange = function() {
  if (this.peerConnection) {
    var state = this.peerConnection.iceConnectionState;
    apprtc.pubsub.publish(SignalingManager.ICE_STATE_TOPIC, {
      state: state
    });
//    trace('ICE connection state changed to: ' + state);
  }
//  logger.updateInfoDiv();
};


})();
