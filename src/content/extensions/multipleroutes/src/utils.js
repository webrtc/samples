'use strict';

var pn = chrome.privacy.network;
var pi = null;

// Handle the case when this is installed in pre-M48.
if (pn.webRTCIPHandlingPolicy === undefined) {
  chrome.privacy.IPHandlingPolicy = {};
  chrome.privacy.IPHandlingPolicy.DEFAULT = 0;
  chrome.privacy.IPHandlingPolicy.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES = 1;
  chrome.privacy.IPHandlingPolicy.DEFAULT_PUBLIC_INTERFACE_ONLY = 2;
  chrome.privacy.IPHandlingPolicy.DISABLE_NON_PROXIED_UDP = 3;
}

pi = chrome.privacy.IPHandlingPolicy;

// Helper function to convert the parameters to policy synchronously.
function convertToPolicy(allowMultiRoute, allowUdp, isInstall) {
  if (allowMultiRoute) {
    if (isInstall && pn.webRTCIPHandlingPolicy !== undefined) {
      // If we're installing the extension, we'll default to a more private
      // mode.
      return pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
    }
    return pi.DEFAULT;
  }

  if (allowUdp) {
    return pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
  }

  return pi.DISABLE_NON_PROXIED_UDP;
}

// This function just returns the new policy value based on the 2 booleans
// without changing any preferences.
getPolicyFromBooleans = function(isInstall, callback) {
  pn.webRTCMultipleRoutesEnabled.get({}, function(allowMultiRoute) {
    if (pn.webRTCNonProxiedUdpEnabled === undefined) {
      callback(convertToPolicy(allowMultiRoute.value, true, isInstall));
    } else {
      pn.webRTCNonProxiedUdpEnabled.get({}, function(allowUdp) {
        callback(convertToPolicy(allowMultiRoute.value,
                                 allowUdp.value, isInstall));
      });
    }
  });
};
