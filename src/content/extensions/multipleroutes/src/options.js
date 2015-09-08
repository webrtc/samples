// Saves options.
function save_options() {
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
function restore_options() {
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

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('multiRoutes').addEventListener('click', save_options);
document.getElementById('nonProxiedUdp').addEventListener('click',
  save_options);

document.title = chrome.i18n.getMessage('netli_options');
var i18nElements = document.querySelectorAll('*[i18n-content]');
for (var i = 0; i < i18nElements.length; i++) {
  var elem = i18nElements[i];
  var msg = elem.getAttribute('i18n-content');
  elem.innerHTML = chrome.i18n.getMessage(msg);
}
