/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, requestTurnServers, sendAsyncUrlRequest,
   requestUserMedia, SignalingChannel, PeerConnectionClient, setupLoopback,
   parseJSON */

/* exported Call */

'use strict';

var Call = function(params) {
  this.params_ = params;
  this.roomServer_ = params.roomServer || '';

  this.channel_ = new SignalingChannel(params.wssUrl, params.wssPostUrl);
  this.channel_.onmessage = this.onRecvSignalingChannelMessage_.bind(this);

  this.pcClient_ = null;
  this.localStream_ = null;

  this.startTime = null;

  // Public callbacks. Keep it sorted.
  this.oncallerstarted = null;
  this.onerror = null;
  this.oniceconnectionstatechange = null;
  this.onlocalstreamadded = null;
  this.onnewicecandidate = null;
  this.onremotehangup = null;
  this.onremotesdpset = null;
  this.onremotestreamadded = null;
  this.onsignalingstatechange = null;
  this.onstatusmessage = null;
};

Call.prototype.isInitiator = function() {
  return this.params_.isInitiator;
};

Call.prototype.start = function(roomId) {
  this.connectToRoom_(roomId, this.maybeGetMedia_(), this.maybeGetTurnServers_());
  if (this.params_.isLoopback) {
    setupLoopback();
  }
};

Call.prototype.hangup = function() {
  this.startTime = null;

  if (this.localStream_) {
    this.localStream_.stop();
    this.localStream_ = null;
  }

  if (!this.params_.roomId) {
    return;
  }

  if (this.pcClient_) {
    this.pcClient_.close();
    this.pcClient_ = null;
  }

  // Send bye to GAE. This must complete before saying BYE to other client.
  // When the other client sees BYE it attempts to post offer and candidates to
  // GAE. GAE needs to know that we're disconnected at that point otherwise
  // it will forward messages to this client instead of storing them.
  var path = this.roomServer_ + '/bye/' + this.params_.roomId +
      '/' + this.params_.clientId;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, false);
  xhr.send();

  // Send bye to other client.
  this.channel_.send(JSON.stringify({ type: 'bye' }));
  this.channel_.close();

  this.params_.roomId = null;
  this.params_.clientId = null;
};

Call.prototype.onRemoteHangup = function() {
  this.startTime = null;

  // On remote hangup this client becomes the new initiator.
  this.params_.isInitiator = true;

  if (this.pcClient_) {
    this.pcClient_.close();
    this.pcClient_ = null;
  }

  this.startSignaling_();
};

Call.prototype.getPeerConnectionStates = function() {
  if (!this.pcClient_) {
    return null;
  }
  return this.pcClient_.getPeerConnectionStates();
};

Call.prototype.getPeerConnectionStats = function(callback) {
  if (!this.pcClient_) {
    return;
  }
  this.pcClient_.getPeerConnectionStats(callback);
};

Call.prototype.toggleVideoMute = function() {
  var videoTracks = this.localStream_.getVideoTracks();
  if (videoTracks.length === 0) {
    trace('No local video available.');
    return;
  }

  trace('Toggling video mute state.');
  for (var i = 0; i < videoTracks.length; ++i) {
    videoTracks[i].enabled = !videoTracks[i].enabled;
  }

  trace('Video ' + (videoTracks[0].enabled ? 'unmuted.' : 'muted.'));
};

Call.prototype.toggleAudioMute = function() {
  var audioTracks = this.localStream_.getAudioTracks();
  if (audioTracks.length === 0) {
    trace('No local audio available.');
    return;
  }

  trace('Toggling audio mute state.');
  for (var i = 0; i < audioTracks.length; ++i) {
    audioTracks[i].enabled = !audioTracks[i].enabled;
  }

  trace('Audio ' + (audioTracks[0].enabled ? 'unmuted.' : 'muted.'));
};

// Connects client to the room. This happens by simultaneously requesting
// media, requesting turn, and registering with GAE. Once all three of those
// tasks is complete, the signaling process begins. At the same time, a
// WebSocket connection is opened using |wss_url| followed by a subsequent
// registration once GAE registration completes.
Call.prototype.connectToRoom_ = function(mediaPromise, turnPromise) {
  // Asynchronously open a WebSocket connection to WSS.
  // TODO(jiayl): We don't need to wait for the signaling channel to open before
  // start signaling.
  var channelPromise = this.channel_.open().catch(function(error) {
    this.onError_('WebSocket open error: ' + error.message);
    return Promise.reject(error);
  }.bind(this));

  // Asynchronously register with GAE.
  var registerPromise =
      this.registerWithRoomServer_(this.params_.roomId).then(function(roomParams) {
        // The only difference in parameters should be clientId and isInitiator,
        // and the turn servers that we requested.
        // TODO(tkchin): clean up response format. JSHint doesn't like it.
        /* jshint ignore:start */
        this.params_.clientId = roomParams.client_id;
        this.params_.roomId = roomParams.room_id;
        this.params_.roomLink = roomParams.room_link;
        this.params_.isInitiator = roomParams.is_initiator === 'true';
        /* jshint ignore:end */
        this.params_.messages = roomParams.messages;
      }.bind(this)).catch(function(error) {
        this.onError_('Room server register error: ' + error.message);
        return Promise.reject(error);
      }.bind(this));

  // We only register with WSS if the web socket connection is open and if we're
  // already registered with GAE.
  Promise.all([channelPromise, registerPromise]).then(function() {
    this.channel_.register(this.params_.roomId, this.params_.clientId);

    // We only start signaling after we have registered the signaling channel
    // and have media and TURN. Since we send candidates as soon as the peer
    // connection generates them we need to wait for the signaling channel to be
    // ready.
    Promise.all([turnPromise, mediaPromise]).then(function() {
      this.startSignaling_();
    }.bind(this)).catch(function(error) {
      this.onError_('Failed to start signaling: ' + error.message);
    }.bind(this));
  }.bind(this)).catch(function(error) {
    this.onError_('WebSocket register error: ' + error.message);
  }.bind(this));
};

// Asynchronously request user media if needed.
Call.prototype.maybeGetMedia_ = function() {
  // mediaConstraints.audio and mediaConstraints.video could be objects, so
  // check '!=== false' instead of '=== true'.
  var needStream = (this.params_.mediaConstraints.audio !== false ||
                    this.params_.mediaConstraints.video !== false);
  var mediaPromise = null;
  if (needStream) {
    var mediaConstraints = this.params_.mediaConstraints;

    mediaPromise = requestUserMedia(mediaConstraints).then(function(stream) {
      trace('Got access to local media with mediaConstraints:\n' +
          '  \'' + JSON.stringify(mediaConstraints) + '\'');

      this.onUserMediaSuccess_(stream);
    }.bind(this)).catch(function(error) {
      this.onError_('Error getting user media: ' + error.message);
      this.onUserMediaError_(error);
    }.bind(this));
  } else {
    mediaPromise = Promise.resolve();
  }
  return mediaPromise;
};

// Asynchronously request a TURN server if needed.
Call.prototype.maybeGetTurnServers_ = function() {
  var shouldRequestTurnServers =
      (this.params_.turnRequestUrl && this.params_.turnRequestUrl.length > 0);

  var turnPromise = null;
  if (shouldRequestTurnServers) {
    var requestUrl = this.params_.turnRequestUrl;
    turnPromise =
        requestTurnServers(requestUrl, this.params_.turnTransports).then(
        function(turnServers) {
          var iceServers = this.params_.peerConnectionConfig.iceServers;
          this.params_.peerConnectionConfig.iceServers =
              iceServers.concat(turnServers);
        }.bind(this)).catch(function(error) {
          if (this.onstatusmessage) {
            // Error retrieving TURN servers.
            var subject =
                encodeURIComponent('AppRTC demo TURN server not working');
            this.onstatusmessage(
                'No TURN server; unlikely that media will traverse networks. ' +
                'If this persists please ' +
                '<a href="mailto:discuss-webrtc@googlegroups.com?' +
                'subject=' + subject + '">' +
                'report it to discuss-webrtc@googlegroups.com</a>.');
          }
          trace(error.message);
        }.bind(this));
  } else {
    turnPromise = Promise.resolve();
  }
  return turnPromise;
};

Call.prototype.onUserMediaSuccess_ = function(stream) {
  this.localStream_ = stream;
  if (this.onlocalstreamadded) {
    this.onlocalstreamadded(stream);
  }
};

Call.prototype.onUserMediaError_ = function(error) {
  var errorMessage = 'Failed to get access to local media. Error name was ' +
      error.name + '. Continuing without sending a stream.';
  this.onError_('getUserMedia error: ' + errorMessage);
  alert(errorMessage);
};

Call.prototype.maybeCreatePcClient_ = function() {
  if (this.pcClient_) {
    return;
  }
  try {
    this.pcClient_ = new PeerConnectionClient(this.params_, this.startTime);
    this.pcClient_.onsignalingmessage = this.sendSignalingMessage_.bind(this);
    this.pcClient_.onremotehangup = this.onremotehangup;
    this.pcClient_.onremotesdpset = this.onremotesdpset;
    this.pcClient_.onremotestreamadded = this.onremotestreamadded;
    this.pcClient_.onsignalingstatechange = this.onsignalingstatechange;
    this.pcClient_.oniceconnectionstatechange = this.oniceconnectionstatechange;
    this.pcClient_.onnewicecandidate = this.onnewicecandidate;
    this.pcClient_.onerror = this.onerror;
    trace('Created PeerConnectionClient');
  } catch (e) {
    this.onError_('Create PeerConnection exception: ' + e.message);
    alert('Cannot create RTCPeerConnection; ' +
        'WebRTC is not supported by this browser.');
    return;
  }
};

Call.prototype.startSignaling_ = function() {
  trace('Starting signaling.');
  if (this.isInitiator() && this.oncallerstarted) {
    this.oncallerstarted(this.params_.roomLink);
  }

  this.startTime = window.performance.now();

  this.maybeCreatePcClient_();
  if (this.localStream_) {
    trace('Adding local stream.');
    this.pcClient_.addStream(this.localStream_);
  }
  if (this.params_.isInitiator) {
    this.pcClient_.startAsCaller(this.params_.offerConstraints);
  } else {
    this.pcClient_.startAsCallee(this.params_.messages);
  }
};

// Registers with GAE and returns room parameters.
Call.prototype.registerWithRoomServer_ = function(roomId) {
  return new Promise(function(resolve, reject) {
    if (!roomId) {
      reject(Error('Missing room id.'));
    }
    var path = this.roomServer_ + '/register/' +
        roomId + window.location.search;

    sendAsyncUrlRequest('POST', path).then(function(response) {
      var responseObj = parseJSON(response);
      if (!responseObj) {
        reject(Error('Error parsing response JSON.'));
        return;
      }
      if (responseObj.result !== 'SUCCESS') {
        reject(Error('Registration error: ' + responseObj.result));
        return;
      }
      trace('Registered with GAE.');
      resolve(responseObj.params);
    }.bind(this)).catch(function(error) {
      reject(Error('Failed to register with GAE: ' + error.message));
      return;
    }.bind(this));
  }.bind(this));
};

Call.prototype.onRecvSignalingChannelMessage_ = function(msg) {
  this.maybeCreatePcClient_();
  this.pcClient_.receiveSignalingMessage(msg);
};

Call.prototype.sendSignalingMessage_ = function(message) {
  var msgString = JSON.stringify(message);
  if (this.params_.isInitiator) {
    // Initiator posts all messages to GAE. GAE will either store the messages
    // until the other client connects, or forward the message to Collider if
    // the other client is already connected.
    // Must append query parameters in case we've specified alternate WSS url.
    var path = this.roomServer_ + '/message/' + this.params_.roomId +
        '/' + this.params_.clientId + window.location.search;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', path, true);
    xhr.send(msgString);
    trace('C->GAE: ' + msgString);
  } else {
    this.channel_.send(msgString);
  }
};

Call.prototype.onError_ = function(message) {
  if (this.onerror) {
    this.onerror(message);
  }
};
