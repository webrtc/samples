var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

var startTime;

var localVideo = document.querySelector('div#localVideo video');
var remoteVideo1 = document.getElementById('remoteVideo1');
var remoteVideo2 = document.getElementById('remoteVideo2');

localVideo.addEventListener('loadedmetadata', function () {
  trace('Local video currentSrc: ' + this.currentSrc +
    ', videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
  document.querySelector('div#localVideo div').innerHTML = "Local video resolution W:" + this.videoWidth + " H:" +  this.videoHeight;
});

remoteVideo1.addEventListener('loadedmetadata', function () {
  trace('Remote video 1 currentSrc: ' + this.currentSrc +
    ', videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
  document.getElementById('remoteVideoLabel1').innerHTML = "Remote video 1: W:" + this.videoWidth + " H:" +  this.videoHeight;
});


remoteVideo2.addEventListener('loadedmetadata', function () {
  trace('Remote video 2 currentSrc: ' + this.currentSrc +
    ', videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
  document.getElementById('remoteVideoLabel2').innerHTML = "Remote video 2: W:" + this.videoWidth + " H:" +  this.videoHeight;
});

remoteVideo2.onresize = function() {
  trace('Remote video size changed to ' +
        remoteVideo2.videoWidth  + 'x' + remoteVideo2.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    var elapsedTime = performance.now() - startTime;
    trace('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
}

var localStream1 = null;
var localStream2 = null;
var remoteStream1 = null;
var remoteStream2 = null;
var localPeerConnection, remotePeerConnection;
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

function getName(pc) {
  return (pc == localPeerConnection) ? 'localPeerConnection' : 'remotePeerConnection';
}
function getOtherPc(pc) {
  return (pc == localPeerConnection) ? remotePeerConnection : localPeerConnection;
}

function gotStream1(stream) {
  trace('Received local stream 1');
  localStream1 = stream;
}

function gotStream2(stream) {
  trace('Received local stream 2');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localStream2 = stream;
  callButton.disabled = false;
}

function start() {
  trace('Requesting local stream');
  startButton.disabled = true;
  // Call into getUserMedia via the polyfill (adapter.js).
  getUserMedia({
      audio: true,
      video: {
        mandatory : {
            "minWidth": "1280",
            "minHeight": "720"
        }}
    }, gotStream1,
    function (e) {
      alert('getUserMedia() error: ' + e.name);
    });
  getUserMedia({
      audio: false,
      video: {
        mandatory : {
            "maxWidth": "640",
            "maxHeight": "360"
        }}
    }, gotStream2,
    function (e) {
      alert('getUserMedia() error: ' + e.name);
    });
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  trace('Starting call');
  startTime = performance.now();
  var videoTracks = localStream1.getVideoTracks();
  var audioTracks = localStream1.getAudioTracks();
  if (videoTracks.length > 0)
    trace('Using video device: ' + videoTracks[0].label);
  if (audioTracks.length > 0)
    trace('Using audio device: ' + audioTracks[0].label);
  var servers = null;
  localPeerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object localPeerConnection');
  localPeerConnection.onicecandidate = function(e) { onIceCandidate(localPeerConnection, e) };
  remotePeerConnection = new RTCPeerConnection(servers);
  trace('Created remote peer connection object remotePeerConnection');
  remotePeerConnection.onicecandidate = function(e) { onIceCandidate(remotePeerConnection, e) };
  localPeerConnection.oniceconnectionstatechange = function(e) { onIceStateChange(localPeerConnection, e) };
  remotePeerConnection.oniceconnectionstatechange = function(e) { onIceStateChange(remotePeerConnection, e) };
  remotePeerConnection.onaddstream = gotRemoteStream;

  localPeerConnection.addStream(localStream1);
  localPeerConnection.addStream(localStream2);
  trace('Added local stream to localPeerConnection');

  trace('localPeerConnection createOffer start');
  localPeerConnection.createOffer(onCreateOfferSuccess, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
  trace('Offer from localPeerConnection\n' + desc.sdp);
  trace('localPeerConnection setLocalDescription start');
  localPeerConnection.setLocalDescription(desc, function() { onSetLocalSuccess(localPeerConnection); });
  trace('remotePeerConnection setRemoteDescription start');
  remotePeerConnection.setRemoteDescription(desc, function() { onSetRemoteSuccess(remotePeerConnection); });
  trace('remotePeerConnection createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  remotePeerConnection.createAnswer(onCreateAnswerSuccess, onCreateSessionDescriptionError,
                   sdpConstraints);
}

function onSetLocalSuccess(pc) {
  trace(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
  trace(getName(pc) + ' setRemoteDescription complete');
}

function gotRemoteStream(e) {
  // Call the polyfill wrapper to attach the media stream to this element.
  if (remoteStream1 == null) {
    remoteStream1 = e.stream;
    attachMediaStream(remoteVideo1, remoteStream1);
    trace('remotePeerConnection received remote stream 1'); 
  } else {
    remoteStream2 = e.stream;
    attachMediaStream(remoteVideo2, remoteStream2);
    trace('remotePeerConnection received remote stream 2'); 
  }
}

function onCreateAnswerSuccess(desc) {
  trace('Answer from remotePeerConnection:\n' + desc.sdp);
  trace('remotePeerConnection setLocalDescription start');
  remotePeerConnection.setLocalDescription(desc, function() { onSetLocalSuccess(remotePeerConnection); });
  trace('localPeerConnection setRemoteDescription start');
  localPeerConnection.setRemoteDescription(desc, function() { onSetRemoteSuccess(localPeerConnection); });
}


function onIceCandidate(pc, event) {
  if (event.candidate) {
    getOtherPc(pc).addIceCandidate(new RTCIceCandidate(event.candidate),
        function() { onAddIceCandidateSuccess(pc) },
        function(err) { onAddIceCandidateError(pc, err); });
    trace(getName(pc) + ' ICE candidate: \n' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess(pc) {
  trace(getName(pc) + ' addIceCandidate success');
}

function onAddIceCandidateError(pc, error) {
  trace(getName(pc) + ' failed to add ICE Candidate: ' + error.toString());
}

function onIceStateChange(pc, event) {
  if (pc) {
    trace(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
  }
}

function hangup() {
  trace('Ending call');
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  remoteStream1 = null;
  remoteStream2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}
