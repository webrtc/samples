'use strict';

// This file sets the policy when the extension is installed and registered for
// chrome.runtime.onInstalled event to convert the booleans in pre-M48 version
// to IPHandlingPolicy when chrome is upgraded to M48.

// If this is installed in a pre-M48 version of Chrome, the only thing to do here
// is to disable MultipleRoute.
var pn = chrome.privacy.network;
if (pn.webRTCIPHandlingPolicy === undefined) {
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
      if (callback) {
        callback('Successfully reset the boolean');
      }
    });
  });
}

// Converts the old booleans to the new policy in Preferences and restores the 2
// previous booleans to the default. Future chrome updates could trigger this
// function again but they will either stop the conversion if
// webRTCIPHandlingPolicy is not "default" or for the case of "default", since
// the previous booleans have been restored to default, it'll be translate to
// "default" again.
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
