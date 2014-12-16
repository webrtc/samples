/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals setCodecParam, removeCodecParam, displayError, displayStatus,
   gatheredIceCandidateTypes, hasTurnServer, iceCandidateType, localStream,
   maybePreferAudioReceiveCodec, maybePreferAudioSendCodec,
   maybePreferVideoReceiveCodec, maybePreferVideoSendCodec,
   maybeSetAudioReceiveBitRate, maybeSetAudioSendBitRate,
   maybeSetVideoReceiveBitRate, maybeSetVideoSendBitRate,
   maybeSetVideoSendInitialBitRate, mergeConstraints, onRemoteHangup,
   onUserMediaError, onUserMediaSuccess, params, parseJSON, pc:true,
   remoteStream:true, remoteVideo, requestTurnServers, sendAsyncUrlRequest,
   requestUserMedia, sdpConstraints, sharingDiv, webSocket:true, startTime:true,
   transitionToActive, updateInfoDiv, waitForRemoteVideo */
/* exported connectToRoom, openSignalingChannel */

'use strict';

var isSignalingChannelReady = false;
var hasLocalStream = false;
var hasReceivedOffer = false;
var messageQueue = [];

// Connects client to the room. This happens by simultaneously requesting
// media, requesting turn, and registering with GAE. Once all three of those
// tasks is complete, the signaling process begins. At the same time, a
// WebSocket connection is opened using |wss_url| followed by a subsequent
// registration once GAE registration completes.
function connectToRoom(roomId) {
  var mediaPromise = getMediaIfNeeded();
  var turnPromise = getTurnServersIfNeeded();

  // Asynchronously open a WebSocket connection to WSS.
  var channelPromise = openSignalingChannel().catch(function(error) {
    displayError(error.message);
    return Promise.reject(error);
  });

  // Asynchronously register with GAE.
  var registerPromise = registerWithGAE(roomId).then(function(roomParams) {
    // The only difference in parameters should be clientId and isInitiator,
    // and the turn servers that we requested.
    // TODO(tkchin): clean up response format. JSHint doesn't like it either.
    /* jshint ignore:start */
    params.clientId = roomParams.client_id;
    params.roomId = roomParams.room_id;
    params.isInitiator = roomParams.is_initiator === 'true';
    /* jshint ignore:end */
    params.messages = roomParams.messages;
  }).catch(function(error) {
    displayError(error.message);
    return Promise.reject(error);
  });

  // We only register with WSS if the web socket connection is open and if we're
  // already registered with GAE.
  Promise.all([channelPromise, registerPromise]).then(function() {
    registerWithWSS(params.roomId, params.clientId);
  }).catch(function(error) {
    displayError('Could not begin WSS registration: ' + error.message);
  });

  // We only create a peer connection once we have media and TURN. Since right
  // now we send candidates as soon as the peer connection generates them we
  // need to wait for registration as well.
  // TODO(tkchin): create peer connection earlier, but only send candidates if
  // registration has occurred.
  Promise.all([registerPromise, turnPromise, mediaPromise]).then(function() {
    startSignaling();
  }).catch(function(error) {
    displayError('Could not begin signaling: ' + error.message);
  });
}

// Asynchronously request user media if needed.
function getMediaIfNeeded() {
  // params.mediaConstraints.audio and params.mediaConstraints.video could be
  // objects, so check '!=== false' instead of '=== true'.
  hasLocalStream = (params.mediaConstraints.audio !== false ||
                    params.mediaConstraints.video !== false);
  var mediaPromise = null;
  if (hasLocalStream) {
    var mediaConstraints = params.mediaConstraints;
    mediaPromise = requestUserMedia(mediaConstraints).then(function(stream) {
      trace('Got access to local media with mediaConstraints:\n' +
          '  \'' + JSON.stringify(mediaConstraints) + '\'');
      onUserMediaSuccess(stream);
    }).catch(function(error) {
      trace('Error getting user media: ' + error.message);
      alert('getUserMedia() failed. Is this a WebRTC capable browser?');

      hasLocalStream = false;
      onUserMediaError(error);
    });
  } else {
    mediaPromise = Promise.resolve();
  }
  return mediaPromise;
}

// Asynchronously request a TURN server if needed.
function getTurnServersIfNeeded() {
  var shouldRequestTurnServers = !hasTurnServer(params) &&
      (params.turnRequestUrl && params.turnRequestUrl.length > 0);
  var turnPromise = null;
  if (shouldRequestTurnServers) {
    var requestUrl = params.turnRequestUrl;
    turnPromise = requestTurnServers(requestUrl).then(function(turnServers) {
      var iceServers = params.peerConnectionConfig.iceServers;
      params.peerConnectionConfig.iceServers = iceServers.concat(turnServers);
    }).catch(function(error) {
      // Error retrieving TURN servers.
      var subject =
          encodeURIComponent('AppRTC demo TURN server not working');
      displayStatus('No TURN server; unlikely that media will traverse' +
                    'networks. If this persists please ' +
                    '<a href="mailto:discuss-webrtc@googlegroups.com?' +
                    'subject=' + subject + '">' +
                    'report it to discuss-webrtc@googlegroups.com</a>.');
      trace(error.message);
    });
  } else {
    turnPromise = Promise.resolve();
  }
  return turnPromise;
}

// Registers with GAE and returns room parameters.
function registerWithGAE(roomId) {
  return new Promise(function(resolve, reject) {
    if (!roomId) {
      reject(Error('Missing room id.'));
    }
    var path = '/register/' + roomId + window.location.search;

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
    }).catch(function(error) {
      reject(Error('Failed to register with GAE: ' + error.message));
      return;
    });
  });
}

function registerWithWSS(roomId, clientId) {
  if (!roomId) {
    trace('ERROR: missing roomId.');
  }
  if (!clientId) {
    trace('ERROR: missing clientId.');
  }
  if (!webSocket) {
    trace('ERROR: Attempted to register without websocket.');
    return;
  }
  if (webSocket.readyState !== WebSocket.OPEN) {
    trace('ERROR: WebSocket is not open.');
    return;
  }
  trace('Registering with WSS.');
  var registerMessage = {
    cmd: 'register',
    roomid: roomId,
    clientid: clientId
  };
  webSocket.send(JSON.stringify(registerMessage));
  // TODO(tkchin): Better notion of whether registration succeeded. Basically
  // check that we don't get an error message back from the socket.
  trace('Registered with WSS.');
  isSignalingChannelReady = true;
}

function openSignalingChannel() {
  trace('Opening signaling channel.');
  return new Promise(function(resolve, reject) {
    webSocket = new WebSocket(params.wssUrl);
    webSocket.onopen = function() {
      trace('Signaling channel opened.');
      webSocket.onerror = onSignalingChannelError;
      resolve();
    };
    webSocket.onmessage = onSignalingChannelMessage;
    webSocket.onerror = function() {
      reject(Error('WebSocket error.'));
    };
    webSocket.onclose = onSignalingChannelClose;
  });
}

function onSignalingChannelMessage(event) {
  var wssMessage = parseJSON(event.data);
  if (!wssMessage) {
    return;
  }
  if (wssMessage.error) {
    trace('WSS error: ' + wssMessage.error);
    return;
  }
  var message = parseJSON(wssMessage.msg);
  if (!message) {
    return;
  }
  trace('WSS->C: ' + wssMessage.msg);
  var isOffer = message.type === 'offer';
  hasReceivedOffer |= isOffer;
  if (isOffer) {
    // Always process offer before candidates.
    messageQueue.unshift(message);
  } else {
    messageQueue.push(message);
  }
  drainMessageQueue();
}

function onSignalingChannelError() {
  displayError('Channel error.');
}

function onSignalingChannelClose(event) {
  // TODO(tkchin): reconnect to WSS.
  trace('Channel closed with code:' + event.code + ' reason:' + event.reason);
  isSignalingChannelReady = false;
  webSocket = null;
}

function createPeerConnection(config, constraints) {
  trace('Creating peer connection.');
  try {
    // Create an RTCPeerConnection via the polyfill (adapter.js).
    pc = new RTCPeerConnection(config, constraints);
    pc.onicecandidate = onIceCandidate;
    trace('Created RTCPeerConnnection with:\n' +
        '  config: \'' + JSON.stringify(config) + '\';\n' +
        '  constraints: \'' + JSON.stringify(constraints) + '\'.');
  } catch (e) {
    displayError('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection; ' +
        'WEBRTC is not supported by this browser.');
    return;
  }
  pc.onaddstream = onRemoteStreamAdded;
  pc.onremovestream = onRemoteStreamRemoved;
  pc.onsignalingstatechange = onSignalingStateChanged;
  pc.oniceconnectionstatechange = onIceConnectionStateChanged;
}

function startSignaling() {
  trace('Starting signaling.');
  startTime = window.performance.now();
  createPeerConnection(params.peerConnectionConfig,
                       params.peerConnectionConstraints);
  if (hasLocalStream) {
    trace('Adding local stream.');
    pc.addStream(localStream);
  }
  if (params.isInitiator) {
    doCall();
  } else {
    calleeStart();
  }
}

function doCall() {
  var constraints = mergeConstraints(params.offerConstraints, sdpConstraints);
  trace('Sending offer to peer, with constraints: \n\'' +
      JSON.stringify(constraints) + '\'.');
  pc.createOffer(setLocalAndSendMessage,
      onCreateSessionDescriptionError, constraints);
}

function calleeStart() {
  // Convert received messages to JSON objects and add them to the message
  // queue.
  var receivedMessages = params.messages;
  var message = null;
  for (var i = 0, len = receivedMessages.length; i < len; i++) {
    trace('GAE->C: ' + receivedMessages[i]);
    message = parseJSON(receivedMessages[i]);
    if (!message) {
      continue;
    }
    if (message.type === 'offer') {
      hasReceivedOffer = true;
      // Always process offer before candidates.
      messageQueue.unshift(message);
    } else {
      messageQueue.push(message);
    }
  }
  params.messages = [];
  drainMessageQueue();
}

function doAnswer() {
  trace('Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage,
      onCreateSessionDescriptionError, sdpConstraints);
}

function setLocalAndSendMessage(sessionDescription) {
  sessionDescription.sdp = maybePreferAudioReceiveCodec(sessionDescription.sdp);
  sessionDescription.sdp = maybePreferVideoReceiveCodec(sessionDescription.sdp);
  sessionDescription.sdp = maybeSetAudioReceiveBitRate(sessionDescription.sdp);
  sessionDescription.sdp = maybeSetVideoReceiveBitRate(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription,
      onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
  sendSignalingMessage(sessionDescription);
}

function setRemote(message) {
  // Set Opus in Stereo, if stereo is true, unset it, if stereo is false, and
  // do nothing if otherwise.
  if (params.opusStereo === 'true') {
    message.sdp = setCodecParam(message.sdp, 'opus/48000', 'stereo', '1');
  } else if (params.opusStereo === 'false') {
    message.sdp = removeCodecParam(message.sdp, 'opus/48000', 'stereo');
  }

  // Set Opus FEC, if opusfec is true, unset it, if opusfec is false, and
  // do nothing if otherwise.
  if (params.opusFec === 'true') {
    message.sdp = setCodecParam(message.sdp, 'opus/48000', 'useinbandfec', '1');
  } else if (params.opusFec === 'false') {
    message.sdp = removeCodecParam(message.sdp, 'opus/48000', 'useinbandfec');
  }

  // Set Opus maxplaybackrate, if requested.
  if (params.opusMaxPbr) {
    message.sdp = setCodecParam(message.sdp, 'opus/48000', 'maxplaybackrate',
        params.opusMaxPbr);
  }
  message.sdp = maybePreferAudioSendCodec(message.sdp);
  message.sdp = maybePreferVideoSendCodec(message.sdp);
  message.sdp = maybeSetAudioSendBitRate(message.sdp);
  message.sdp = maybeSetVideoSendBitRate(message.sdp);
  message.sdp = maybeSetVideoSendInitialBitRate(message.sdp);
  pc.setRemoteDescription(new RTCSessionDescription(message),
      onSetRemoteDescriptionSuccess, onSetSessionDescriptionError);

  function onSetRemoteDescriptionSuccess() {
    trace('Set remote session description success.');
    // By now all onaddstream events for the setRemoteDescription have fired,
    // so we can know if the peer has any remote video streams that we need
    // to wait for. Otherwise, transition immediately to the active state.
    // NOTE: Ideally we could just check |remoteStream| here, which is populated
    // in the onaddstream callback. But as indicated in
    // https://code.google.com/p/webrtc/issues/detail?id=3358, sometimes this
    // callback is dispatched after the setRemoteDescription success callback.
    // Therefore, we read the remoteStreams array directly from the
    // PeerConnection, which seems to work reliably.
    var remoteStreams = pc.getRemoteStreams();
    if (remoteStreams.length > 0 &&
        remoteStreams[0].getVideoTracks().length > 0) {
      trace('Waiting for remote video.');
      waitForRemoteVideo();
    } else {
      // TODO(juberti): Make this wait for ICE connection before transitioning.
      trace('No remote video stream; not waiting for media to arrive.');
      transitionToActive();
    }
  }
}

function sendGAEMessage(message) {
  var msgString = JSON.stringify(message);
  // Must append query parameters in case we've specified alternate WSS url.
  var path = '/message/' + params.roomId + '/' + params.clientId +
      window.location.search;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.send(msgString);
  trace('C->GAE: ' + msgString);
}

function sendWSSMessage(message) {
  var wssMessage = {
    cmd: 'send',
    msg: JSON.stringify(message)
  };
  var msgString = JSON.stringify(wssMessage);
  trace('C->WSS: ' + wssMessage.msg);
  if (isSignalingChannelReady) {
    webSocket.send(msgString);
  } else {
    var path = params.wssPostUrl + '/' + params.roomId + '/' + params.clientId;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', path, true);
    xhr.send(wssMessage.msg);
 }
}

function sendSignalingMessage(message) {
  if (params.isInitiator) {
    // Initiator posts all messages to GAE. GAE will either store the messages
    // until the other client connects, or forward the message to Collider if
    // the other client is already connected.
    sendGAEMessage(message);
  } else {
    sendWSSMessage(message);
  }
}

function processSignalingMessage(message) {
  if (!pc) {
    displayError('peerConnection has not been created yet!');
    return;
  }
  if (message.type === 'offer') {
    setRemote(message);
    doAnswer();
  } else if (message.type === 'answer') {
    setRemote(message);
  } else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    recordIceCandidate('Remote', candidate);
    pc.addIceCandidate(candidate,
        onAddIceCandidateSuccess, onAddIceCandidateError);
  } else if (message.type === 'bye') {
    onRemoteHangup();
  } else {
    trace('WARNING: unknown message: ' + JSON.stringify(message));
  }
}

// When we receive messages from GAE registration and from the WSS connection,
// we add them to a queue and drain it if conditions are right.
function drainMessageQueue() {
  // It's possible that we finish registering and receiving messages from WSS
  // before we create our peer connection. We need to wait for the peer
  // connection to be created before processing messages.
  //
  // Also, the order of messages is in general not the same as the POST order
  // from the other client because the POSTs are async and the server may handle
  // some requests faster than others. We need to process offer before
  // candidates so we wait for the offer to arrive first if we're answering.
  // Offers are added to the front of the queue.
  if (!pc || (!params.isInitiator && !hasReceivedOffer)) {
    return;
  }
  for (var i = 0, len = messageQueue.length; i < len; i++) {
    processSignalingMessage(messageQueue[i]);
  }
  messageQueue = [];
}

function onAddIceCandidateSuccess() {
  trace('Remote candidate added successfully.');
}

function onAddIceCandidateError(error) {
  displayError('Failed to add remote candidate: ' + error.toString());
}

function onCreateSessionDescriptionError(error) {
  displayError('Failed to create session description: ' + error.toString());
}

function onSetSessionDescriptionSuccess() {
  trace('Set session description success.');
}

function onSetSessionDescriptionError(error) {
  displayError('Failed to set session description: ' + error.toString());
}

function onIceCandidate(event) {
  if (event.candidate) {
    // Eat undesired candidates.
    if (filterIceCandidate(event.candidate)) {
      var message = {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      };
      sendSignalingMessage(message);
      recordIceCandidate('Local', event.candidate);
    }
  } else {
    trace('End of candidates.');
  }
}

function onRemoteStreamAdded(event) {
  sharingDiv.classList.remove('active');
  trace('Remote stream added.');
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
}

function onRemoteStreamRemoved() {
  trace('Remote stream removed.');
}

function onSignalingStateChanged() {
  if (pc) {
    trace('Signaling state changed to: ' + pc.signalingState);
  }
  updateInfoDiv();
}

function onIceConnectionStateChanged() {
  if (pc) {
    trace('ICE connection state changed to: ' + pc.iceConnectionState);
    if (pc.iceConnectionState === 'completed') {
      trace('ICE complete time: ' +
          (window.performance.now() - startTime).toFixed(0) + 'ms.');
    }
  }
  updateInfoDiv();
}

// Return false if the candidate should be dropped, true if not.
function filterIceCandidate(candidateObj) {
  var candidateStr = candidateObj.candidate;

  // Always eat TCP candidates. Not needed in this context.
  if (candidateStr.indexOf('tcp') !== -1) {
    return false;
  }

  // If we're trying to eat non-relay candidates, do that.
  if (params.peerConnectionConfig.iceTransports === 'relay' &&
      iceCandidateType(candidateStr) !== 'relay') {
    return false;
  }

  return true;
}

function recordIceCandidate(location, candidateObj) {
  var type = iceCandidateType(candidateObj.candidate);
  var types = gatheredIceCandidateTypes[location];
  if (!types[type]) {
    types[type] = 1;
  } else {
    ++types[type];
  }
  updateInfoDiv();
}
