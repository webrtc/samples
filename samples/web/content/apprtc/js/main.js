/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

// Variables defined in and used from apprtc/index.html or appwindow.js.
/* globals initialParams, setupStereoscopic */
/* exported doGetUserMedia, enterFullScreen, initialize, onHangup */

// Variables defined in and used from util.js.
/* globals doGetUserMedia, isChromeApp, randomString, pushRecentRoom, getRecentRooms,
   sendAsyncUrlRequest, parseJSON */
/* exported onUserMediaSuccess, onUserMediaError */

// Variables defined in and used from infobox.js.
/* globals showInfoDiv, toggleInfoDiv, updateInfoDiv */
/* exported getStatsTimer, infoDiv */

// Variables defined in and used from stats.js.
/* exported prevStats, stats */

// Variables defined in and used from signaling.js.
/* globals connectToRoom, hasReceivedOffer:true, isSignalingChannelReady:true,
   messageQueue, sendWSSMessage, startSignaling */
/* exported gatheredIceCandidateTypes, sdpConstraints, onRemoteHangup,
   waitForRemoteVideo, displaySharingInfo */

// Variables defined in and used from loopback.js.
/* globals setupLoopback */

'use strict';

var infoDiv = document.querySelector('#info');
var localVideo = document.querySelector('#local-video');
var miniVideo = document.querySelector('#mini-video');
var remoteCanvas = document.querySelector('#remote-canvas');
var remoteVideo = document.querySelector('#remote-video');
var sharingDiv = document.querySelector('#sharing');
var statusDiv = document.querySelector('#status');
var videosDiv = document.querySelector('#videos');
var footerDiv = document.querySelector('#footer');
var roomLink = document.querySelector('#room-link-a');
var joinRoomButton = document.querySelector('#joinButton');
var randomRoomButton = document.querySelector('#randomButton');
var roomIdInput = document.querySelector('#roomId');
var recentRoomsList = document.querySelector('#recentRoomsList');
var roomUIDiv = document.querySelector('#landing');

// Types of gathered ICE Candidates.
var gatheredIceCandidateTypes = {
  Local: {},
  Remote: {}
};
var getStatsTimer;
var errorMessages = [];
var isAudioMuted = false;
var isVideoMuted = false;
var localStream;
var pc = null;
var remoteStream;
// Set up audio and video regardless of what devices are present.
// Disable comfort noise for maximum audio quality.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  },
  'optional': [{
    'VoiceActivityDetection': false
  }]
};

var webSocket;
var startTime;
var endTime;
var stats;
var prevStats;
var transitionToWaitingTimer = null;

var params = initialParams;
// If we already have a room to join, it will be set in params.roomId.
// If not, this will be undefined.
var roomId;
if (params) {
  roomId = params.roomId;
}

var server = '';
if (isChromeApp()) {
  // TODO: update server
  server = 'http://localhost:8080';
}

var connectedToRoom = false;

function initialize() {
  // We don't want to continue if this is triggered from Chrome prerendering,
  // since it will register the user to GAE without cleaning it up, causing
  // the real navigation to get a "full room" error. Instead we'll initialize
  // once the visibility state changes to non-prerender.
  if (document.webkitVisibilityState === 'prerender') {
    document.addEventListener('webkitvisibilitychange', onVisibilityChange);
    return;
  }

  var roomErrors = params.errorMessages;
  if (roomErrors.length > 0) {
    console.log(roomErrors);
    for (var i = 0; i < roomErrors.length; ++i) {
      window.alert(roomErrors[i]);
    }
    return;
  }
  document.body.ondblclick = toggleFullScreen;
  
  roomLink.innerHTML = params.roomLink;
  roomLink.href = params.roomLink;
  
  trace('Initializing; room=' + params.roomId + '.');
  connectToRoom(params.server, params.roomId);
  connectedToRoom = true;
  if (params.isLoopback) {
    setupLoopback();
  }
}

function onVisibilityChange() {
  if (document.webkitVisibilityState === 'prerender') {
    return;
  }
  document.removeEventListener('webkitvisibilitychange', onVisibilityChange);
  initialize();
}

function onUserMediaSuccess(stream) {
  trace('User has granted access to local media.');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localStream = stream;
  // Caller creates PeerConnection.
  displayStatus('');
  localVideo.classList.add('active');
}

function onUserMediaError(error) {
  var errorMessage = 'Failed to get access to local media. Error name was ' +
      error.name + '. Continuing without sending a stream.';
  displayError(errorMessage);
  alert(errorMessage);
}

function hangup() {
  trace('Hanging up.');
  displayStatus('Hanging up');
  transitionToDone();
  localStream.stop();
  stop();
  disconnectFromRoom();
}

function disconnectFromRoom() {
  // Send bye to GAE. This must complete before saying BYE to other client.
  // When the other client sees BYE it attempts to post offer and candidates to
  // GAE. GAE needs to know that we're disconnected at that point otherwise
  // it will forward messages to this client instead of storing them.
  var server = params.server;
  if (!server) {
    // If server is not provided, use relative URI.
    server = '';
  }
  path = server + '/bye/' + params.roomId + '/' + params.clientId;
  xhr = new XMLHttpRequest();
  xhr.open('POST', path, false);
  xhr.send();

  // Send bye to other client.
  if (webSocket) {
    sendWSSMessage({ type: 'bye' });
    webSocket.close();
    webSocket = null;
    isSignalingChannelReady = false;
  }

  // Tell WSS that we're done.
  var path = params.wssPostUrl + '/' + params.roomId + '/' + params.clientId;
  var xhr = new XMLHttpRequest();
  xhr.open('DELETE', path, false);
  xhr.send();
}

function onRemoteHangup() {
  displayStatus('The remote side hung up.');
  transitionToWaiting();
  stop();
  // On remote hangup this client becomes the new initiator.
  params.isInitiator = true;
  startSignaling();
}

function stop() {
  isAudioMuted = false;
  isVideoMuted = false;
  pc.close();
  pc = null;
  remoteStream = null;
  hasReceivedOffer = false;
  params.messages.length = 0;
  messageQueue.length = 0;
}

function waitForRemoteVideo() {
  // Wait for the actual video to start arriving before moving to the active
  // call state.
  if (remoteVideo.readyState >= 2) {  // i.e. can play
    trace('Remote video started; currentTime: ' + remoteVideo.currentTime);
    transitionToActive();
  } else {
    remoteVideo.oncanplay = waitForRemoteVideo;
  }
}

function transitionToActive() {
  // Stop waiting for remote video.
  remoteVideo.oncanplay = undefined;
  endTime = window.performance.now();
  trace('Call setup time: ' + (endTime - startTime).toFixed(0) + 'ms.');
  updateInfoDiv();

  if (transitionToWaitingTimer) {
    clearTimeout(transitionToWaitingTimer);
    transitionToWaitingTimer = null;
  }

  // Prepare the remote video and PIP elements.
  if (params.isStereoscopic) {
    miniVideo.classList.remove('active');
    miniVideo.classList.add('hidden');
    setupStereoscopic(remoteVideo, remoteCanvas);
  } else {
    reattachMediaStream(miniVideo, localVideo);
  }

  // Transition opacity from 0 to 1 for the remote and mini videos.
  remoteVideo.classList.add('active');
  miniVideo.classList.add('active');
  // Transition opacity from 1 to 0 for the local video.
  localVideo.classList.remove('active');
  localVideo.src = '';
  // Rotate the div containing the videos 180 deg with a CSS transform.
  videosDiv.classList.add('active');
  displayStatus('');
}

function transitionToWaiting() {
   // Stop waiting for remote video.
  remoteVideo.oncanplay = undefined;
  startTime = null;
  // Rotate the div containing the videos -180 deg with a CSS transform.
  videosDiv.classList.remove('active');

  transitionToWaitingTimer = setTimeout(function() {
    transitionToWaitingTimer = null;
    miniVideo.src = '';
    remoteVideo.src = '';
  }, 800);

  // Set localVideo.src now so that the local stream won't be lost if the call
  // is restarted before the timeout.
  localVideo.src = miniVideo.src;

  // Transition opacity from 0 to 1 for the local video.
  localVideo.classList.add('active');
  // Transition opacity from 1 to 0 for the remote and mini videos.
  remoteVideo.classList.remove('active');
  miniVideo.classList.remove('active');
}

function transitionToDone() {
   // Stop waiting for remote video.
  remoteVideo.oncanplay = undefined;
  localVideo.classList.remove('active');
  remoteVideo.classList.remove('active');
  miniVideo.classList.remove('active');
  displayStatus('You have left the call. <a href=\'' + params.roomLink +
      '\'>Click here</a> to rejoin.');
}

function toggleVideoMute() {
  var videoTracks = localStream.getVideoTracks();
  if (videoTracks.length === 0) {
    trace('No local video available.');
    return;
  }

  var newMuted = !isVideoMuted;
  trace('Toggling video mute state.');
  for (var i = 0; i < videoTracks.length; ++i) {
    videoTracks[i].enabled = !newMuted;
  }

  isVideoMuted = newMuted;
  trace('Video ' + (isVideoMuted ? 'muted.' : 'unmuted.'));
}

function toggleAudioMute() {
  var audioTracks = localStream.getAudioTracks();
  if (audioTracks.length === 0) {
    trace('No local audio available.');
    return;
  }

  var newMuted = !isAudioMuted;
  trace('Toggling audio mute state.');
  for (var i = 0; i < audioTracks.length; ++i) {
    audioTracks[i].enabled = !newMuted;
  }

  isAudioMuted = newMuted;
  trace('Audio ' + (isAudioMuted ? 'muted.' : 'unmuted.'));
}

// Spacebar, or m: toggle audio mute.
// c: toggle camera(video) mute.
// f: toggle fullscreen.
// i: toggle info panel.
// q: quit (hangup)
// Return false to screen out original Chrome shortcuts.
document.onkeypress = function(event) {
  if (!connectedToRoom) {
    return;
  }
  
  switch (String.fromCharCode(event.charCode)) {
    case ' ':
    case 'm':
      toggleAudioMute();
      return false;
    case 'c':
      toggleVideoMute();
      return false;
    case 'f':
      toggleFullScreen();
      return false;
    case 'i':
      toggleInfoDiv();
      return false;
    case 'q':
      hangup();
      return false;
    default:
      return;
  }
};

// Send a BYE on refreshing or leaving a page
// to ensure the room is cleaned up for the next session.
// onbeforeunload is not supported in chrome apps.
if (!isChromeApp()) {
  window.onbeforeunload = function() {
    disconnectFromRoom();
  };
}

function displaySharingInfo() {
  sharingDiv.classList.add('active');
}

function displayStatus(status) {
  if (status === '') {
    statusDiv.classList.remove('active');
  } else {
    statusDiv.classList.add('active');
  }
  statusDiv.innerHTML = status;
}

function displayError(error) {
  trace(error);
  errorMessages.push(error);
  updateInfoDiv();
  showInfoDiv();
}

function toggleFullScreen() {
  try {
    // TODO: add shim so not Chrome only
    if (document.webkitIsFullScreen) {
      document.webkitCancelFullScreen();
    } else {
      videosDiv.webkitRequestFullScreen();
      remoteCanvas.webkitRequestFullScreen();
    }
  } catch (event) {
    trace(event);
  }
}

roomIdInput.addEventListener('input', function(){
  // validate room id, enable/disable join button
  // The server currently accepts only the \w character class
  var room = roomIdInput.value;
  var valid = room.length >= 5;
  var re = /^\w+$/;
  valid = valid && re.exec(room);
  if (valid) {
    joinRoomButton.disabled = false;
  } else {
    joinRoomButton.disabled = true;
  }
});

randomRoomButton.addEventListener('click', function() {
  roomIdInput.value = randomString(9);
}, false);

joinRoomButton.addEventListener('click', function() {
  // TODO - validate entered room name
  
  roomId = roomIdInput.value;
  loadRoom();
},false);

function showRoomSelectionUI(shouldShow) {
  if (shouldShow) {
    videosDiv.classList.add('hidden');
    footerDiv.classList.add('hidden');
    roomUIDiv.classList.add('active');
  } else {
    videosDiv.classList.remove('hidden');
    footerDiv.classList.remove('hidden');
    roomUIDiv.classList.remove('active');
  }
}

if (!isChromeApp()) {
  window.onpopstate = function(event) {
    if (!event.state) {
      // Resetting back to room selection page not yet supported, reload
      // the initial page instead.
      trace('Reloading main page.');
      location.href = location.origin;
    } else {
      // This could be a forward request to open a room again
      if (event.state && event.state.roomLink) {
        location.href = event.state.roomLink;
      }
    }
    
  };
}

function loadRoom() {
  pushRecentRoom(roomId).then(function() {
    // check if room is available
    var roomCheckUri = server + '/room/' + encodeURIComponent(roomId) + '/status';
    trace('Requesting room status from: ' + roomCheckUri);
    return sendAsyncUrlRequest('GET', roomCheckUri);
  }).then(function(response) {
      var roomStatusResponse = parseJSON(response);
      if (!roomStatusResponse) {
        trace('Error parsing json response for room status: ' + response);
        return Promise.reject('Error getting room status.');
      }
  
      if (roomStatusResponse.roomFull) {
        trace('Room is full.');
        return Promise.reject('Room is full: ' + roomId);
      }
      return;
    }).then(function() {
      // start process of getting params and initializing.
      var paramsUri = server + '/params/' + encodeURIComponent(roomId);
      trace('Requesting default params from: ' + paramsUri);
      return sendAsyncUrlRequest('GET', paramsUri);
    }).then(function(response) {
        var paramsServerResponse = parseJSON(response);
        if (!paramsServerResponse) {
          // TODO - we could provide a set of defaults here, but the next call
          // is likely to fail as well if the server isn't responding.
          trace('Error parsing json response for default params: ' + response);
          return Promise.reject('Error getting room parameters.');
        }
        // TODO - filter for known values
        params = paramsServerResponse;
        params.server = server;
        trace('Retrieved default params from server.');
        showRoomSelectionUI(false);
        // Push new URI in web app
        if (!isChromeApp()) {
          window.history.pushState({'roomId': params.roomId, 'roomLink': params.roomLink }, params.roomId, params.roomLink);
        }
        initialize();
    }).catch(function(error) {
      // TODO : display error UI for room full or other errors.
      trace('Could not connect to room:');
      trace(error);
      if (error.message) {
        trace(error.message);
      }
    });
}

function makeRecentlyUsedClickHandler(roomName) {
  return function(e) {
    e.preventDefault();
    // Launch clicked room
    roomId = roomName;
    loadRoom();
  };
}
// Build recently used rooms list UI.
getRecentRooms().then(function(recentRooms) {
  for (var i = 0; i < recentRooms.length; ++i) {
    // Create link in recent list
    var li = document.createElement('li');
    var href = document.createElement('a');
    var linkText = document.createTextNode(recentRooms[i]);
    href.appendChild(linkText);
    href.href = location.origin + '/r/' + encodeURIComponent(recentRooms[i]);
    li.appendChild(href);
    recentRoomsList.appendChild(li);
    
    // Set up click handler to avoid browser navigation.
    href.addEventListener('click', makeRecentlyUsedClickHandler(recentRooms[i]), false);
  }
});

// Show room selection UI if we don't have a room to join.
if (!roomId) {
  roomId = randomString(9);
  roomIdInput.value = roomId;
  showRoomSelectionUI(true);
}


