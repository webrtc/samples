/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals addCodecParam, displayError, displayStatus,
   gatheredIceCandidateTypes, hasTurnServer, iceCandidateType, localStream,
   maybePreferAudioReceiveCodec, maybePreferAudioSendCodec,
   maybeSetAudioReceiveBitRate, maybeSetAudioSendBitRate,
   maybeSetVideoReceiveBitRate, maybeSetVideoSendBitRate,
   maybeSetVideoSendInitialBitRate, mergeConstraints, onRemoteHangup,
   onUserMediaError, onUserMediaSuccess, params, parseJSON, pc:true,
   remoteStream:true, remoteVideo, requestTurnServers, requestUserMedia,
   sdpConstraints, sharingDiv, webSocket:true, startTime:true,
   transitionToActive, updateInfoDiv, waitForRemoteVideo */
/* exported openSignalingChannel, setupCall */

'use strict';

var isSignalingChannelReady = false;
var hasLocalStream = false;
var messageQueue = [];

function setupCall(roomId) {
  // Asynchronously request user media if needed.
  hasLocalStream = !(params.mediaConstraints.audio === false &&
                     params.mediaConstraints.video === false);
  var mediaPromise = null;
  if (hasLocalStream) {
    var mediaConstraints = params.mediaConstraints;
    mediaPromise = requestUserMedia(mediaConstraints).then(function(stream) {
      trace('Got user media.');
      onUserMediaSuccess(stream);
    }).catch(function(error) {
      trace('Error getting user media. Continuing without stream.');
      hasLocalStream = false;
      onUserMediaError(error);
    });
  } else {
    mediaPromise = Promise.resolve();
  }

  // Asynchronously open a WebSocket connection to WSS.
  var channelPromise = openSignalingChannel().catch(function(error) {
    reportError(error.message);
    return Promise.reject(error);
  });

  // Asynchronously request a TURN server if needed.
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
    reportError(error.message);
    return Promise.reject(error);
  });

  // We only register with WSS if the web socket connection is open and if we're
  // already registered with GAE.
  Promise.all([channelPromise, registerPromise]).then(function() {
    registerWithWSS(params.roomId, params.clientId);
  }).catch(function(error) {
    reportError('Could not begin WSS registration: ' + error.message);
  });

  // We only create a peer connection once we have media and TURN. Since right
  // now we send candidates as soon as the peer connection generates them we
  // need to wait for registration as well.
  // TODO(tkchin): create peer connection earlier, but only send candidates if
  // registration has occurred.
  Promise.all([registerPromise, turnPromise, mediaPromise]).then(function() {
    startSignaling();
  }).catch(function(error) {
    reportError('Could not begin signaling: ' + error.message);
  });
}

// Registers with GAE and returns room parameters.
function registerWithGAE(roomId) {
  return new Promise(function(resolve, reject) {
    if (!roomId) {
      reject(Error('Missing room id.'));
    }
    var xhr = new XMLHttpRequest();
    var path = '/register/' + roomId + window.location.search;
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      var errorString = null;
      if (xhr.status !== 200) {
        errorString = 'Failed to register with GAE. Response: ' +
            xhr.responseText;
        reject(Error(errorString));
        return;
      }
      var response = parseJSON(xhr.response);
      if (!response) {
        reject(Error('Error parsing response JSON.'));
        return;
      }
      if (response.result !== 'SUCCESS') {
        reject(Error('Registration error: ' + response.result));
        return;
      }
      trace('Registered with GAE.');
      resolve(response.params);
    };
    xhr.open('POST', path, true);
    xhr.send();
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
      reject(Error('WebSocket unknown error.'));
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
  trace('S->C: ' + wssMessage.msg);
  // It's possible that we finish registering and receiving messages from WSS
  // before we create our peer connection. In this case we save them locally
  // until our peer connection is created.
  if (!pc) {
    messageQueue.push(message);
  } else {
    processSignalingMessage(message);
  }
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
    alert('Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.');
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
  // Process messages provided by GAE in registration response.
  // The GAE db query isn't ordered. We need to process offer before candidates
  // so we explicitly look for the offer first.
  var receivedMessages = params.messages;
  var messages = [];
  for (var i = 0, len = receivedMessages.length; i < len; i++) {
    trace('GAE->C: ' + receivedMessages[i]);
    var message = parseJSON(receivedMessages[i]);
    if (!message) {
      continue;
    }
    if (message.type === 'offer') {
      processSignalingMessage(message);
      continue;
    }
    messages.push(message);
  }
  for (i = 0, len = messages.length; i < len; i++) {
    processSignalingMessage(messages[i]);
  }
  params.messages = [];

  // Process messages received before peer connection was created. WSS doesn't
  // disorder messages so we don't need to search for offer here.
  for (i = 0, len = messageQueue.length; i < len; i++) {
    processSignalingMessage(messageQueue[i]);
  }
  messageQueue = [];
}

function doAnswer() {
  trace('Sending answer to peer.');
  pc.createAnswer(setLocalAndSendMessage,
      onCreateSessionDescriptionError, sdpConstraints);
}

function setLocalAndSendMessage(sessionDescription) {
  sessionDescription.sdp = maybePreferAudioReceiveCodec(sessionDescription.sdp);
  sessionDescription.sdp = maybeSetAudioReceiveBitRate(sessionDescription.sdp);
  sessionDescription.sdp = maybeSetVideoReceiveBitRate(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription,
      onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
  if (params.isInitiator) {
    // Initiator posts all messages to GAE. GAE will either store the messages
    // until the other client connects, or forward the message to Collider if
    // the other client is already connected.
    sendGAEMessage(sessionDescription);
  } else {
    sendWSSMessage(sessionDescription);
  }
}

function setRemote(message) {
  // Set Opus in Stereo, if stereo enabled.
  if (params.isOpusStereo) {
    message.sdp = addCodecParam(message.sdp, 'opus/48000', 'stereo=1');
  }
  if (params.isOpus) {
    message.sdp = addCodecParam(message.sdp, 'opus/48000', 'useinbandfec=1');
  }
  // Set Opus maxplaybackrate, if requested.
  if (params.opusMaxPbr) {
    message.sdp = addCodecParam(message.sdp, 'opus/48000', 'maxplaybackrate=' +
        params.opusMaxPbr);
  }
  message.sdp = maybePreferAudioSendCodec(message.sdp);
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
  var path = '/message/' + params.roomId + '/' + params.clientId;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.send(msgString);
  trace('C->S: ' + msgString);
}

function sendWSSMessage(message) {
  var wssMessage = {
    cmd: 'send',
    msg: JSON.stringify(message)
  };
  var msgString = JSON.stringify(wssMessage);
  trace('C->S: ' + wssMessage.msg);
  if (isSignalingChannelReady) {
    webSocket.send(msgString);
  } else {
    var path = params.wssPostUrl + '/' + params.roomId + '/' + params.clientId;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', path, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send('msg=' + encodeURIComponent(wssMessage.msg));
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
    noteIceCandidate('Remote', iceCandidateType(message.candidate));
    pc.addIceCandidate(candidate,
        onAddIceCandidateSuccess, onAddIceCandidateError);
  } else if (message.type === 'bye') {
    onRemoteHangup();
  } else {
    trace('WARNING: unknown message: ' + JSON.stringify(message));
  }
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
    if (params.peerConnectionConfig.iceTransports === 'relay') {
      // Filter out non relay Candidates, if iceTransports is set to relay.
      if (event.candidate.candidate.search('relay') === -1) {
        return;
      }
    }
    var message = {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    };
    if (params.isInitiator) {
      sendGAEMessage(message);
    } else {
      sendWSSMessage(message);
    }
    noteIceCandidate('Local', iceCandidateType(event.candidate.candidate));
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
  }
  updateInfoDiv();
}

function noteIceCandidate(location, type) {
  var types = gatheredIceCandidateTypes[location];
  if (!types[type]) {
    types[type] = 1;
  } else {
    ++types[type];
  }
  updateInfoDiv();
}
