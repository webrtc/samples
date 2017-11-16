(function() {
  var adapterURL = localStorage.alternativeAdapterVersion
    ? 'https://cdnjs.cloudflare.com/ajax/libs/webrtc-adapter/' + localStorage.alternativeAdapterVersion + '/adapter.min.js'
    : 'https://webrtc.github.io/adapter/adapter-latest.js';

  document.write('<script src="' + adapterURL + '"></script>');

  var versionName = localStorage.alternativeAdapterVersion || 'latest';
  var selectNode = document.createElement('select');
  var firstOptionNode = document.createElement('option');
  firstOptionNode.appendChild(
    document.createTextNode(versionName + '; Select different webrtc-adapter version...')
  );
  selectNode.className = 'versionselector';
  selectNode.appendChild(firstOptionNode);

  selectNode.onclick = function(e) {
    selectNode.blur();
    selectNode.onclick = undefined;
    function errorHandler() {
      firstOptionNode.appendChild(
        document.createTextNode('Loading failed.')
      );
    }
    var request = new XMLHttpRequest();
    request.open('GET', 'https://api.cdnjs.com/libraries/webrtc-adapter', true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        var assets = JSON.parse(request.responseText).assets;
        
        [{ version: 'latest', value: '' }]
        .concat(assets)
        .forEach(function(asset) {
          var newOption = document.createElement('option');
          newOption.value = asset.value || asset.version;
          if (asset.version === (localStorage.alternativeAdapterVersion || 'latest')) {
            newOption.selected = true;
          }
          newOption.appendChild(
            document.createTextNode(asset.version)
          );
          selectNode.appendChild(newOption);
        });

        selectNode.onchange = function(event) {
          localStorage.alternativeAdapterVersion = event.target.value || '';
          window.location.reload();
        };  
      } else {
        errorHandler();
      }
    };
    request.onerror = errorHandler;

    request.send();
  };

  document.getElementById('container').appendChild(selectNode);
})();
