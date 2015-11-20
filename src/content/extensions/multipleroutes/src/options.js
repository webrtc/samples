'use strict';

var pn = chrome.privacy.network;
var pi = chrome.privacy.IPHandlingPolicy;

var mapPolicyToRadioId = {};
mapPolicyToRadioId[pi.DEFAULT] = 0;
mapPolicyToRadioId[pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES] = 1;
mapPolicyToRadioId[pi.DEFAULT_PUBLIC_INTERFACE_ONLY] = 2;
mapPolicyToRadioId[pi.DISABLE_NON_PROXIED_UDP] = 3;

var mapRadioIdToPolicy = {};
if (pn.webRTCIPHandlingPolicy === undefined) {
  // radio id => [|webRTCMultipleRoutesEnabled|, |webRTCNonProxiedUdpEnabled|]
  // The [1] option won't exist if pn.webRTCIPHandlingPolicy is undefined.
  mapRadioIdToPolicy[0] = [true, true];
  mapRadioIdToPolicy[2] = [false, true];
  mapRadioIdToPolicy[3] = [false, false];
} else {
  mapRadioIdToPolicy[0] = pi.DEFAULT;
  mapRadioIdToPolicy[1] = pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
  mapRadioIdToPolicy[2] = pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
  mapRadioIdToPolicy[3] = pi.DISABLE_NON_PROXIED_UDP;
}

// Saves options.
function saveOptions() {
  var radios = document.getElementsByName('ip_policy_selection');
  var i = 0;
  for (; i < radios.length; i++) {
    if (radios[i].checked) {
      break;
    }
  }

  if (pn.webRTCIPHandlingPolicy !== undefined) {
    pn.webRTCIPHandlingPolicy.set({
      value: mapRadioIdToPolicy[i]
    });
  } else {
    var mapping = mapRadioIdToPolicy[i];
    pn.webRTCMultipleRoutesEnabled.set({
      value: mapping[0]
    }, function() {
      if (pn.webRTCNonProxiedUdpEnabled !== undefined) {
        pn.webRTCNonProxiedUdpEnabled.set({
          value: mapping[1]
        });
      }
    });
  }
}

function restoreRadios(policy) {
  var radios = document.getElementsByName('ip_policy_selection');
  radios[mapPolicyToRadioId[policy]].checked = true;
}

function restoreOption() {
  if (pn.webRTCIPHandlingPolicy !== undefined) {
    pn.webRTCIPHandlingPolicy.get({}, function(details) {
      restoreRadios(details.value);
    });
  } else {
    getPolicyFromBooleans(false, function(policy) {
      restoreRadios(policy);
    });
  }
}

// Returns the supported modes in the UI option.
function getSupportedModes() {
  if (pn.webRTCNonProxiedUdpEnabled === undefined) {
    return [true, false, true, false];
  }
  if (pn.webRTCIPHandlingPolicy === undefined) {
    return [true, false, true, true];
  }
  return [true, true, true, true];
}

document.addEventListener('DOMContentLoaded', restoreOption);
document.getElementById('default').
  addEventListener('click', saveOptions);
document.getElementById('default_public_and_private_interfaces').
  addEventListener('click', saveOptions);
document.getElementById('default_public_interface_only').
  addEventListener('click', saveOptions);
document.getElementById('disable_non_proxied_udp').
  addEventListener('click', saveOptions);

document.title = chrome.i18n.getMessage('netli_options');
var i = 0;
var i18nElements = document.querySelectorAll('*[i18n-content]');
for (i = 0; i < i18nElements.length; i++) {
  var elem = i18nElements[i];
  var msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}

var modes = getSupportedModes();
var hideBanner = true;
for (i = 0; i < modes.length; i++) {
  if (!modes[i]) {
    var section = document.getElementById('Mode' + i);
    section.style.color = 'gray';
    section.querySelector('input').disabled = true;
    hideBanner = false;
  }
}

if (hideBanner) {
  document.getElementById('not_supported').innerHTML = '';
}
