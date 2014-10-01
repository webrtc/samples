var extensionInstalled = false;

document.getElementById('start').addEventListener('click', function() {
  // send screen-sharer request to content-script
  if (!extensionInstalled){
    var message = 'Please install the extension:\n' +
                  '1. Go to chrome://extensions\n' +
                  '2. Check: "Enable Developer mode"\n' +
                  '3. Click: "Load the unpacked extension..."\n' +
                  '4. Choose "extension" folder from the repository\n' +
                  '5. Reload this page';
    alert(message);
  }
  window.postMessage({ type: 'SS_UI_REQUEST', text: 'start' }, '*');
});

// listen for messages from the content-script
window.addEventListener('message', function (event) {
  if (event.origin != window.location.origin) return;

  // content-script will send a 'SS_PING' msg if extension is installed
  if (event.data.type && (event.data.type === 'SS_PING')) {
    extensionInstalled = true;
  }

  // user chose a stream
  if (event.data.type && (event.data.type === 'SS_DIALOG_SUCCESS')) {
    startScreenStreamFrom(event.data.streamId);
  }

  // user clicked on 'cancel' in choose media dialog
  if (event.data.type && (event.data.type === 'SS_DIALOG_CANCEL')) {
    console.log('User cancelled!');
  }
});

function startScreenStreamFrom(streamId) {
  navigator.webkitGetUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        maxWidth: window.screen.width,
        maxHeight: window.screen.height
      }
    }
  },
  // successCallback
  function(screenStream) {
    videoElement = document.getElementById('video');
    videoElement.src = URL.createObjectURL(screenStream);
    videoElement.play();
  },
  // errorCallback
  function(err) {
    console.log('getUserMedia failed!: ' + err);
  });
}
