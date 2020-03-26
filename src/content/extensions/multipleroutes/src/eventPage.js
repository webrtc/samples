/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

// This file sets the policy when the extension is installed and registered for
// chrome.runtime.onInstalled event to convert the booleans in pre-M48 version
// to IPHandlingPolicy when chrome is upgraded to M48.

'use strict';

// If this is installed in a pre-M48 version of Chrome, the only thing to do
// here is to disable MultipleRoute.
const pn = chrome.privacy.network;
const pi = chrome.privacy.IPHandlingPolicy;

if (!browserSupportsIPHandlingPolicy()) {
  pn.webRTCMultipleRoutesEnabled.set({
    value: false
  });
}

// This function resets the 2 booleans to default values so we can ignore them
// as if they were not set in future chrome.runtime.onInstalled event. This is
// to avoid repeated conversions and overwrite the current setting.
function resetOldBooleans(callback) {
  pn.webRTCNonProxiedUdpEnabled.set({
    value: true
  }, function() {
    pn.webRTCMultipleRoutesEnabled.set({
      value: true
    }, function() {
      callback('Successfully reset the booleans');
    });
  });
}

// Converts the old booleans to the new policy in Preferences and resets the 2
// previous booleans to the default. Future chrome updates could trigger this
// function again but they will either stop the conversion if
// webRTCIPHandlingPolicy is not "default" or for the case of "default", since
// the previous booleans have been reset to default, it'll be translate to
// "default" again.
function convertBooleansToPolicy(isInstall, callback) {
  if (!browserSupportsIPHandlingPolicy()) {
    return;
  }

  pn.webRTCIPHandlingPolicy.get({}, function(details) {
    if (details.value !== chrome.privacy.IPHandlingPolicy.DEFAULT) {
      if (callback) {
        callback(
            'webRTCIPHandlingPolicy has a non-default value, stop now.'
        );
      }
      return;
    }

    getPolicyFromBooleans(function(policy) {
      if (policy === pi.DEFAULT && isInstall) {
        // It's safe to use the enum value here since
        // browserSupportsIPHandlingPolicy must be true.
        policy = pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
      }
      pn.webRTCIPHandlingPolicy.set({
        value: policy
      }, resetOldBooleans(callback));
    });
  });
}

function onInstall(details) {
  if (details.reason === 'install' /* extension is installed */ ||
    details.reason === 'update' /* extension is upgraded */ ||
    details.reason === 'chrome_update' /* chrome is upgraded */ ) {
    convertBooleansToPolicy(
        details.reason === 'install',
        function(status) {
          console.log(status);
        });
  }
}

chrome.runtime.onInstalled.addListener(onInstall);
