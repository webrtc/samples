/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var getMediaButton = document.querySelector('button#getMedia');
var connectButton = document.querySelector('button#connect');
var hangupButton = document.querySelector('button#hangup');

getMediaButton.onclick = getMedia;
connectButton.onclick = createPeerConnection;
hangupButton.onclick = hangup;

var minWidthInput = document.querySelector('div#minWidth input');
var maxWidthInput = document.querySelector('div#maxWidth input');
var minHeightInput = document.querySelector('div#minHeight input');
var maxHeightInput = document.querySelector('div#maxHeight input');
var minFramerateInput = document.querySelector('div#minFramerate input');
var maxFramerateInput = document.querySelector('div#maxFramerate input');

minWidthInput.onchange = maxWidthInput.onchange =
    minHeightInput.onchange = maxHeightInput.onchange =
    minFramerateInput.onchange = maxFramerateInput.onchange = displayRangeValue;

var getUserMediaConstraintsDiv =
    document.querySelector('div#getUserMediaConstraints');
var bitrateDiv = document.querySelector('div#bitrate');
var peerDiv = document.querySelector('div#peer');
var senderStatsDiv = document.querySelector('div#senderStats');
var receiverStatsDiv = document.querySelector('div#receiverStats');

var localVideo = document.querySelector('div#localVideo video');
var remoteVideo = document.querySelector('div#remoteVideo video');
var localVideoStatsDiv = document.querySelector('div#localVideo div');
var remoteVideoStatsDiv = document.querySelector('div#remoteVideo div');

var localPeerConnection;
var remotePeerConnection;
var localStream;
var bytesPrev;
var timestampPrev;

main();

function main() {
  displayGetUserMediaConstraints();
}

function hangup() {
  trace('Ending call');
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;

  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
  localStream = null;

  hangupButton.disabled = true;
  getMediaButton.disabled = false;
}

function getMedia() {
  if (localStream) {
    localStream.getTracks().forEach(function(track) {
      track.stop();
    });
    var videoTracks = localStream.getVideoTracks();
    for (var i = 0; i !== videoTracks.length; ++i) {
      videoTracks[i].stop();
    }
  }
  navigator.mediaDevices.getUserMedia(getUserMediaConstraints())
  .then(gotStream)
  .catch(function(e) {
    var message = 'getUserMedia error: ' + e.name + '\n' +
        'PermissionDeniedError may mean invalid constraints.';
    alert(message);
    console.log(message);
    getMediaButton.disabled = false;
  });
}

function gotStream(stream) {
  connectButton.disabled = false;
  console.log('GetUserMedia succeeded');
  localStream = stream;
  localVideo.srcObject = stream;
}

function getUserMediaConstraints() {
  var constraints = {};
  constraints.audio = true;
  constraints.video = {};
  if (minWidthInput.value !== '0') {
    constraints.video.width = {};
    constraints.video.width.min = minWidthInput.value;
  }
  if (maxWidthInput.value !== '0') {
    constraints.video.width = constraints.video.width || {};
    constraints.video.width.max = maxWidthInput.value;
  }
  if (minHeightInput.value !== '0') {
    constraints.video.height = {};
    constraints.video.height.min = minHeightInput.value;
  }
  if (maxHeightInput.value !== '0') {
    constraints.video.height = constraints.video.height || {};
    constraints.video.height.max = maxHeightInput.value;
  }
  if (minFramerateInput.value !== '0') {
    constraints.video.frameRate = {};
    constraints.video.frameRate.min = minFramerateInput.value;
  }
  if (maxFramerateInput.value !== '0') {
    constraints.video.frameRate = constraints.video.frameRate || {};
    constraints.video.frameRate.max = maxFramerateInput.value;
  }

  return constraints;
}

function displayGetUserMediaConstraints() {
  var constraints = getUserMediaConstraints();
  console.log('getUserMedia constraints', constraints);
  getUserMediaConstraintsDiv.textContent =
      JSON.stringify(constraints, null, '    ');
}

function createPeerConnection() {
  connectButton.disabled = true;
  hangupButton.disabled = false;
  // We don't handle changing media midstream, so disallow re-getting.
  getMediaButton.disabled = true;

  bytesPrev = 0;
  timestampPrev = 0;
  localPeerConnection = new RTCPeerConnection(null);
  remotePeerConnection = new RTCPeerConnection(null);
  localStream.getTracks().forEach(
    function(track) {
      localPeerConnection.addTrack(
        track,
        localStream
      );
    }
  );
  console.log('localPeerConnection creating offer');
  localPeerConnection.onnegotiationeeded = function() {
    console.log('Negotiation needed - localPeerConnection');
  };
  remotePeerConnection.onnegotiationeeded = function() {
    console.log('Negotiation needed - remotePeerConnection');
  };
  localPeerConnection.onicecandidate = function(e) {
    console.log('Candidate localPeerConnection');
    remotePeerConnection.addIceCandidate(e.candidate)
    .then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
  };
  remotePeerConnection.onicecandidate = function(e) {
    console.log('Candidate remotePeerConnection');
    localPeerConnection.addIceCandidate(e.candidate)
    .then(
      onAddIceCandidateSuccess,
      onAddIceCandidateError
    );
  };
  remotePeerConnection.ontrack = function(e) {
    if (remoteVideo.srcObject !== e.streams[0]) {
      console.log('remotePeerConnection got stream');
      remoteVideo.srcObject = e.streams[0];
    }
  };
  localPeerConnection.createOffer().then(
    function(desc) {
      console.log('localPeerConnection offering');
      localPeerConnection.setLocalDescription(desc);
      remotePeerConnection.setRemoteDescription(desc);
      remotePeerConnection.createAnswer().then(
        function(desc2) {
          console.log('remotePeerConnection answering');
          remotePeerConnection.setLocalDescription(desc2);
          localPeerConnection.setRemoteDescription(desc2);
        },
        function(err) {
          console.log(err);
        }
      );
    },
    function(err) {
      console.log(err);
    }
  );
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function videoStatistics(stream, video) {
  var sizeFromTag;
  var sizeFromSettings;
  var frameRate;
  // Collect some stats from the video tags.
  if (video.videoWidth) {
    sizeFromTag = video.videoWidth + 'x' + video.videoHeight;
  }
  // Use track's info if available.
  // NOTE: getSettings is under development, so code adapts to various
  // in-flight situations that aren't according to spec.
  if (stream) {
    if (stream.getVideoTracks()[0]) {
      if (stream.getVideoTracks()[0].getSettings) {
        var settings = stream.getVideoTracks()[0].getSettings();
        if (settings.width && settings.height) {
          sizeFromSettings =
              settings.width + 'X' + settings.height;
        }
        frameRate = settings.frameRate;
      }
    }
  }
  if (!sizeFromTag && sizeFromSettings) {
    return undefined;
  }
  var retval;
  if (sizeFromSettings) {
    retval = sizeFromSettings + '@' + frameRate;
  } else if (frameRate) {
    retval = sizeFromTag + '@' + frameRate;
  } else {
    retval = sizeFromTag;
  }
  return retval;
}

// Display statistics
setInterval(function() {
  if (remotePeerConnection && remotePeerConnection.getRemoteStreams()[0]) {
    remotePeerConnection.getStats(null)
    .then(function(results) {
      var statsString = dumpStats(results);
      receiverStatsDiv.innerHTML = '<h2>Receiver stats</h2>' + statsString;
      // calculate video bitrate
      results.forEach(function(report) {
        var now = report.timestamp;

        var bitrate;
        if (report.type === 'inboundrtp' && report.mediaType === 'video') {
          // firefox calculates the bitrate for us
          // https://bugzilla.mozilla.org/show_bug.cgi?id=951496
          bitrate = Math.floor(report.bitrateMean / 1024);
        } else if (report.type === 'ssrc' && report.bytesReceived &&
             report.googFrameHeightReceived) {
          // chrome does not so we need to do it ourselves
          var bytes = report.bytesReceived;
          if (timestampPrev) {
            bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
            bitrate = Math.floor(bitrate);
          }
          bytesPrev = bytes;
          timestampPrev = now;
        }
        if (bitrate) {
          bitrate += ' kbits/sec';
          bitrateDiv.innerHTML = '<strong>Bitrate:</strong> ' + bitrate;
        }
      });

      // figure out the peer's ip
      var activeCandidatePair = null;
      var remoteCandidate = null;

      // search for the candidate pair
      results.forEach(function(report) {
        if (report.type === 'candidatepair' && report.selected ||
            report.type === 'googCandidatePair' &&
            report.googActiveConnection === 'true') {
          activeCandidatePair = report;
        }
      });
      if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
        remoteCandidate = results[activeCandidatePair.remoteCandidateId];
      }
      if (remoteCandidate && remoteCandidate.ipAddress &&
          remoteCandidate.portNumber) {
        peerDiv.innerHTML = '<strong>Connected to:</strong> ' +
            remoteCandidate.ipAddress +
            ':' + remoteCandidate.portNumber;
      }
    }, function(err) {
      console.log(err);
    });
    localPeerConnection.getStats(null)
    .then(function(results) {
      var statsString = dumpStats(results);
      senderStatsDiv.innerHTML = '<h2>Sender stats</h2>' + statsString;
    }, function(err) {
      console.log(err);
    });
  }
  if (videoStatistics(localStream, localVideo)) {
    localVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
        videoStatistics(localStream, localVideo);
  }
  if (remotePeerConnection && remotePeerConnection.getRemoteStreams()[0]) {
    if (videoStatistics(remotePeerConnection.getRemoteStreams()[0],
                        remoteVideo)) {
      remoteVideoStatsDiv.innerHTML =
          '<strong>Video dimensions:</strong> ' +
          videoStatistics(remotePeerConnection.getRemoteStreams()[0],
                          remoteVideo);
    }
  }
}, 1000);

// Dumping a stats variable as a string.
// might be named toString?
function dumpStats(results) {
  var statsString = '';
  results.forEach(function(res) {
    statsString += '<h3>Report type=';
    statsString += res.type;
    statsString += '</h3>\n';
    statsString += 'id ' + res.id + '<br>\n';
    statsString += 'time ' + res.timestamp + '<br>\n';
    Object.keys(res).forEach(function(k) {
      if (k !== 'timestamp' && k !== 'type' && k !== 'id') {
        statsString += k + ': ' + res[k] + '<br>\n';
      }
    });
  });
  return statsString;
}

// Utility to show the value of a range in a sibling span element
function displayRangeValue(e) {
  var span = e.target.parentElement.querySelector('span');
  span.textContent = e.target.value;
  displayGetUserMediaConstraints();
}
