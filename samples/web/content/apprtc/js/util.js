/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* exported requestTurnServers, sendAsyncUrlRequest, randomString, isChromeApp,
   getStorage, setStorage, pushRecentRoom, getRecentRooms */
/* globals chrome */

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
      if (turnTransports && turnTransports.length > 0) {
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
  for (var i = 0; i < urls.length; ) {
    var parts = urls[i].split('?');
    if (parts.length > 1 && parts[1] !== ('transport=' + protocol)) {
      urls.splice(i, 1);
    } else {
      ++i;
    }
  }
}

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

// Get a value from local browser storage. Calls callback with value.
function getStorage(key, callback) {
  if (isChromeApp()) {
    // use chrome.storage.local
    chrome.storage.local.get(key, function(values) {
      // unwrap key/value pair
      if (callback)
      {
        callback(values[key]);
      }
    });
  } else {
    // use localStorage
    var value = localStorage.getItem(key);
    if (callback) {
      callback(value);
    }
  }
}

// Set a value in local browser storage. Calls callback after completion.
function setStorage(key, value, callback) {
  if (isChromeApp()) {
    // use chrome.storage.local
    var data = {};
    data[key] = value;
    chrome.storage.local.set(data, callback);
  } else {
    // use localStorage
    localStorage.setItem(key, value);
    if (callback) {
      callback();
    }
  }
}

var recentRoomsKey = 'recentRooms';

// Add a room to the recently used list and store to local storage.
function pushRecentRoom(roomId) {
  // Push recent room to top of recent list, keep max of 10 entries.
  return new Promise(function(resolve, reject) {
    if (!roomId) {
      resolve();
      return;
    }
    
    getRecentRooms().then(function(recentRooms) {
      recentRooms = [roomId].concat(recentRooms);
      // Remove any duplicates from the list, leaving the first occurance.
      recentRooms = recentRooms.filter(function(value, index, self) {
        return self.indexOf(value) === index;
      });
      recentRooms = recentRooms.slice(0,9);
      setStorage(recentRoomsKey, JSON.stringify(recentRooms), function() {
        resolve();
      });
    }).catch(function(err) {
      reject(err);
    });
  });
}

// Get the list of recently used rooms from local storage.
function getRecentRooms() {
  return new Promise(function(resolve) {
    getStorage(recentRoomsKey, function(value) {
      var recentRooms = parseJSON(value);
      if (!recentRooms) {
        recentRooms = [];
      }
      resolve(recentRooms);
    });
  });
}
