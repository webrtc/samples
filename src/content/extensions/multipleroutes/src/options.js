/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var pn = chrome.privacy.network;
var pi = chrome.privacy.IPHandlingPolicy;

var mapPolicyToRadioId = {};
mapPolicyToRadioId[pi.DEFAULT] = 0;
mapPolicyToRadioId[pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES] = 1;
mapPolicyToRadioId[pi.DEFAULT_PUBLIC_INTERFACE_ONLY] = 2;
mapPolicyToRadioId[pi.DISABLE_NON_PROXIED_UDP] = 3;

var mapRadioIdToPolicy = {};
if (!browserSupportsIPHandlingPolicy()) {
  // radio id => [|webRTCMultipleRoutesEnabled|, |webRTCNonProxiedUdpEnabled|]
  // The [1] option won't exist if pn.webRTCIPHandlingPolicy is undefined.
  mapRadioIdToPolicy[0] = {allowMultipleRoutes: true, allowUdp: true};
  mapRadioIdToPolicy[2] = {allowMultipleRoutes: false, allowUdp: true};
  mapRadioIdToPolicy[3] = {allowMultipleRoutes: false, allowUdp: false};
} else {
  mapRadioIdToPolicy[0] = pi.DEFAULT;
  mapRadioIdToPolicy[1] = pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
  mapRadioIdToPolicy[2] = pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
  mapRadioIdToPolicy[3] = pi.DISABLE_NON_PROXIED_UDP;
}

// Saves options.
function saveOptions() {
  var radios = document.getElementsByName('ip_policy_selection');
  for (var i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      break;
    }
  }

  if (browserSupportsIPHandlingPolicy()) {
    pn.webRTCIPHandlingPolicy.set({
      value: mapRadioIdToPolicy[i]
    });
  } else {
    var oldBools = mapRadioIdToPolicy[i];
    pn.webRTCMultipleRoutesEnabled.set({
      value: oldBools.allowMultipleRoutes
    }, function() {
      if (browserSupportsNonProxiedUdpBoolean()) {
        pn.webRTCNonProxiedUdpEnabled.set({
          value: oldBools.allowUdp
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
  if (browserSupportsIPHandlingPolicy()) {
    pn.webRTCIPHandlingPolicy.get({}, function(details) {
      restoreRadios(details.value);
    });
  } else {
    getPolicyFromBooleans(function(policy) {
      restoreRadios(policy);
    });
  }
}

var supportedIPPolicyModes = {
  // DEFAULT
  Mode0: true,
  // DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES
  Mode1: browserSupportsIPHandlingPolicy(),
  // DEFAULT_PUBLIC_INTERFACE_ONLY
  Mode2: true,
  // NON_PROXIED_UDP
  Mode3: browserSupportsNonProxiedUdpBoolean()
};

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
var i18nElements = document.querySelectorAll('*[i18n-content]');
for (var i = 0; i < i18nElements.length; i++) {
  var elem = i18nElements[i];
  var msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}

var hideBanner = true;
for (i = 0; i < Object.keys(supportedIPPolicyModes).length; i++) {
  var key = 'Mode' + i;
  if (!supportedIPPolicyModes[key]) {
    var section = document.getElementById(key);
    section.style.color = 'gray';
    section.querySelector('input').disabled = true;
    hideBanner = false;
  }
}

if (hideBanner) {
  document.getElementById('not_supported').innerHTML = '';
}
