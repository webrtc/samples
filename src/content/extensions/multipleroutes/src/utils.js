'use strict';

var pn = chrome.privacy.network;
var pi = chrome.privacy.IPHandlingPolicy;

// Handle the case when this is installed in pre-M48.
if (pn.webRTCIPHandlingPolicy === undefined) {
  pi = {};
  pi.DEFAULT = 0;
  pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES = 1;
  pi.DEFAULT_PUBLIC_INTERFACE_ONLY = 2;
  pi.DISABLE_NON_PROXIED_UDP = 3;
}

// Helper function to convert the parameters to policy synchronously.
function convertToPolicy(allowMultiRoute, allowUdp, isInstall) {
  if (allowMultiRoute) {
    if (isInstall && pn.webRTCIPHandlingPolicy !== undefined) {
      // If we're installing the extension, we'll default to a more private
      // mode.
      return pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
    } else {
      return pi.DEFAULT;
    }
  } else {
    if (allowUdp) {
      return pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
    } else {
      return pi.DISABLE_NON_PROXIED_UDP;
    }
  }
}

// This function just returns the new policy value based on the 2 booleans
// without changing any preferences.
function getPolicyFromBooleans(isInstall, callback) {
  pn.webRTCMultipleRoutesEnabled.get({}, function(allowMultiRoute) {
    if (pn.webRTCNonProxiedUdpEnabled === undefined) {
      callback(convertToPolicy(allowMultiRoute.value, true, isInstall));
    } else {
      pn.webRTCNonProxiedUdpEnabled.get({}, function(allowUdp) {
        callback(convertToPolicy(detail_multi_route.value,
                                 allowUdp.value, isInstall));
      });
    }
  });
}
