/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* exported hasTurnServer, isFullScreen, requestTurnServers, sendAsyncUrlRequest */

'use strict';

// Sends the URL request and returns a Promise as the result.
function sendAsyncUrlRequest(method, url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if (xhr.status !== 200) {
        reject(
            Error('Status=' + xhr.status + ', response=' + xhr.responseText));
        return;
      }
      resolve(xhr.responseText);
    };
    xhr.open(method, url, true);
    xhr.send();
  });
}

function hasTurnServer(params) {
  var iceServers = params.peerConnectionConfig.iceServers;
  for (var i = 0, len = iceServers.length; i < len; i++) {
    if (iceServers[i].urls.substr(0, 5) === 'turn:') {
      return true;
    }
  }
  return false;
}

// Returns a list of turn servers after requesting it from CEOD.
function requestTurnServers(turnRequestUrl) {
  return new Promise(function(resolve, reject) {
    sendAsyncUrlRequest('GET', turnRequestUrl).then(function(response) {
      var turnServerResponse = parseJSON(response);
      if (!turnServerResponse) {
        reject(Error('Error parsing response JSON: ' + response));
        return;
      }
      var turnServers = createIceServers(turnServerResponse.uris,
          turnServerResponse.username, turnServerResponse.password);
      if (!turnServers) {
        reject(Error('Error creating ICE servers from response.'));
        return;
      }
      trace('Retrieved TURN server information.');
      resolve(turnServers);
    }).catch(function(error) {
      reject(Error('TURN server request error: ' + error.message));
      return;
    });
  });
}

function parseJSON(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    trace('Error parsing json: ' + json);
  }
  return null;
}


////// fullscreen shim start //////

document.cancelFullScreen = document.webkitCancelFullScreen ||
document.mozCancelFullScreen || document.cancelFullScreen;

document.body.requestFullScreen = document.body.webkitRequestFullScreen ||
document.body.mozRequestFullScreen || document.body.requestFullScreen;

// document.onfullscreenchange = document.onwebkitfullscreenchange =
//   document.onmozfullscreenchange;

function isFullScreen(){
  return !!(document.webkitIsFullScreen || document.mozFullScreen ||
    document.isFullScreen); // if any defined and true
}

// function fullScreenElement(){
//   return document.webkitFullScreenElement || document.webkitCurrentFullScreenElement ||
//     document.mozFullScreenElement || document.fullScreenElement;
// }

////// fullscreen shim end ///////
