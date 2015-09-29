'use strict';

// Saves options.
function saveOptions() {
  var multiRoutes;
  var nonProxiedUdp;
  var radios = document.getElementsByName('routeselection');
  for (var i = 0, length = radios.length; i < length; i++) {
    if (radios[i].checked) {
      // option 0: multiple routes enabled, non proxied udp enabled.
      // option 1: multiple routes disabled, non proxied upd enabled.
      // option 2: both are disabled.
      multiRoutes = i < 1;
      nonProxiedUdp = i < 2;
      break;
    }
  }

  chrome.privacy.network.webRTCMultipleRoutesEnabled.set({
    'value': multiRoutes
  });
  try {
    chrome.privacy.network.webRTCNonProxiedUdpEnabled.set({
      'value': nonProxiedUdp
    });
  } catch (err) {
    console.log('setting webRTCNonProxiedUdpEnabled is not supported.');
  }
}

function restoreRadios(multiRoutes, nonProxiedUdp) {
  var radios = document.getElementsByName('routeselection');
  if (multiRoutes) {
    if (nonProxiedUdp) {
      radios[0].checked = true;
    } else {
      radios[0].checked = false;
      alert(
        '{multiRoutes: true, nonProxiedUdp: false} is not a supported option.'
      );
    }
  } else {
    if (nonProxiedUdp) {
      radios[1].checked = true;
    } else {
      radios[2].checked = true;
    }
  }
}

// Restores checkbox states.
function restoreMultiRoutesOption() {
  var multiRoutes = true;
  chrome.privacy.network.webRTCMultipleRoutesEnabled.get({},
    function(details) {
      multiRoutes = details.value;
      restoreRadios(multiRoutes, true);
      restoreNonProxiedUdpOption(multiRoutes);
    });
}

function restoreNonProxiedUdpOption(multiRoutes) {
  try {
    var nonProxiedUdp = true;
    chrome.privacy.network.webRTCNonProxiedUdpEnabled.get({},
      function(details) {
        nonProxiedUdp = details.value;
        restoreRadios(multiRoutes, nonProxiedUdp);
        document.getElementById('for_multirouteOffUdpOff_notSupported').
          innerHTML = '';
      });
  } catch (err) {
    console.log(err);
    document.getElementById('multirouteOffUdpOff').disabled = true;
    document.getElementById('multirouteOffUdpOff_Section').style.color = 'gray';
    var chromeVersion = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
    document.getElementById('for_multirouteOffUdpOff_notSupported').innerHTML +=
      ' Current version is: ' + chromeVersion;
  }
}

document.addEventListener('DOMContentLoaded', restoreMultiRoutesOption);
document.getElementById('multirouteOnUdpOn').addEventListener('click',
  saveOptions);
document.getElementById('multirouteOffUdpOn').addEventListener('click',
  saveOptions);
document.getElementById('multirouteOffUdpOff').addEventListener('click',
  saveOptions);

document.title = chrome.i18n.getMessage('netli_options');
var i18nElements = document.querySelectorAll('*[i18n-content]');
for (var i = 0; i < i18nElements.length; i++) {
  var elem = i18nElements[i];
  var msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}
