/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* exported setUpFullScreen, fullScreenElement, isFullScreen,
   requestTurnServers, sendAsyncUrlRequest, randomString */
/* globals chrome */

'use strict';

// Sends the URL request and returns a Promise as the result.
function sendAsyncUrlRequest(method, url, body) {
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
    xhr.send(body);
  });
}

// Returns a list of turn servers after requesting it from CEOD.
function requestTurnServers(turnRequestUrl, turnTransports) {
  return new Promise(function(resolve, reject) {
    sendAsyncUrlRequest('GET', turnRequestUrl).then(function(response) {
      var turnServerResponse = parseJSON(response);
      if (!turnServerResponse) {
        reject(Error('Error parsing response JSON: ' + response));
        return;
      }
      // Filter the TURN URLs to only use the desired transport, if specified.
      if (turnTransports.length > 0) {
        filterTurnUrls(turnServerResponse.uris, turnTransports);
      }

      // Create the RTCIceServer objects from the response.
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

// Parse the supplied JSON, or return null if parsing fails.
function parseJSON(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    trace('Error parsing json: ' + json);
  }
  return null;
}

// Filter a list of TURN urls to only contain those with transport=|protocol|.
function filterTurnUrls(urls, protocol) {
  for (var i = 0; i < urls.length;) {
    var parts = urls[i].split('?');
    if (parts.length > 1 && parts[1] !== ('transport=' + protocol)) {
      urls.splice(i, 1);
    } else {
      ++i;
    }
  }
}

// Start shims for fullscreen
function setUpFullScreen() {
  if (isChromeApp()) {
    document.cancelFullScreen = function() {
      chrome.app.window.current().restore();
    };
  } else {
    document.cancelFullScreen = document.webkitCancelFullScreen ||
        document.mozCancelFullScreen || document.cancelFullScreen;
  }

  if (isChromeApp()) {
    document.body.requestFullScreen = function() {
      chrome.app.window.current().fullscreen();
    };
  } else {
    document.body.requestFullScreen = document.body.webkitRequestFullScreen ||
        document.body.mozRequestFullScreen || document.body.requestFullScreen;
  }

  document.onfullscreenchange = document.onfullscreenchange ||
        document.onwebkitfullscreenchange || document.onmozfullscreenchange;
}

function isFullScreen() {
  if (isChromeApp()) {
    return chrome.app.window.current().isFullscreen();
  }

  return !!(document.webkitIsFullScreen || document.mozFullScreen ||
    document.isFullScreen); // if any defined and true
}

function fullScreenElement() {
  return document.webkitFullScreenElement ||
      document.webkitCurrentFullScreenElement ||
      document.mozFullScreenElement ||
      document.fullScreenElement;
}

// End shims for fullscreen

// Return a random numerical string.
function randomString(strLength) {
  var result = [];
  strLength = strLength || 5;
  var charSet = '0123456789';
  while (strLength--) {
    result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
  }
  return result.join('');
}

// Returns true if the code is running in a packaged Chrome App.
function isChromeApp() {
  return (typeof chrome !== 'undefined' &&
          typeof chrome.storage !== 'undefined' &&
          typeof chrome.storage.local !== 'undefined');
}
