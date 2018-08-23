/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* exported getPolicyFromBooleans */

'use strict';

const pn = chrome.privacy.network;
let pi = null;

function browserSupportsIPHandlingPolicy() {
  return pn.webRTCIPHandlingPolicy !== undefined;
}

function browserSupportsNonProxiedUdpBoolean() {
  return pn.webRTCNonProxiedUdpEnabled !== undefined;
}

// Handle the case when this is installed in pre-M48.
if (!browserSupportsIPHandlingPolicy()) {
  chrome.privacy.IPHandlingPolicy = {};
  chrome.privacy.IPHandlingPolicy.DEFAULT = 0;
  chrome.privacy.IPHandlingPolicy.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES = 1;
  chrome.privacy.IPHandlingPolicy.DEFAULT_PUBLIC_INTERFACE_ONLY = 2;
  chrome.privacy.IPHandlingPolicy.DISABLE_NON_PROXIED_UDP = 3;
}

pi = chrome.privacy.IPHandlingPolicy;

// Helper function to convert the parameters to policy synchronously.
function convertToPolicy(allowMultiRoute, allowUdp) {
  if (!allowUdp) {
    return pi.DISABLE_NON_PROXIED_UDP;
  }

  if (!allowMultiRoute) {
    return pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
  }

  return pi.DEFAULT;
}

// This function just returns the new policy value based on the 2 booleans
// without changing any preferences.
// eslint-disable-next-line no-unused-vars
function getPolicyFromBooleans(callback) {
  pn.webRTCMultipleRoutesEnabled.get({}, function(allowMultiRoute) {
    if (!browserSupportsNonProxiedUdpBoolean()) {
      callback(convertToPolicy(allowMultiRoute.value, true));
    } else {
      pn.webRTCNonProxiedUdpEnabled.get({}, function(allowUdp) {
        callback(convertToPolicy(allowMultiRoute.value, allowUdp.value));
      });
    }
  });
}
