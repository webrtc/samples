var getMediaButton = document.querySelector('button#getMedia');
var createPeerConnectionButton = document.querySelector('button#createPeerConnection');
var createOfferButton = document.querySelector('button#createOffer');
var setOfferButton = document.querySelector('button#setOffer');
var createAnswerButton = document.querySelector('button#createAnswer');
var setAnswerButton = document.querySelector('button#setAnswer');
var hangupButton = document.querySelector('button#hangup');

getMediaButton.onclick = getMedia;
createPeerConnectionButton.onclick = createPeerConnection;
createOfferButton.onclick = createOffer;
setOfferButton.onclick = setOffer;
createAnswerButton.onclick = createAnswer;
setAnswerButton.onclick = setAnswer;
hangupButton.onclick = hangup;

var frameRateInput = document.querySelector('input#frameRate');
var minHeightInput = document.querySelector('input#minHeight');
var maxHeightInput = document.querySelector('input#maxHeight');
var minWidthInput = document.querySelector('input#minWidth');
var maxWidthInput = document.querySelector('input#maxWidth');

var cameraConstraintsDiv = document.querySelector('div#cameraConstraints');

var offerSdpTextarea = document.querySelector('div#local textarea');
var answerSdpTextarea = document.querySelector('div#remote textarea');

var audioSelect = document.querySelector('select#audioSrc');
var videoSelect = document.querySelector('select#videoSrc');

audioSelect.onchange = videoSelect.onchange = getMedia;

var localVideo = document.querySelector('div#local video');
var remoteVideo = document.querySelector('div#remote video');

var selectSourceDiv = document.querySelector('div#selectSource');

var localPeerConnection, remotePeerConnection;
var localStream;


var mystream;
var bytesPrev = 0;
var timestampPrev = 0;


function openCamera() {
  if (mystream) {
    mystream.stop();
  }
  getUserMedia(cameraConstraints(), gotStream, function() {
     log("GetUserMedia failed");
    });
}

function gotStream(stream) {
  log("GetUserMedia succeeded");
  mystream = stream;
  attachMediaStream(localVideo, stream);
}

function cameraConstraints() {
  var constraints = {};
  constraints.audio = true;
  constraints.video = { mandatory: {}, optional: [] };
  if (minWidthInput.value != "0") {
    constraints.video.mandatory.minWidth = minWidthInput.value;
  }
  if (maxWidthInput.value != "0") {
    constraints.video.mandatory.maxWidth = maxWidthInput.value;
  }
  if (minHeightInput.value != "0") {
    constraints.video.mandatory.minHeight = minHeightInput.value;
  }
  if (maxHeightInput.value != "0") {
    constraints.video.mandatory.maxHeight = maxHeightInput.value;
  }
  if (frameRateInput.value != "0") {
    constraints.video.mandatory.minFrameRate = frameRateInput.value;
  }
  log('Camera constraints are ' + JSON.stringify(constraints));
  cameraConstraintsDiv.innerHTML = JSON.stringify(constraints, null, ' ');
  return constraints;
}

function streamConstraints() {
  var constraints = { mandatory: {}, optional: [] };
  if ($("bandwidth").value != "0") {
    constraints.optional[0] = { 'bandwidth' : $('bandwidth').value };
  }
  log('Constraints are ' + JSON.stringify(constraints));
  $("addStreamConstraints").innerHTML = JSON.stringify(constraints, null, ' ');
  return constraints;
}

function connect() {
  localPeerConnection = new RTCPeerConnection(null);
  remotePeerConnection = new RTCPeerConnection(null);
  localPeerConnection.addStream(mystream, streamConstraints());
  log('localPeerConnection creating offer');
  localPeerConnection.onnegotiationeeded = function() {
    log('Negotiation needed - localPeerConnection');
  }
  remotePeerConnection.onnegotiationeeded = function() {
    log('Negotiation needed - remotePeerConnection');
  }
  localPeerConnection.onicecandidate = function(e) {
    log('Candidate localPeerConnection');
    if (e.candidate) {
      remotePeerConnection.addIceCandidate(new RTCIceCandidate(e.candidate),
                          onAddIceCandidateSuccess, onAddIceCandidateError);
    }
  }
  remotePeerConnection.onicecandidate = function(e) {
    log('Candidate remotePeerConnection');
    if (e.candidate) {
      localPeerConnection.addIceCandidate(new RTCIceCandidate(e.candidate),
                          onAddIceCandidateSuccess, onAddIceCandidateError);
    }
  }
  remotePeerConnection.onaddstream = function(e) {
    log('remotePeerConnection got stream');
    attachMediaStream($('remote-video'), e.stream);
    log('Remote video is ' + $('remote-video').src);
  }
  localPeerConnection.createOffer(function(desc) {
    log('localPeerConnection offering');
    localPeerConnection.setLocalDescription(desc);
    remotePeerConnection.setRemoteDescription(desc);
    remotePeerConnection.createAnswer(function(desc2) {
      log('remotePeerConnection answering');
      remotePeerConnection.setLocalDescription(desc2);
      localPeerConnection.setRemoteDescription(desc2);
    });
  });
}

function onAddIceCandidateSuccess() {
  trace("AddIceCandidate success.");
}

function onAddIceCandidateError(error) {
  trace("Failed to add Ice Candidate: " + error.toString());
}

// Augumentation of stats entries with utility functions.
// The augumented entry does what the stats entry does, but adds
// utility functions.
function AugumentedStatsResponse(response) {
  this.response = response;
  this.addressPairMap = [];
}

AugumentedStatsResponse.prototype.collectAddressPairs = function(componentId) {
  if (!this.addressPairMap[componentId]) {
    this.addressPairMap[componentId] = [];
    for (var i = 0; i < this.response.result().length; ++i) {
      var res = this.response.result()[i];
      if (res.type == 'googCandidatePair' &&
          res.stat('googChannelId') == componentId) {
        this.addressPairMap[componentId].push(res);
      }
    }
  }
  return this.addressPairMap[componentId];
}

AugumentedStatsResponse.prototype.result = function() {
  return this.response.result();
}

// The indexed getter isn't easy to prototype.
AugumentedStatsResponse.prototype.get = function(key) {
  return this.response[key];
}


// Display statistics
var statCollector = setInterval(function() {
  var display = function(str) {
    $('bitrate').innerHTML = str;
  }

  display("No stream");
  if (remotePeerConnection && remotePeerConnection.getRemoteStreams()[0]) {
    if (remotePeerConnection.getStats) {
      remotePeerConnection.getStats(function(rawStats) {
        stats = new AugumentedStatsResponse(rawStats);
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
            if (res.type == 'ssrc' && res.stat('googFrameHeightReceived')) {
              // This is the video flow.
              videoFlowInfo = extractVideoFlowInfo(res, stats);
            }
          } else {
            // Pre-227.0.1445 (188719) browser
            if (res.local) {
              statsString += "<p>Local ";
              statsString += dumpStats(res.local);
            }
            if (res.remote) {
              statsString += "<p>Remote ";
              statsString += dumpStats(res.remote);
            }
          }
        }
        $('receiverstats').innerHTML = statsString;
        display(videoFlowInfo);
      });
      localPeerConnection.getStats(function(stats) {
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
        $('senderstats').innerHTML = statsString;
      });
    } else {
      display('No stats function. Use at least Chrome 24.0.1285');
    }
  } else {
    log('Not connected yet');
  }
  // Collect some stats from the video tags.
  local_video = $('local-video');
  if (local_video) {
     $('local-video-stats').innerHTML = local_video.videoWidth +
         'x' + local_video.videoHeight;
  }
  remote_video = $('remote-video');
  if (remote_video) {
     $('remote-video-stats').innerHTML = remote_video.videoWidth +
         'x' + remote_video.videoHeight;
  }
}, 1000);

function extractVideoFlowInfo(res, allStats) {
  var description = '';
  var bytesNow = res.stat('bytesReceived');
  if (timestampPrev > 0) {
    var bitRate = Math.round((bytesNow - bytesPrev) * 8 /
                             (res.timestamp - timestampPrev));
    description = bitRate + ' kbits/sec';
  }
  timestampPrev = res.timestamp;
  bytesPrev = bytesNow;
  if (res.stat('transportId')) {
    component = allStats.get(res.stat('transportId'));
    if (component) {
      addresses = allStats.collectAddressPairs(component.id);
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
     statsString += "<br>id ";
     statsString += obj.id;
  }
  if (obj.type) {
     statsString += " type ";
     statsString += obj.type;
  }
  if (obj.names) {
    names = obj.names();
    for (var i = 0; i < names.length; ++i) {
       statsString += '<br>';
       statsString += names[i];
       statsString += ':';
       statsString += obj.stat(names[i]);
    }
  } else {
    if (obj.stat('audioOutputLevel')) {
      statsString += "audioOutputLevel: ";
      statsString += obj.stat('audioOutputLevel');
      statsString += "<br>";
    }
  }
  return statsString;
}


// Utility to show the value of a field in a span called name+Display
function showValue(name, value) {
  $(name + 'Display').innerHTML = value;
}
