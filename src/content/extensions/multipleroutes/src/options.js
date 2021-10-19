/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const pn = chrome.privacy.network;
const pi = chrome.privacy.IPHandlingPolicy;

const mapPolicyToRadioId = {};
mapPolicyToRadioId[pi.DEFAULT] = 0;
mapPolicyToRadioId[pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES] = 1;
mapPolicyToRadioId[pi.DEFAULT_PUBLIC_INTERFACE_ONLY] = 2;
mapPolicyToRadioId[pi.DISABLE_NON_PROXIED_UDP] = 3;

const mapRadioIdToPolicy = {};
mapRadioIdToPolicy[0] = pi.DEFAULT;
mapRadioIdToPolicy[1] = pi.DEFAULT_PUBLIC_AND_PRIVATE_INTERFACES;
mapRadioIdToPolicy[2] = pi.DEFAULT_PUBLIC_INTERFACE_ONLY;
mapRadioIdToPolicy[3] = pi.DISABLE_NON_PROXIED_UDP;

// Saves options.
function saveOptions() {
  const radios = document.getElementsByName('ip_policy_selection');
  let i;
  for (i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      break;
    }
  }

  pn.webRTCIPHandlingPolicy.set({
    value: mapRadioIdToPolicy[i]
  });
}

function restoreRadios(policy) {
  const radios = document.getElementsByName('ip_policy_selection');
  radios[mapPolicyToRadioId[policy]].checked = true;
}

function restoreOption() {
  pn.webRTCIPHandlingPolicy.get({}, function(details) {
    restoreRadios(details.value);
  });
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
const i18nElements = document.querySelectorAll('*[i18n-content]');
for (let i = 0; i < i18nElements.length; i++) {
  const elem = i18nElements[i];
  const msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}

function browserSupportsIPHandlingPolicy() {
  return pn.webRTCIPHandlingPolicy !== undefined;
}

if (browserSupportsIPHandlingPolicy()) {
  // Hide the 'not supported' banner.
  document.getElementById('not_supported').innerHTML = '';
} else {
  // Disable all options.
  for (let i = 0; i < 4; i++) {
    const key = 'Mode' + i;
    const section = document.getElementById(key);
    section.style.color = 'gray';
    section.querySelector('input').disabled = true;
  }
}
