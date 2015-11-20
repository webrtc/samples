'use strict';

var pn = chrome.privacy.network;
var pi = chrome.privacy.IPHandlingPolicy;

// Handle the case when this is installed in pre-M48.
if (pn.webRTCIPHandlingPolicy == undefined) {
  pi = {};
  pi.DEFAULT = 0;
  pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES = 1;
  pi.DEFAULT_PUBLIC_INTERFACE_ONLY = 2;
  pi.DISABLE_NON_PROXIED_UDP = 3;
}

// Helper function to convert the parameters to policy synchronously.
function convertToPolicy(allow_multiroute, allow_udp, is_install) {
  if (allow_multiroute) {
    if (is_install && pn.webRTCIPHandlingPolicy != undefined) {
      // If we're installing the extension, we'll default to a more private
      // mode.
      return pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
    } else {
      return pi.DEFAULT;
    }
  } else {
    if (allow_udp) {
      return pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
    } else {
      return pi.DISABLE_NON_PROXIED_UDP;
    }
  }
}

// This function just returns the new policy value based on the 2 booleans
// without changing any preferences.
function getPolicyFromBooleans(is_install, callback) {
  pn.webRTCMultipleRoutesEnabled.get({}, function(detail_multi_route) {
    if (pn.webRTCNonProxiedUdpEnabled == undefined) {
      callback(convertToPolicy(detail_multi_route.value, true, is_install));
    } else {
      pn.webRTCNonProxiedUdpEnabled.get({}, function(detail_non_udp) {
        callback(convertToPolicy(detail_multi_route.value,
                                 detail_non_udp.value, is_install));
      });
    }
  });
}
