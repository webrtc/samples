// Saves options.
function saveOptions() {
  var multiRoutes = document.getElementById('multiRoutes').checked;
  var nonProxiedUdp = document.getElementById('nonProxiedUdp').checked;
  chrome.privacy.network.webRTCMultipleRoutesEnabled.set({
    'value': multiRoutes
  });
  try {
    chrome.privacy.network.webRTCNonProxiedUdpEnabled.set({
      'value': nonProxiedUdp
    });
  } catch (err) {
    document.getElementById('nonProxiedUdp').checked = false;
    document.getElementById('nonProxiedUdp').disabled = true;
  }
}

// Restores checkbox states.
function restoreOptions() {
  chrome.privacy.network.webRTCMultipleRoutesEnabled.get({},
    function(details) {
      document.getElementById('multiRoutes').checked =
        details.value;
    });
  try {
    chrome.privacy.network.webRTCNonProxiedUdpEnabled.get({},
      function(
        details) {
        document.getElementById('nonProxiedUdp').checked =
          details.value;
      });
  } catch (err) {
    document.getElementById('nonProxiedUdp').checked = false;
    document.getElementById('nonProxiedUdp').disabled = true;
  }
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('multiRoutes').addEventListener('click', saveOptions);
document.getElementById('nonProxiedUdp').addEventListener('click',
  saveOptions);

document.title = chrome.i18n.getMessage('netli_options');
var i18nElements = document.querySelectorAll('*[i18n-content]');
for (var i = 0; i < i18nElements.length; i++) {
  var elem = i18nElements[i];
  var msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}
