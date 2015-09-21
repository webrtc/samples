// Saves options.
function saveOptions() {
  var multiRoutes;
  var nonProxiedUdp;
  var radios = document.getElementsByName('routeselection');
  for (var i = 0, length = radios.length; i < length; i++) {
    if (radios[i].checked) {
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
    // Shouldn't run into here.
  }
}

function restoreRadios(multiRoutes, nonProxiedUdp) {
  console.log(multiRoutes + ',' + nonProxiedUdp);
  var radios = document.getElementsByName('routeselection');
  if (multiRoutes) {
      if (nonProxiedUdp) {
          radios[0].checked = true;
      } else {
          radios[0].checked = false;
          alert('{multiRoutes: true, nonProxiedUdp: false} is not a supported option.');
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
function restoreOptions() {
  var multiRoutes = true;
  var nonProxiedUdp = true;
  chrome.privacy.network.webRTCMultipleRoutesEnabled.get({},
    function(details) {
      multiRoutes = details.value;
      restoreRadios(multiRoutes, nonProxiedUdp);
    });
  try {
    chrome.privacy.network.webRTCNonProxiedUdpEnabled.get({},
      function(details) {
        nonProxiedUdp = details.value;
        restoreRadios(multiRoutes, nonProxiedUdp);
      });
    document.getElementById('for_multirouteOffUdpOff_notSupported').innerHTML = "";
  } catch (err) {
    document.getElementById('multirouteOffUdpOff').disabled = true;
    var chromeVersion = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
    document.getElementById('for_multirouteOffUdpOff_notSupported').innerHTML += " Current Chrome Version: " + chromeVersion;
  }
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('multirouteOnUdpOn').addEventListener('click', saveOptions);
document.getElementById('multirouteOffUdpOn').addEventListener('click', saveOptions);
document.getElementById('multirouteOffUdpOff').addEventListener('click', saveOptions);

document.title = chrome.i18n.getMessage('netli_options');
var i18nElements = document.querySelectorAll('*[i18n-content]');
for (var i = 0; i < i18nElements.length; i++) {
  var elem = i18nElements[i];
  var msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}
