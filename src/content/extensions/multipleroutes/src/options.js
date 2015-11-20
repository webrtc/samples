'use strict';

var pn = chrome.privacy.network;
var pi = chrome.privacy.IPHandlingPolicy;

var map_policy_to_radio_id = {};
map_policy_to_radio_id[pi.DEFAULT] = 0;
map_policy_to_radio_id[pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES] =  1;
map_policy_to_radio_id[pi.DEFAULT_PUBLIC_INTERFACE_ONLY] =  2;
map_policy_to_radio_id[pi.DISABLE_NON_PROXIED_UDP] =  3;

var map_radio_id_to_policy = {};
if (pn.webRTCIPHandlingPolicy == undefined) {
  // radio id => [|webRTCMultipleRoutesEnabled|, |webRTCNonProxiedUdpEnabled|]
  // The [1] option doens't exist if pn.webRTCIPHandlingPolicy is undefined.
  map_radio_id_to_policy[0] = [true, true];
  map_radio_id_to_policy[2] = [false, true];
  map_radio_id_to_policy[3] = [false, false];
} else {
  map_radio_id_to_policy[0] = pi.DEFAULT;
  map_radio_id_to_policy[1] = pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
  map_radio_id_to_policy[2] = pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
  map_radio_id_to_policy[3] = pi.DISABLE_NON_PROXIED_UDP;
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

  if (pn.webRTCIPHandlingPolicy != undefined) {
    pn.webRTCIPHandlingPolicy.set({
      value: map_radio_id_to_policy[i]
    });
  } else {
    var mapping = map_radio_id_to_policy[i];
    pn.webRTCMultipleRoutesEnabled.set({
      value: mapping[0]
    }, function() {
      if (pn.webRTCNonProxiedUdpEnabled != undefined) {
        pn.webRTCNonProxiedUdpEnabled.set({
          value: mapping[1]
        });
      }
    });
  }
}

function restoreRadios(policy) {
  var radios = document.getElementsByName('ip_policy_selection');
  radios[map_policy_to_radio_id[policy]].checked = true;
}

function restoreOption() {
  if (pn.webRTCIPHandlingPolicy != undefined) {
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
  if (pn.webRTCNonProxiedUdpEnabled == undefined) {
    return [true, false, true, false];
  }
  if (pn.webRTCIPHandlingPolicy == undefined) {
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
  addEventListener('click',  saveOptions);
document.getElementById('disable_non_proxied_udp').
  addEventListener('click', saveOptions);

document.title = chrome.i18n.getMessage('netli_options');
var i18nElements = document.querySelectorAll('*[i18n-content]');
for (var i = 0; i < i18nElements.length; i++) {
  var elem = i18nElements[i];
  var msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}

var modes = getSupportedModes();
var hide_banner = true;
for (var i = 0; i < modes.length; i++) {
  if (!modes[i]) {
    var section = document.getElementById('Mode' + i);
    section.style.color = 'gray';
    section.querySelector('input').disabled = true;
    hide_banner = false;
  }
}

if (hide_banner) {
  document.getElementById('not_supported').innerHTML = "";
}
