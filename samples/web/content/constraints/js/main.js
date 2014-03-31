var getMediaButton = document.querySelector('button#getMedia');
var connectButton = document.querySelector('button#connect');

getMediaButton.onclick = getMedia;
connectButton.onclick = createPeerConnection;

var minWidthInput = document.querySelector('div#minWidth input');
var maxWidthInput = document.querySelector('div#maxWidth input');
var minHeightInput = document.querySelector('div#minHeight input');
var maxHeightInput = document.querySelector('div#maxHeight input');
var framerateInput = document.querySelector('div#framerate input');
var maxBitrateInput = document.querySelector('div#maxBitrate input');

minWidthInput.onchange = maxWidthInput.onchange =
  minHeightInput.onchange = maxHeightInput.onchange =
  framerateInput.onchange = maxBitrateInput.onchange =
  displayRangeValue;

var getUserMediaConstraintsDiv = document.querySelector('div#getUserMediaConstraints');
var addStreamConstraintsDiv = document.querySelector('div#addStreamConstraints');
var bitrateDiv = document.querySelector('div#bitrate');
var senderStatsDiv = document.querySelector('div#senderStats');
var receiverStatsDiv = document.querySelector('div#receiverStats');

var localVideo = document.querySelector('div#localVideo video');
var remoteVideo = document.querySelector('div#remoteVideo video');
var localVideoStatsDiv = document.querySelector('div#localVideo div');
var remoteVideoStatsDiv = document.querySelector('div#remoteVideo div');

var localPeerConnection, remotePeerConnection;
var localStream;
var bytesPrev = 0;
var timestampPrev = 0;

main();

function main() {
  displayGetUserMediaConstraints();
  displayAddStreamConstraints();
}

function getMedia() {
  connectButton.disabled = true;
  if (localStream) {
    localStream.stop();
  }
  getUserMedia(getUserMediaConstraints(), gotStream,
    function (e) {
      var message = 'getUserMedia error: ' + e.name + '\n' +
        'PermissionDeniedError may mean invalid constraints.';
      alert(message);
      console.log(message);
    });
}

function gotStream(stream) {
  connectButton.disabled = false;
  console.log('GetUserMedia succeeded');
  localStream = stream;
  attachMediaStream(localVideo, stream);
}

function getUserMediaConstraints() {
  var constraints = {};
  constraints.audio = true;
  constraints.video = {
    mandatory: {},
    optional: []
  };
  var mandatory = constraints.video.mandatory;
  if (minWidthInput.value !== '0') {
    mandatory.minWidth = minWidthInput.value;
  }
  if (maxWidthInput.value !== '0') {
    mandatory.maxWidth = maxWidthInput.value;
  }
  if (minHeightInput.value !== '0') {
    mandatory.minHeight = minHeightInput.value;
  }
  if (maxHeightInput.value !== '0') {
    mandatory.maxHeight = maxHeightInput.value;
  }
  if (framerateInput.value !== '0') {
    mandatory.minFramerate = framerateInput.value;
  }
  return constraints;
}

function displayGetUserMediaConstraints() {
  var constraints = getUserMediaConstraints();
  console.log('getUserMedia constraints', constraints);
  getUserMediaConstraintsDiv.textContent =
    JSON.stringify(constraints, null, '    ');
}

function addStreamConstraints() {
  var constraints = {
    mandatory: {},
    optional: []
  };
  var maxBitrate = maxBitrateInput.value;
  if (maxBitrate !== '0') {
    constraints.optional[0] = {
      'bandwidth': maxBitrate
    };
  }
  return constraints;
}

function displayAddStreamConstraints() {
  var constraints = addStreamConstraints();
  console.log('addStream() constraints', constraints);
  addStreamConstraintsDiv.textContent =
    JSON.stringify(constraints, null, '    ');
}

function createPeerConnection() {
  localPeerConnection = new RTCPeerConnection(null);
  remotePeerConnection = new RTCPeerConnection(null);
  localPeerConnection.addStream(localStream, addStreamConstraints());
  console.log('localPeerConnection creating offer');
  localPeerConnection.onnegotiationeeded = function () {
    console.log('Negotiation needed - localPeerConnection');
  };
  remotePeerConnection.onnegotiationeeded = function () {
    console.log('Negotiation needed - remotePeerConnection');
  };
  localPeerConnection.onicecandidate = function (e) {
    console.log('Candidate localPeerConnection');
    if (e.candidate) {
      remotePeerConnection.addIceCandidate(new RTCIceCandidate(e.candidate),
        onAddIceCandidateSuccess, onAddIceCandidateError);
    }
  };
  remotePeerConnection.onicecandidate = function (e) {
    console.log('Candidate remotePeerConnection');
    if (e.candidate) {
      var newCandidate = new RTCIceCandidate(e.candidate);
      localPeerConnection.addIceCandidate(newCandidate, onAddIceCandidateSuccess, onAddIceCandidateError);
    }
  };
  remotePeerConnection.onaddstream = function (e) {
    console.log('remotePeerConnection got stream');
    attachMediaStream(remoteVideo, e.stream);
    console.log('Remote video is ' + remoteVideo.src);
  };
  localPeerConnection.createOffer(function (desc) {
    console.log('localPeerConnection offering');
    localPeerConnection.setLocalDescription(desc);
    remotePeerConnection.setRemoteDescription(desc);
    remotePeerConnection.createAnswer(function (desc2) {
      console.log('remotePeerConnection answering');
      remotePeerConnection.setLocalDescription(desc2);
      localPeerConnection.setRemoteDescription(desc2);
    });
  });
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

// Augumentation of stats entries with utility functions.
// The augumented entry does what the stats entry does, but adds
// utility functions.
function AugumentedStatsResponse(response) {
  this.response = response;
  this.addressPairMap = [];
}

AugumentedStatsResponse.prototype.collectAddressPairs = function (componentId) {
  if (!this.addressPairMap[componentId]) {
    this.addressPairMap[componentId] = [];
    for (var i = 0; i < this.response.result().length; ++i) {
      var res = this.response.result()[i];
      if (res.type === 'googCandidatePair' &&
        res.stat('googChannelId') === componentId) {
        this.addressPairMap[componentId].push(res);
      }
    }
  }
  return this.addressPairMap[componentId];
};

AugumentedStatsResponse.prototype.result = function () {
  return this.response.result();
};

// The indexed getter isn't easy to prototype.
AugumentedStatsResponse.prototype.get = function (key) {
  return this.response[key];
};


// Display statistics
setInterval(function () {
  var display = function (string) {
    bitrateDiv.innerHTML = '<strong>Bitrate:</strong> ' + string;
  };

  //  display('No stream');
  if (remotePeerConnection && remotePeerConnection.getRemoteStreams()[0]) {
    if (remotePeerConnection.getStats) {
      remotePeerConnection.getStats(function (rawStats) {
        var stats = new AugumentedStatsResponse(rawStats);
        var statsString = '';
        var results = stats.result();
        var videoFlowInfo = 'No bitrate stats';
        for (var i = 0; i < results.length; ++i) {
          var res = results[i];
          statsString += '<h3>Report ';
          statsString += i;
          statsString += '</h3>';
          if (!res.local || res.local === res) {
            statsString += dumpStats(res);
            // The bandwidth info for video is in a type ssrc stats record
            // with googFrameHeightReceived defined.
            // Should check for mediatype = video, but this is not
            // implemented yet.
            if (res.type === 'ssrc' && res.stat('googFrameHeightReceived')) {
              // This is the video flow.
              videoFlowInfo = extractVideoFlowInfo(res, stats);
            }
          } else {
            // Pre-227.0.1445 (188719) browser
            if (res.local) {
              statsString += '<p>Local ';
              statsString += dumpStats(res.local);
            }
            if (res.remote) {
              statsString += '<p>Remote ';
              statsString += dumpStats(res.remote);
            }
          }
        }
        receiverStatsDiv.innerHTML =
          '<h2>Receiver stats</h2>' + statsString;
        display(videoFlowInfo);
      });
      localPeerConnection.getStats(function (stats) {
        var statsString = '';
        var results = stats.result();
        for (var i = 0; i < results.length; ++i) {
          var res = results[i];
          statsString += '<h3>Report ';
          statsString += i;
          statsString += '</h3>';
          if (!res.local || res.local === res) {
            statsString += dumpStats(res);
          }
        }
        senderStatsDiv.innerHTML =
          '<h2>Sender stats</h2>' + statsString;
      });
    } else {
      display('No stats function. Use at least Chrome 24.0.1285');
    }
  } else {
    console.log('Not connected yet');
  }
  // Collect some stats from the video tags.
  if (localVideo.src) {
    localVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
      localVideo.videoWidth + 'x' + localVideo.videoHeight + 'px';
  }
  if (remoteVideo.src) {
    remoteVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
      remoteVideo.videoWidth + 'x' + remoteVideo.videoHeight + 'px';
  }
}, 1000);

function extractVideoFlowInfo(res, allStats) {
  var description = '';
  var bytesNow = res.stat('bytesReceived');
  if (timestampPrev > 0) {
    var bitrate = Math.round((bytesNow - bytesPrev) * 8 /
      (res.timestamp - timestampPrev));
    description = bitrate + ' kbits/sec';
  }
  timestampPrev = res.timestamp;
  bytesPrev = bytesNow;
  if (res.stat('transportId')) {
    var component = allStats.get(res.stat('transportId'));
    if (component) {
      var addresses = allStats.collectAddressPairs(component.id);
      if (addresses.length > 0) {
        description += ' from IP ';
        description += addresses[0].stat('googRemoteAddress');
      } else {
        description += ' no address';
      }
    } else {
      description += ' No component stats';
    }
  } else {
    description += ' No component ID';
  }
  return description;
}

// Dumping a stats variable as a string.
// might be named toString?
function dumpStats(obj) {
  var statsString = 'Timestamp:';
  statsString += obj.timestamp;
  if (obj.id) {
    statsString += '<br>id ';
    statsString += obj.id;
  }
  if (obj.type) {
    statsString += ' type ';
    statsString += obj.type;
  }
  if (obj.names) {
    var names = obj.names();
    for (var i = 0; i < names.length; ++i) {
      statsString += '<br>';
      statsString += names[i];
      statsString += ':';
      statsString += obj.stat(names[i]);
    }
  } else {
    if (obj.stat('audioOutputLevel')) {
      statsString += 'audioOutputLevel: ';
      statsString += obj.stat('audioOutputLevel');
      statsString += '<br>';
    }
  }
  return statsString;
}


// Utility to show the value of a range in a sibling span element
function displayRangeValue(e) {
  var span = e.target.parentElement.querySelector('span');
  span.textContent = e.target.value;
  displayAddStreamConstraints();
  displayGetUserMediaConstraints();
}
