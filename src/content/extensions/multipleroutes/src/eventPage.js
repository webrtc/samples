'use strict';

// If this is installed in a pre-48 version of Chrome, the only thing to do here
// is to disable MultipleRoute.
var pn = chrome.privacy.network;
if (pn.webRTCIPHandlingPolicy === undefined) {
  pn.webRTCMultipleRoutesEnabled.set({
    value: false
  });
}

// This function resets the 2 booleans to default values so we can ignore them
// as if they were not set. This is to avoid repeated conversions and overwrite
// the current setting.
function resetOldBooleans(callback) {
  pn.webRTCNonProxiedUdpEnabled.set({
    value: true
  }, function() {
    pn.webRTCMultipleRoutesEnabled.set({
      value: true
    }, function() {
      if (callback) {
        callback('Successfully reset the boolean');
      }
    });
  });
}

// Converts the old booleans to the new policy in Preferences and restores the 2
// previous booleans to the default. Future chrome updates could trigger this
// function again but they will either stop the conversion if
// webRTCIPHandlingPolicy is not "default" or translate the booleans to the new
// policy.
function convertBooleansToPolicy(isInstall, callback) {
  if (pn.webRTCIPHandlingPolicy === undefined) {
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

    getPolicyFromBooleans(isInstall, function(policy) {
      pn.webRTCIPHandlingPolicy.set({
        value: policy
      }, resetOldBooleans(callback));
    });
  });
}

function onInstall(details) {
  if (details.reason === 'install' /* extension is installed*/ ||
    details.reason === 'update' /* extension is upgraded */ ||
    details.reason === 'chrome_update' /* chrome is upgraded*/ ) {
    convertBooleansToPolicy(
      details.reason === 'install',
      function(status) {
        console.log(status);
      });
  }
}

chrome.runtime.onInstalled.addListener(onInstall);
