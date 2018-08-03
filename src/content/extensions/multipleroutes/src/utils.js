/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* exported getPolicyFromBooleans */

'use strict';

function browserSupportsIPHandlingPolicy() {
  return chrome.privacy.network.webRTCIPHandlingPolicy !== undefined;
}

function browserSupportsNonProxiedUdpBoolean() {
  return chrome.privacy.network.webRTCNonProxiedUdpEnabled !== undefined;
}

// Handle the case when this is installed in pre-M48.
if (!browserSupportsIPHandlingPolicy()) {
  chrome.privacy.IPHandlingPolicy = {};
  chrome.privacy.IPHandlingPolicy.DEFAULT = 0;
  chrome.privacy.IPHandlingPolicy.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES = 1;
  chrome.privacy.IPHandlingPolicy.DEFAULT_PUBLIC_INTERFACE_ONLY = 2;
  chrome.privacy.IPHandlingPolicy.DISABLE_NON_PROXIED_UDP = 3;
}

// Helper function to convert the parameters to policy synchronously.
function convertToPolicy(allowMultiRoute, allowUdp) {
  if (!allowUdp) {
    return chrome.privacy.IPHandlingPolicy.DISABLE_NON_PROXIED_UDP;
  }

  if (!allowMultiRoute) {
    return chrome.privacy.IPHandlingPolicy.DEFAULT_PUBLIC_INTERFACE_ONLY;
  }

  return chrome.privacy.IPHandlingPolicy.DEFAULT;
}

// This function just returns the new policy value based on the 2 booleans
// without changing any preferences.
// eslint-disable-next-line no-unused-vars
function getPolicyFromBooleans(callback) {
  chrome.privacy.network.webRTCMultipleRoutesEnabled.get({}, function(allowMultiRoute) {
    if (!browserSupportsNonProxiedUdpBoolean()) {
      callback(convertToPolicy(allowMultiRoute.value, true));
    } else {
      chrome.privacy.network.webRTCNonProxiedUdpEnabled.get({}, function(allowUdp) {
        callback(convertToPolicy(allowMultiRoute.value, allowUdp.value));
      });
    }
  });
}
