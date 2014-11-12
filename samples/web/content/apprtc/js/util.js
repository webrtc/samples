/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals displayError, displayStatus, maybeStart, onUserMediaSuccess,
   onUserMediaError, params, turnDone:true, xmlhttp:true */
/* exported doGetUserMedia, maybeRequestTurn */

'use strict';

function maybeRequestTurn() {
  // Allow to skip turn by passing ts=false to apprtc.
  if (params.turnRequestUrl === '') {
    turnDone = true;
    return;
  }

  var iceServers = params.peerConnectionConfig.iceServers;
  for (var i = 0, len = iceServers.length; i < len; i++) {
    if (iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnDone = true;
      return;
    }
  }

  var currentDomain = document.domain;
  if (currentDomain.search('localhost') === -1 &&
      currentDomain.search('apprtc') === -1) {
    // Not authorized domain. Try with default STUN instead.
    turnDone = true;
    return;
  }

  // No TURN server. Get one from computeengineondemand.appspot.com.
  xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = onTurnResult;
  xmlhttp.open('GET', params.turnRequestUrl, true);
  xmlhttp.send();
}

function onTurnResult() {
  if (xmlhttp.readyState !== 4) {
    return;
  }

  if (xmlhttp.status === 200) {
    var turnServer = JSON.parse(xmlhttp.responseText);
    // Create turnUris using the polyfill (adapter.js).
    var turnServers = createIceServers(turnServer.uris,
        turnServer.username, turnServer.password);
    if (turnServers !== null) {
      var iceServers = params.peerConnectionConfig.iceServers;
      params.peerConnectionConfig.iceServers = iceServers.concat(turnServers);
    }
  } else {
    var subject = encodeURIComponent('AppRTC demo TURN server not working');
    displayStatus('No TURN server; unlikely that media will traverse networks. ' +
        'If this persists please <a href="mailto:discuss-webrtc@googlegroups.com?' +
        'subject=' + subject + '">' +
        'report it to discuss-webrtc@googlegroups.com</a>.');
  }
  // If TURN request failed, continue the call with default STUN.
  turnDone = true;
  maybeStart();
}

function doGetUserMedia() {
  // Call into getUserMedia via the polyfill (adapter.js).
  try {
    displayStatus('Calling getUserMedia()...');
    getUserMedia(params.mediaConstraints, onUserMediaSuccess, onUserMediaError);
    trace('Requested access to local media with mediaConstraints:\n' +
        '  \'' + JSON.stringify(params.mediaConstraints) + '\'');
  } catch (e) {
    alert('getUserMedia() failed. Is this a WebRTC capable browser?');
    displayError('getUserMedia failed with exception: ' + e.message);
  }
}

