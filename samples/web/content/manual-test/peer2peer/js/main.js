//  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
//  Use of this source code is governed by a BSD-style license
//  that can be found in the LICENSE file in the root of the source
//  tree.

// See http://dev.w3.org/2011/webrtc/editor/getusermedia.html for more
// information on getUserMedia. See
// http://dev.w3.org/2011/webrtc/editor/webrtc.html for more information on
// peerconnection and webrtc in general.

'use strict';

// TODO(jansson) rewrite to classes.
// Global namespace object.
var global = {};
global.transformOutgoingSdp = function(sdp) { return sdp; };
// Default getUserMedia video resolution.
global.videoWidth = 1280;
global.videoHeight = 720;

// We need a STUN server for some API calls.
var STUN_SERVER = 'stun.l.google.com:19302';

// Used as a shortcut for finding DOM elements by ID.
// @param {string} id is a case-sensitive string representing the unique ID of
// the element being sought.
// @return {object} id returns the element object specified as a parameter.
var $ = function(id) {
  return document.getElementById(id);
};

// Prepopulate constraints from JS to the UI. Enumerate devices available
// via getUserMedia, register elements to be used for local storage.
window.onload = function() {
  hookupDataChannelCallbacks_();
  hookupDtmfSenderCallback_();
  updateGetUserMediaConstraints();
  setupLocalStorageFieldValues();
  acceptIncomingCalls();
  setPeerConnectionConstraints();
  if ($('get-devices-onload').checked === true) {
    getDevices();
  }
  // Checks if the mobile UI should be used.
  registerResButtonsEvents();
  screenCaptureExtensionHandler_()
};

// Disconnect before the tab is closed.
window.onbeforeunload = function() {
  disconnect_();
};

// Handles the resolution button events.
function registerResButtonsEvents() {
  var lastResButtonPressed;
  var elementIdAndResolutions = [
    ['video-qvga', 320, 180],
    ['video-vga', 640, 360],
    ['video-hd', 1280, 720]
  ];

  function setResolution(elementAndRes) {
    $(elementAndRes[0]).addEventListener('click', function() {
      global.videoWidth = elementAndRes[1];
      global.videoHeight = elementAndRes[2];
      $(elementAndRes[0]).className = 'pressed';
      if (typeof lastResButtonPressed !== 'undefined') {
        lastResButtonPressed.className = '';
      }
      lastResButtonPressed = $(elementAndRes[0]);
      updateGetUserMediaConstraints();
    }, false );
  }

  for (var i in elementIdAndResolutions) {
   setResolution(elementIdAndResolutions[i]);
  }
}

// TODO (jansson) Setup events using addEventListener, applies in general.
// A list of element id's to be registered for local storage.
function setupLocalStorageFieldValues() {
  registerLocalStorage_('pc-server');
  registerLocalStorage_('get-devices-onload');
}

// Public HTML functions

// The *Here functions are called from peer2peer.html and will make calls
// into our underlying JavaScript library with the values from the page
// (have to be named differently to avoid name clashes with existing functions).
/* exported getUserMediaFromHere */
function getUserMediaFromHere() {
  var constraints = $('getusermedia-constraints').value;
  try {
    doGetUserMedia_(constraints);
  } catch (exception) {
    print_('getUserMedia says: ' + exception);
  }
}
/* exported editConstraints */
function editConstraints(elementId) {
  $(elementId).style.display = 'inline';
  $(elementId).style.height = '400px';
  $(elementId).style.zIndex = '9';
  $(elementId).focus();
  $(elementId).onblur = function() {
      $(elementId).style.display = 'none';
  };
}

/* exported connectFromHere */
function connectFromHere() {
  var server = $('pc-server').value;
  if ($('peer-id').value === '') {
    // Generate a random name to distinguish us from other tabs:
    $('peer-id').value = 'peer_' + Math.floor(Math.random()*10000);
    print_('Our name from now on will be ' + $('peer-id').value);
  }
  connect(server, $('peer-id').value);
}

/* exported negotiateCallFromHere */
function negotiateCallFromHere() {
  // Set the global variables with values from our UI.
  setCreateOfferConstraints(getEvaluatedJavaScript_(
      $('createoffer-constraints').value));
  setCreateAnswerConstraints(getEvaluatedJavaScript_(
      $('createanswer-constraints').value));

  ensureHasPeerConnection_();
  negotiateCall_();
}

/* exported addLocalStreamFromHere */
function addLocalStreamFromHere() {
  ensureHasPeerConnection_();
  addLocalStream();
}

/* exported removeLocalStreamFromHere */
function removeLocalStreamFromHere() {
  removeLocalStream();
}

/* exported hangUpFromHere */
function hangUpFromHere() {
  hangUp();
  acceptIncomingCalls();
}

/* exported toggleRemoteVideoFromHere */
function toggleRemoteVideoFromHere() {
  toggleRemoteStream(function(remoteStream) {
    return remoteStream.getVideoTracks()[0];
  }, 'video');
}

/* exported toggleRemoteAudioFromHere */
function toggleRemoteAudioFromHere() {
  toggleRemoteStream(function(remoteStream) {
    return remoteStream.getAudioTracks()[0];
  }, 'audio');
}
/* exported toggleLocalVideoFromHere */
function toggleLocalVideoFromHere() {
  toggleLocalStream(function(localStream) {
    return localStream.getVideoTracks()[0];
  }, 'video');
}

/* exported toggleLocalAudioFromHere */
function toggleLocalAudioFromHere() {
  toggleLocalStream(function(localStream) {
    return localStream.getAudioTracks()[0];
  }, 'audio');
}

/* exported stopLocalFromHere */
function stopLocalFromHere() {
  stopLocalStream();
}

/* exported createDataChannelFromHere */
function createDataChannelFromHere() {
  ensureHasPeerConnection_();
  createDataChannelOnPeerConnection();
}

/* exported closeDataChannelFromHere */
function closeDataChannelFromHere() {
  ensureHasPeerConnection_();
  closeDataChannelOnPeerConnection();
}

/* exported sendDataFromHere */
function sendDataFromHere() {
  var data = $('data-channel-send').value;
  sendDataOnChannel(data);
}

/* exported createDtmfSenderFromHere */
function createDtmfSenderFromHere() {
  ensureHasPeerConnection_();
  createDtmfSenderOnPeerConnection();
}

/* exported insertDtmfFromHere */
function insertDtmfFromHere() {
  var tones = $('dtmf-tones').value;
  var duration = $('dtmf-tones-duration').value;
  var gap = $('dtmf-tones-gap').value;
  insertDtmfOnSender(tones, duration, gap);
}

/* exported forceIsacChanged */
function forceIsacChanged() {
  var forceIsac = $('force-isac').checked;
  if (forceIsac) {
    forceIsac_();
  } else {
    dontTouchSdp_();
  }
}

// Updates the constraints in the getusermedia-constraints text box with a
// MediaStreamConstraints string. This string is created based on the state
// of the 'audiosrc' and 'videosrc' checkboxes.
// If device enumeration is supported and device source id's are not undefined
// they will be added to the constraints string.
function updateGetUserMediaConstraints() {
  var selectedAudioDevice = $('audiosrc');
  var selectedVideoDevice = $('videosrc');
  global.constraints = {audio: $('audio').checked,
                        video: $('video').checked
  };

  if ($('video').checked) {
    // Default optional constraints placed here.
    global.constraints.video = {optional: [{minWidth: global.videoWidth},
                                           {minHeight: global.videoHeight},
                                           {googLeakyBucket: true}]};
  }

  if (!selectedAudioDevice.disabled && !selectedAudioDevice.disabled) {
    var devices = getSourcesFromField_(selectedAudioDevice,
                                       selectedVideoDevice);

    if ($('audio').checked) {
      if (typeof devices.audioId !== 'undefined') {
        global.constraints.audio = {optional: [{sourceId: devices.audioId}]};
      }
    }

    if ($('video').checked) {
      if (typeof devices.videoId !== 'undefined') {
        global.constraints.video.optional.push({sourceId: devices.videoId});
      }
    }
  }

  $('getusermedia-constraints').value = JSON.stringify(global.constraints,
      null, ' ');
  $('getusermedia-constraints').addEventListener('change', function() {
    global.constraints = JSON.parse($('getusermedia-constraints').value);
  }, false);
  $('local-res').innerHTML = global.videoWidth + 'x' + global.videoHeight;
}

/* exported showServerHelp */
function showServerHelp() {
  alert('You need to build and run a peerconnection_server on some ' +
        'suitable machine. To build it in chrome, just run make/ninja ' +
        'peerconnection_server. Otherwise, read in https://code.google' +
        '.com/searchframe#xSWYf0NTG_Q/trunk/peerconnection/README&q=REA' +
        'DME%20package:webrtc%5C.googlecode%5C.com.');
}

/* exported clearLog */
function clearLog() {
  $('messages').innerHTML = '';
}

// Stops the local stream.
function stopLocalStream() {
  if (typeof global.localStream === 'undefined') {
    error_('Tried to stop local stream, ' +
           'but media access is not granted.');
  }

  global.localStream.stop();
}

// Adds the current local media stream to a peer connection.
// @param {RTCPeerConnection} peerConnection
function addLocalStreamToPeerConnection(peerConnection) {
  if (typeof global.localStream  === 'undefined') {
    error_('Tried to add local stream to peer connection, but there is no ' +
           'stream yet.');
  }
  try {
    peerConnection.addStream(global.localStream, global.addStreamConstraints);
  } catch (exception) {
    error_('Failed to add stream with constraints ' +
           global.addStreamConstraints + ': ' + exception);
  }
  print_('Added local stream.');
}

// Removes the local stream from the peer connection.
// @param {rtcpeerconnection} peerConnection
function removeLocalStreamFromPeerConnection(peerConnection) {
  if (typeof global.localStream  === 'undefined') {
    error_('Tried to remove local stream from peer connection, but there is ' +
           'no stream yet.');
  }
  try {
    peerConnection.removeStream(global.localStream);
  } catch (exception) {
    error_('Could not remove stream: ' + exception);
  }
  print_('Removed local stream.');
}

// Enumerates the audio and video devices available in Chrome and adds the
// devices to the HTML elements with Id 'audiosrc' and 'videosrc'.
// Checks if device enumeration is supported and if the 'audiosrc' + 'videosrc'
// elements exists, if not a debug printout will be displayed.
// If the device label is empty, audio/video + sequence number will be used to
// populate the name. Also makes sure the children has been loaded in order
// to update the constraints.
function getDevices() {
  var selectedAudioDevice = $('audiosrc');
  var selectedVideoDevice = $('videosrc');
  selectedAudioDevice.innerHTML = '';
  selectedVideoDevice.innerHTML = '';

  if (typeof(MediaStreamTrack.getSources) === 'undefined') {
    selectedAudioDevice.disabled = true;
    selectedVideoDevice.disabled = true;
    $('get-devices').disabled = true;
    $('get-devices-onload').disabled = true;
    updateGetUserMediaConstraints();
    error_('getSources not found, device enumeration not supported');
  }

  MediaStreamTrack.getSources(function(devices) {
    for (var i = 0; i < devices.length; i++) {
      var option = document.createElement('option');
      option.value = devices[i].id;
      option.text = devices[i].label;

      if (devices[i].kind === 'audio') {
        if (option.text === '') {
          option.text = devices[i].id;
        }
        selectedAudioDevice.appendChild(option);
      } else if (devices[i].kind === 'video') {
        if (option.text === '') {
          option.text = devices[i].id;
        }
        selectedVideoDevice.appendChild(option);
      } else {
        error_('Device type ' + devices[i].kind + ' not recognized, ' +
                'cannot enumerate device. Currently only device types' +
                '\'audio\' and \'video\' are supported');
        updateGetUserMediaConstraints();
        return;
      }
    }
  });

  checkIfDeviceDropdownsArePopulated_();
}

function screenCaptureExtensionHandler_() {
  // Copied and modifed from desktopcapture example.
  var extensionInstalled = false;
  document.getElementById('start-screencapture').addEventListener('click',
      function() {
        // send screen-sharer request to content-script
        if (!extensionInstalled) {
          var message = 'Please install the extension:\n' +
                        '1. Go to chrome://extensions\n' +
                        '2. Check: "Enable Developer mode"\n' +
                        '3. Click: "Load the unpacked extension..."\n' +
                        '4. Choose "extension" folder from the repository:\n' +
                        '(Can be downloaded from here http://goo.gl/M1zRbn)\n' +
                        '5. Reload this page';
          alert(message);
        }
        window.postMessage({ type: 'SS_UI_REQUEST', text: 'start' }, '*');
      });

  // listen for messages from the content-script
  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) {
        return;
    }

    // content-script will send a 'SS_PING' msg if extension is installed
    if (event.data.type && (event.data.type === 'SS_PING')) {
      extensionInstalled = true;
    }

    // user chose a stream
    if (event.data.type && (event.data.type === 'SS_DIALOG_SUCCESS')) {
      var constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: event.data.streamId,
            maxWidth: window.screen.width,
            maxHeight: window.screen.height
          }
        }
      }
      doGetUserMedia_(JSON.stringify(constraints));
    }

    // user clicked on 'cancel' in choose media dialog
    if (event.data.type && (event.data.type === 'SS_DIALOG_CANCEL')) {
      warning_('User cancelled!');
    }
  });
}

// Sets the transform to apply just before setting the local description and
// sending to the peer.
// @param {function} transformFunction A function which takes one SDP string as
// argument and returns the modified SDP string.
function setOutgoingSdpTransform(transformFunction) {
  global.transformOutgoingSdp = transformFunction;
}

// Sets the MediaConstraints to be used for PeerConnection createAnswer() calls.
// @param {string} mediaConstraints The constraints, as defined in the
// PeerConnection JS API spec.
function setCreateAnswerConstraints(mediaConstraints) {
  global.createAnswerConstraints = mediaConstraints;
}

// Sets the MediaConstraints to be used for PeerConnection createOffer() calls.
// @param {string} mediaConstraints The constraints, as defined in the
// PeerConnection JS API spec.
function setCreateOfferConstraints(mediaConstraints) {
  global.createOfferConstraints = mediaConstraints;
}

// Sets the callback functions that will receive DataChannel readyState updates
// and received data.
// @param {function} statusCallback The function that will receive a string
// with the current DataChannel readyState.
// @param {function} dataCallback The function that will a string with data
// received from the remote peer.
function setDataCallbacks(statusCallback, dataCallback) {
  global.dataStatusCallback = statusCallback;
  global.dataCallback = dataCallback;
}

// Sends data on an active DataChannel.
// @param {string} data The string that will be sent to the remote peer.
function sendDataOnChannel(data) {
  if (typeof global.dataChannel  === 'undefined') {
    error_('Trying to send data, but there is no DataChannel.');
  }
  global.dataChannel.send(data);
}

// Sets the callback function that will receive DTMF sender ontonechange events.
// @param {function} ontonechange The function that will receive a string with
// the tone that has just begun playout.
function setOnToneChange(ontonechange) {
  global.dtmfOnToneChange = ontonechange;
}

// Inserts DTMF tones on an active DTMF sender.
// @param {string} tones to be sent.
// @param {string} duration duration of the tones to be sent.
// @param {string} interToneGap gap between the tones to be sent.
function insertDtmf(tones, duration, interToneGap) {
  if (typeof global.dtmfSender === 'undefined') {
    error_('Trying to send DTMF, but there is no DTMF sender.');
  }
  global.dtmfSender.insertDTMF(tones, duration, interToneGap);
}

function handleMessage(peerConnection, message) {
  var parsedMsg = JSON.parse(message);
  if (parsedMsg.type) {
    var sessionDescription = new RTCSessionDescription(parsedMsg);
    peerConnection.setRemoteDescription(
        sessionDescription,
        function() { success_('setRemoteDescription'); },
        function(error) { error_('setRemoteDescription', error); });
    if (sessionDescription.type === 'offer') {
      print_('createAnswer with constraints: ' +
            JSON.stringify(global.createAnswerConstraints, null, ' '));
      peerConnection.createAnswer(
          setLocalAndSendMessage_,
          function(error) { error_('createAnswer', error); },
          global.createAnswerConstraints);
    }
    return;
  } else if (parsedMsg.candidate) {
    var candidate = new RTCIceCandidate(parsedMsg);
    peerConnection.addIceCandidate(candidate,
        function() { success_('addIceCandidate'); },
        function(error) { error_('addIceCandidate', error); }
    );
    return;
  }
  error_('unknown message received');
}

// Sets the peerConnection constraints based on checkboxes.
// TODO (jansson) Make it possible to use the text field for constraints like
//     for getUserMedia.
function setPeerConnectionConstraints() {
  // Only added optional for now.
  global.pcConstraints = {
    optional: []
  };

  global.pcConstraints.optional.push(
      {googCpuOveruseDetection: $('cpuoveruse-detection').checked});

  global.pcConstraints.optional.push(
      {RtpDataChannels: $('data-channel-type-rtp').checked});

  $('pc-constraints').value = JSON.stringify(global.pcConstraints, null, ' ');
}

function createPeerConnection(stunServer) {
  var servers = {iceServers: [{url: 'stun:' + stunServer}]};
  var peerConnection;
  try {
    peerConnection = new RTCPeerConnection(servers, global.pcConstraints);
  } catch (exception) {
    error_('Failed to create peer connection: ' + exception);
  }
  peerConnection.onaddstream = addStreamCallback_;
  peerConnection.onremovestream = removeStreamCallback_;
  peerConnection.onicecandidate = iceCallback_;
  peerConnection.ondatachannel = onCreateDataChannelCallback_;
  return peerConnection;
}

function setupCall(peerConnection) {
  print_('createOffer with constraints: ' +
        JSON.stringify(global.createOfferConstraints, null, ' '));
  peerConnection.createOffer(
      setLocalAndSendMessage_,
      function(error) { error_('createOffer', error); },
      global.createOfferConstraints);
}

function answerCall(peerConnection, message) {
  handleMessage(peerConnection, message);
}

function createDataChannel(peerConnection, label) {
  if (typeof global.dataChannel  !== 'undefined' &&
      global.dataChannel.readyState !== 'closed') {
    error_('Creating DataChannel, but we already have one.');
  }

  global.dataChannel = peerConnection.createDataChannel(label,
      { reliable: false });
  print_('DataChannel with label ' + global.dataChannel.label + ' initiated ' +
         'locally.');
  hookupDataChannelEvents();
}

function closeDataChannel() {
  if (typeof global.dataChannel === 'undefined') {
    error_('Closing DataChannel, but none exists.');
  }
  print_('DataChannel with label ' + global.dataChannel.label +
         ' is beeing closed.');
  global.dataChannel.close();
}

function createDtmfSender(peerConnection) {
  if (typeof global.dtmfSender !== 'undefined') {
    error_('Creating DTMF sender, but we already have one.');
  }
  if (typeof global.localStream === 'undefined') {
    error_('Creating DTMF sender but local stream is undefined.');
  }
  var localAudioTrack = global.localStream.getAudioTracks()[0];
  global.dtmfSender = peerConnection.createDTMFSender(localAudioTrack);
  global.dtmfSender.ontonechange = global.dtmfOnToneChange;
}

// Connects to the provided peerconnection_server.
// @param {string} serverUrl The server URL in string form without an ending
// slash, something like http://localhost:8888.
// @param {string} clientName The name to use when connecting to the server.
function connect(serverUrl, clientName) {
  if (typeof global.ourPeerId !== 'undefined') {
    error_('connecting, but is already connected.');
  }
  print_('Connecting to ' + serverUrl + ' as ' + clientName);
  global.serverUrl = serverUrl;
  global.ourClientName = clientName;

  var request = new XMLHttpRequest();
  request.open('GET', serverUrl + '/sign_in?' + clientName, true);
  print_(serverUrl + '/sign_in?' + clientName);
  request.onreadystatechange = function() {
    connectCallback_(request);
  };
  request.send();
}

// Creates a peer connection. Must be called before most other public functions
// in this file.
function preparePeerConnection() {
  if (typeof global.peerConnection !== 'undefined') {
    error_('creating peer connection, but we already have one.');
  }
  global.peerConnection = createPeerConnection(STUN_SERVER);
  success_('ok-peerconnection-created');
}

// Adds the local stream to the peer connection. You will have to re-negotiate
// the call for this to take effect in the call.
function addLocalStream() {
  if (typeof global.peerConnection === 'undefined') {
    error_('adding local stream, but we have no peer connection.');
  }
  addLocalStreamToPeerConnection(global.peerConnection);
  print_('ok-added');
}

// Removes the local stream from the peer connection. You will have to
// re-negotiate the call for this to take effect in the call.
function removeLocalStream() {
  if (typeof global.peerConnection === 'undefined') {
    error_('attempting to remove local stream, but no call is up');
  }
  removeLocalStreamFromPeerConnection(global.peerConnection);
  print_('ok-local-stream-removed');
}

// Toggles the remote audio stream's enabled state on the peer connection, given
// that a call is active. Returns ok-[typeToToggle]-toggled-to-[true/false]
// on success.
// @param {function} selectAudioOrVideoTrack A function that takes a remote
// stream as argument and returns a track (e.g. either the video or audio
// track).
// @param {function} typeToToggle Either "audio" or "video" depending on what
// the selector function selects.
function toggleRemoteStream(selectAudioOrVideoTrack, typeToToggle) {
  if (typeof global.peerConnection === 'undefined') {
    error_('Tried to toggle remote stream, but have no peer connection.');
  }
  if (global.peerConnection.getRemoteStreams().length === 0) {
    error_('Tried to toggle remote stream, but not receiving any stream.');
  }
  var track = selectAudioOrVideoTrack(
      global.peerConnection.getRemoteStreams()[0]);
  toggle_(track, 'remote', typeToToggle);
}

// See documentation on toggleRemoteStream (this function is the same except
// we are looking at local streams).
function toggleLocalStream(selectAudioOrVideoTrack, typeToToggle) {
  if (typeof global.peerConnection === 'undefined') {
    error_('Tried to toggle local stream, but have no peer connection.');
  }
  if (global.peerConnection.getLocalStreams().length === 0) {
    error_('Tried to toggle local stream, but there is no local stream in ' +
           'the call.');
  }
  var track = selectAudioOrVideoTrack(
      global.peerConnection.getLocalStreams()[0]);
  toggle_(track, 'local', typeToToggle);
}

// Hangs up a started call. Returns ok-call-hung-up on success. This tab will
// not accept any incoming calls after this call.
function hangUp() {
  if (typeof global.peerConnection === 'undefined') {
    error_('hanging up, but has no peer connection');
  }
  if (getReadyState_() !== 'active') {
    error_('hanging up, but ready state is not active (no call up).');
  }
  sendToPeer(global.remotePeerId, 'BYE');
  closeCall_();
  global.acceptsIncomingCalls = false;
  print_('ok-call-hung-up');
}


// Start accepting incoming calls.
function acceptIncomingCalls() {
  global.acceptsIncomingCalls = true;
}

// Creates a DataChannel on the current PeerConnection. Only one DataChannel can
// be created on each PeerConnection.
// Returns ok-datachannel-created on success.
function createDataChannelOnPeerConnection() {
  if (typeof global.peerConnection === 'undefined') {
    error_('Tried to create data channel, but have no peer connection.');
  }
  createDataChannel(global.peerConnection, global.ourClientName);
  print_('ok-datachannel-created');
}

// Close the DataChannel on the current PeerConnection.
// Returns ok-datachannel-close on success.
function closeDataChannelOnPeerConnection() {
  if (typeof global.peerConnection === 'undefined') {
    error_('Tried to close data channel, but have no peer connection.');
  }
  closeDataChannel(global.peerConnection);
  print_('ok-datachannel-close');
}

// Creates a DTMF sender on the current PeerConnection.
// Returns ok-dtmfsender-created on success.
function createDtmfSenderOnPeerConnection() {
  if (typeof global.peerConnection === 'undefined') {
    error_('Tried to create DTMF sender, but have no peer connection.');
  }
  createDtmfSender(global.peerConnection);
  print_('ok-dtmfsender-created');
}

// Send DTMF tones on the global.dtmfSender.
// Returns ok-dtmf-sent on success.
function insertDtmfOnSender(tones, duration, interToneGap) {

  if (typeof global.dtmfSender === 'undefined') {
    error_('Tried to insert DTMF tones, but have no DTMF sender.');
  }
  insertDtmf(tones, duration, interToneGap);
  print_('ok-dtmf-sent');
}

// Sends a message to a peer through the peerconnection_server.
function sendToPeer(peer, message) {
  var messageToLog = message.sdp ? message.sdp : message;
  print_('Sending message ' + messageToLog + ' to peer ' + peer + '.');

  var request = new XMLHttpRequest();
  var url = global.serverUrl + '/message?peer_id=' + global.ourPeerId + '&to=' +
      peer;
  request.open('POST', url, false);
  request.setRequestHeader('Content-Type', 'text/plain');
  request.send(message);
}

// @param {!string} videoElementId The ID of the video element to update.
// @param {!number} width of the video to update the video element, if width or
// height is 0, size will be taken from videoElement.videoWidth.
// @param {!number} height of the video to update the video element, if width or
// height is 0 size will be taken from the videoElement.videoHeight.
/* exported updateVideoElementSize */
function updateVideoElementSize(videoElementId, width, height) {
  var videoElement = $(videoElementId);
  if (width > 0 || height > 0) {
    videoElement.width = width;
    videoElement.height = height;
  } else {
    if (videoElement.videoWidth > 0 || videoElement.videoHeight > 0) {
      videoElement.width = videoElement.videoWidth;
      videoElement.height = videoElement.videoHeight;
      print_('Set video element "' + videoElementId + '" size to ' +
             videoElement.width + 'x' + videoElement.height);
    } else {
      print_('"' + videoElementId + '" video stream size is 0, skipping ' +
             ' resize');
    }
  }
  displayVideoSize(videoElement);
}

// Disconnects from the peerconnection server. Returns ok-disconnected on
// success.
function disconnect_() {
  if (typeof global.ourPeerId === 'undefined') {
    return;
  }
  var request = new XMLHttpRequest();
  request.open('GET', global.serverUrl + '/sign_out?peer_id=' +
               global.ourPeerId, false);
  request.send();
  global.ourPeerId = 'undefined';
  print_('ok-disconnected');
}


// Returns true if we are disconnected from peerconnection_server.
function isDisconnected_() {
  return global.ourPeerId === 'undefined';
}

// @return {!string} The current peer connection's ready state, or
// 'no-peer-connection' if there is no peer connection up.
// NOTE: The PeerConnection states are changing and until chromium has
// implemented the new states we have to use this interim solution of always
// assuming that the PeerConnection is 'active'.
function getReadyState_() {
  if (typeof global.peerConnection === 'undefined') {
    return 'no-peer-connection';
  }
  return 'active';
}

// This function asks permission to use the webcam and mic from the browser. It
// will return ok-requested to the test. This does not mean the request was
// approved though. The test will then have to click past the dialog that
// appears in Chrome, which will run either the OK or failed callback as a
// a result. To see which callback was called, use obtainGetUserMediaResult_().
// @param {string} constraints Defines what to be requested, with mandatory
// and optional constraints defined. The contents of this parameter depends
// on the WebRTC version. This should be JavaScript code that we eval().
function doGetUserMedia_(constraints) {
  if (!getUserMedia) {
    print_('Browser does not support WebRTC.');
    return;
  }
  var evaluatedConstraints;
  try {
    evaluatedConstraints = JSON.parse(constraints);
  } catch (exception) {
    error_('Not valid JavaScript expression: ' + constraints);
  }

  print_('Requesting doGetUserMedia: constraints: ' + constraints);
  getUserMedia(evaluatedConstraints, getUserMediaOkCallback_,
               getUserMediaFailedCallback_);
}

// Must be called after calling doGetUserMedia.
// @return {string} Returns not-called-yet if we have not yet been called back
// by WebRTC. Otherwise it returns either ok-got-stream or failed-with-error-x
// (where x is the error code from the error callback) depending on which
// callback got called by WebRTC.
function obtainGetUserMediaResult_() {
  if (typeof global.requestWebcamAndMicrophoneResult === 'undefined') {
    global.requestWebcamAndMicrophoneResult = ' not called yet';
  }
  return global.requestWebcamAndMicrophoneResult;
}


// Negotiates a call with the other side. This will create a peer connection on
// the other side if there isn't one.
// To call this method we need to be aware of the other side, e.g. we must be
// connected to peerconnection_server and we must have exactly one peer on that
// server.
// This method may be called any number of times. If you haven't added any
// streams to the call, an "empty" call will result. The method will return
// ok-negotiating immediately to the test if the negotiation was successfully
// sent.
function negotiateCall_() {
  if (typeof global.peerConnection === 'undefined') {
    error_('Negotiating call, but we have no peer connection.');
  } else if (typeof global.ourPeerId === 'undefined') {
    error_('Negotiating call, but not connected.');
  } else if (typeof global.remotePeerId === 'undefined') {
    error_('Negotiating call, but missing remote peer.');
  }
  setupCall(global.peerConnection);
  print_('ok-negotiating');
}

// This provides the selected source id from the objects in the parameters
// provided to this function. If the audioSelect or videoSelect objects does
// not have any HTMLOptions children it will return null in the source
// object.
// @param {!object} audioSelect HTML drop down element with audio devices added
// as HTMLOptionsCollection children.
// @param {!object} videoSelect HTML drop down element with audio devices added
// as HTMLOptionsCollection children.
// @return {!object} source contains audio and video source ID from the selected
// devices in the drop down menu elements.
function getSourcesFromField_(audioSelect, videoSelect) {
  var source = {
    audioId: null,
    videoId: null
  };
  if (audioSelect.options.length > 0) {
    source.audioId = audioSelect.options[audioSelect.selectedIndex].value;
  }
  if (videoSelect.options.length > 0) {
    source.videoId = videoSelect.options[videoSelect.selectedIndex].value;
  }
  return source;
}

// @param {NavigatorUserMediaError} error Error containing details.
function getUserMediaFailedCallback_(error) {
  error_('GetUserMedia failed with error: ' + error.name);
}

function iceCallback_(event) {
  if (event.candidate) {
    sendToPeer(global.remotePeerId, JSON.stringify(event.candidate));
  }
}

function setLocalAndSendMessage_(sessionDescription) {
  sessionDescription.sdp =
    global.transformOutgoingSdp(sessionDescription.sdp);
  global.peerConnection.setLocalDescription(sessionDescription,
      function() { success_('setLocalDescription'); },
      function(error) { error_('setLocalDescription', error); });
  print_('Sending SDP message:\n' + sessionDescription.sdp);
  sendToPeer(global.remotePeerId, JSON.stringify(sessionDescription));
}

function addStreamCallback_(event) {
  print_('Receiving remote stream...');
  var videoElement = document.getElementById('remote-view');
  attachMediaStream(videoElement, event.stream);

  window.addEventListener('loadedmetadata',
      function() {displayVideoSize(videoElement);}, true);
}

function removeStreamCallback_() {
  print_('Call ended.');
  document.getElementById('remote-view').src = '';
}

function onCreateDataChannelCallback_(event) {
  if (typeof global.dataChannel !== 'undefined' &&
      global.dataChannel.readyState !== 'closed') {
    error_('Received DataChannel, but we already have one.');
  }
  global.dataChannel = event.channel;
  print_('DataChannel with label ' + global.dataChannel.label +
         ' initiated by remote peer.');
  hookupDataChannelEvents();
}

function hookupDataChannelEvents() {
  global.dataChannel.onmessage = global.dataCallback;
  global.dataChannel.onopen = onDataChannelReadyStateChange_;
  global.dataChannel.onclose = onDataChannelReadyStateChange_;
  // Trigger global.dataStatusCallback so an application is notified
  // about the created data channel.
  onDataChannelReadyStateChange_();
}

function onDataChannelReadyStateChange_() {
  print_('DataChannel state:' + global.dataChannel.readyState);
  global.dataStatusCallback(global.dataChannel.readyState);
  console.log(global.dataStatusCallback);
  // Display dataChannel.id only when dataChannel is active/open.
  if (global.dataChannel.readyState === 'open') {
    $('data-channel-id').value = global.dataChannel.id;
  } else if (global.dataChannel.readyState === 'closed') {
    $('data-channel-id').value = '';
  }
}

// @param {MediaStream} stream Media stream.
function getUserMediaOkCallback_(stream) {
  global.localStream = stream;
  success_('getUserMedia');

  if (stream.getVideoTracks().length > 0) {
    // Show the video element if we did request video in the getUserMedia call.
    var videoElement = $('local-view');
    attachMediaStream(videoElement, stream);
    window.addEventListener('loadedmetadata', function() {
        displayVideoSize(videoElement);}, true);
    // Throw an error when no video is sent from camera but gUM returns OK.
    stream.getVideoTracks()[0].onended = function() {
      error_(global.localStream + ' getUserMedia successful but ' +
             'MediaStreamTrack.onended event fired, no frames from camera.');
    };
    // Print information on track going to mute or back from it.
    stream.getVideoTracks()[0].onmute = function() {
      error_(global.localStream + ' MediaStreamTrack.onmute event has fired, ' +
             'no frames to the track.');
    };
    stream.getVideoTracks()[0].onunmute = function() {
      warning_(global.localStream + ' MediaStreamTrack.onunmute event has ' +
               'fired.');
    };
  }
}

// @param {string} videoTag The ID of the video tag + stream used to write the
// size to a HTML tag based on id if the div's exists.
function displayVideoSize(videoTag) {
  if (videoTag.videoWidth > 0 || videoTag.videoHeight > 0) {
    $(videoTag.id + '-size').firstChild.data = videoTag.videoWidth + 'x' +
                                               videoTag.videoHeight;
  }
}

// Checks if the 'audiosrc' and 'videosrc' drop down menu elements has had all
// of its children appended in order to provide device ID's to the function
// 'updateGetUserMediaConstraints()', used in turn to populate the getUserMedia
// constraints text box when the page has loaded.
function checkIfDeviceDropdownsArePopulated_() {
  if (document.addEventListener) {
    $('audiosrc').addEventListener('DOMNodeInserted',
         updateGetUserMediaConstraints, false);
    $('videosrc').addEventListener('DOMNodeInserted',
         updateGetUserMediaConstraints, false);
  } else {
    print_('addEventListener is not supported by your browser, cannot update ' +
           'device source ID\'s automatically. Select a device from the audio' +
           ' or video source drop down menu to update device source id\'s');
  }
}

// Register an input element to use local storage to remember its state between
// sessions (using local storage). Only input elements are supported.
// @param {!string} element_id to be used as a key for local storage and the id
// of the element to store the state for.
function registerLocalStorage_(elementId) {
  var element = $(elementId);
  if (element.tagName !== 'INPUT') {
    error_('You can only use registerLocalStorage_ for input elements. ' +
          'Element \"' + element.tagName + '\" is not an input element. ');
  }

  if (localStorage.getItem(element.id) === null) {
    storeLocalStorageField_(element);
  } else {
    getLocalStorageField_(element);
  }

  // Registers the appropriate events for input elements.
  if (element.type === 'checkbox') {
    element.onclick = function() { storeLocalStorageField_(this); };
  } else if (element.type === 'text') {
    element.onblur = function() { storeLocalStorageField_(this); };
  } else {
    error_('Unsupportered input type: ' + '\"' + element.type + '\"');
  }
}

// Fetches the stored values from local storage and updates checkbox status.
// @param {!Object} element of which id is representing the key parameter for
// local storage.
function getLocalStorageField_(element) {
  // Makes sure the checkbox status is matching the local storage value.
  if (element.type === 'checkbox') {
    element.checked = (localStorage.getItem(element.id) === 'true');
  } else if (element.type === 'text') {
    element.value = localStorage.getItem(element.id);
  } else {
    error_('Unsupportered input type: ' + '\"' + element.type + '\"');
  }
}

// Stores the string value of the element object using local storage.
// @param {!Object} element of which id is representing the key parameter for
// local storage.

function storeLocalStorageField_(element) {
  if (element.type === 'checkbox') {
    localStorage.setItem(element.id, element.checked);
  } else if (element.type === 'text') {
    localStorage.setItem(element.id, element.value);
  }
}

// Create the peer connection if none is up (this is just convenience to
// avoid having a separate button for that).
function ensureHasPeerConnection_() {
  if (getReadyState_() === 'no-peer-connection') {
    preparePeerConnection();
  }
}

// @param {string} message Text to print.
function print_(message) {
  printHandler_(message, 'black');
}

// @param {string} message Text to print.
function success_(message) {
  printHandler_(message, 'green');
}

// @param {string} message Text to print.
function warning_(message) {
  printHandler_(message, 'orange');
}

// @param {string} message Text to print.
function error_(message) {
  printHandler_(message, 'red');
}

// @param {string} message Text to print.
// @param {string} textField Element ID of where to print.
// @param {string} color Color of the text.
function printHandler_(message, color) {
  if (color === 'green' ) {
    message += ' success';
  }
  $('messages').innerHTML += '<span style="color:' + color + ';">' + message +
                            '</span><br>';
  console.log(message);
  if (color === 'red' ) {
    throw new Error(message);
  }
}

// @param {string} stringRepresentation JavaScript as a string.
// @return {Object} The PeerConnection constraints as a JavaScript dictionary.
function getEvaluatedJavaScript_(stringRepresentation) {
  try {
    var evaluatedJavaScript;
    evaluatedJavaScript = JSON.parse(stringRepresentation);
    return evaluatedJavaScript;
  } catch (exception) {
    error_('Not valid JavaScript expression: ' + stringRepresentation);
  }
}

function forceIsac_() {
  setOutgoingSdpTransform(function(sdp) {
    // Remove all other codecs (not the video codecs though).
    sdp = sdp.replace(/m=audio (\d+) RTP\/SAVPF.*\r\n/g,
                      'm=audio $1 RTP/SAVPF 104\r\n');
    sdp = sdp.replace('a=fmtp:111 minptime=10', 'a=fmtp:104 minptime=10');
    sdp = sdp.replace(/a=rtpmap:(?!104)\d{1,3} (?!VP8|red|ulpfec).*\r\n/g, '');
    return sdp;
  });
}

function dontTouchSdp_() {
  setOutgoingSdpTransform(function(sdp) { return sdp; });
}

function hookupDataChannelCallbacks_() {
  setDataCallbacks(function(status) {
    $('data-channel-status').value = status;
  },
  function(dataMessage) {
    print_('Received ' + dataMessage.data);
    $('data-channel-receive').value =
      dataMessage.data + '\n' + $('data-channel-receive').value;
  });
}

function hookupDtmfSenderCallback_() {
  setOnToneChange(function(tone) {
    print_('Sent DTMF tone: ' + tone.tone);
  });
}

function toggle_(track, localOrRemote, audioOrVideo) {
  if (!track) {
    error_('Tried to toggle ' + localOrRemote + ' ' + audioOrVideo +
                 ' stream, but has no such stream.');
  }
  track.enabled = !track.enabled;
  print_('ok-' + audioOrVideo + '-toggled-to-' + track.enabled);
}

function connectCallback_(request) {
  print_('Connect callback: ' + request.status + ', ' + request.readyState);
  if (request.status === 0) {
    print_('peerconnection_server doesn\'t seem to be up.');
    error_('failed connecting to peerConnection server');
  }
  if (request.readyState === 4 && request.status === 200) {
    global.ourPeerId = parseOurPeerId_(request.responseText);
    global.remotePeerId = parseRemotePeerIdIfConnected_(request.responseText);
    startHangingGet_(global.serverUrl, global.ourPeerId);
    print_('ok-connected');
  }
}

function parseOurPeerId_(responseText) {
  // According to peerconnection_server's protocol.
  var peerList = responseText.split('\n');
  return parseInt(peerList[0].split(',')[1]);
}

function parseRemotePeerIdIfConnected_(responseText) {
  var peerList = responseText.split('\n');
  if (peerList.length === 1) {
    // No peers have connected yet - we'll get their id later in a notification.
    return null;
  }
  var remotePeerId = null;
  for (var i = 0; i < peerList.length; i++) {
    if (peerList[i].length === 0) {
      continue;
    }
    var parsed = peerList[i].split(',');
    var name = parsed[0];
    var id = parseInt(parsed[1]);
    if (id !== global.ourPeerId  ) {
      print_('Found remote peer with name ' + name + ', id ' +
                id + ' when connecting.');
      // There should be at most one remote peer in this test.
      if (remotePeerId !== null) {
        error_('Expected just one remote peer in this test: ' +
               'found several.');
      }
      // Found a remote peer.
      remotePeerId = id;
    }
  }
  return remotePeerId;
}

function startHangingGet_(server, ourId) {
  if (isDisconnected_()) {
    return;
  }
  var hangingGetRequest = new XMLHttpRequest();
  hangingGetRequest.onreadystatechange = function() {
    hangingGetCallback_(hangingGetRequest, server, ourId);
  };
  hangingGetRequest.ontimeout = function() {
    hangingGetTimeoutCallback_(hangingGetRequest, server, ourId);
  };
  var callUrl = server + '/wait?peer_id=' + ourId;
  print_('Sending ' + callUrl);
  hangingGetRequest.open('GET', callUrl, true);
  hangingGetRequest.send();
}

function hangingGetCallback_(hangingGetRequest, server, ourId) {
  if (hangingGetRequest.readyState !== 4 || hangingGetRequest.status === 0) {
    // Code 0 is not possible if the server actually responded. Ignore.
    return;
  }
  if (hangingGetRequest.status !== 200) {
    error_('Error ' + hangingGetRequest.status + ' from server: ' +
           hangingGetRequest.statusText);
  }
  var targetId = readResponseHeader_(hangingGetRequest, 'Pragma');
  if (targetId === ourId) {
    handleServerNotification_(hangingGetRequest.responseText);
  } else {
    handlePeerMessage_(targetId, hangingGetRequest.responseText);
  }
  hangingGetRequest.abort();

  restartHangingGet_(server, ourId);
}

function hangingGetTimeoutCallback_(hangingGetRequest, server, ourId) {
  print_('Hanging GET times out, re-issuing...');
  hangingGetRequest.abort();
  restartHangingGet_(server, ourId);
}

function handleServerNotification_(message) {
  var parsed = message.split(',');
  if (parseInt(parsed[2]) === 1) {
    // Peer connected - this must be our remote peer, and it must mean we
    // connected before them (except if we happened to connect to the server
    // at precisely the same moment).
    print_('Found remote peer with name ' + parsed[0] + ', id ' + parsed[1] +
           ' when connecting.');
    global.remotePeerId = parseInt(parsed[1]);
  }
}

function closeCall_() {
  if (typeof global.peerConnection === 'undefined') {
    warning_('Closing call, but no call active.');
  }
  global.peerConnection.close();
  global.peerConnection = undefined;
}

function handlePeerMessage_(peerId, message) {
  print_('Received message from peer ' + peerId + ': ' + message);
  if (peerId !== global.remotePeerId) {
    error_('Received notification from unknown peer ' + peerId +
           ' (only know about ' + global.remotePeerId + '.');
  }
  if (message.search('BYE') === 0) {
    print_('Received BYE from peer: closing call');
    closeCall_();
    return;
  }
  if (typeof global.peerConnection  === 'undefined' &&
      global.acceptsIncomingCalls) {
    // The other side is calling us.
    print_('We are being called: answer...');

    global.peerConnection = createPeerConnection(STUN_SERVER);

    if ($('auto-add-stream-oncall') &&
        obtainGetUserMediaResult_() === 'ok-got-stream') {
      print_('We have a local stream, so hook it up automatically.');
      addLocalStreamToPeerConnection(global.peerConnection);
    }
    answerCall(global.peerConnection, message);
    return;
  }
  handleMessage(global.peerConnection, message);
}

function restartHangingGet_(server, ourId) {
  window.setTimeout(function() {
    startHangingGet_(server, ourId);
  }, 0);
}

function readResponseHeader_(request, key) {
  var value = request.getResponseHeader(key);
  if (value === null || value.length === 0) {
    error_('Received empty value ' + value +
           ' for response header key ' + key + '.');
  }
  return parseInt(value);
}
