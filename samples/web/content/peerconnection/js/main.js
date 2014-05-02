var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

var startTime;
var localVideo = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function () {
  trace('Local video currentSrc: ' + this.currentSrc +
    ', videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.addEventListener('loadedmetadata', function () {
  trace('Remote video currentSrc: ' + this.currentSrc +
    ', videoWidth: ' + this.videoWidth +
    'px,  videoHeight: ' + this.videoHeight + 'px');
});

remoteVideo.onresize = function() {
  trace("Remote video size changed to " +
        remoteVideo.videoWidth  + "x" + remoteVideo.videoHeight);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    var elapsedTime = performance.now() - startTime;
    trace("Setup time: " + elapsedTime.toFixed(3) + "ms");
    startTime = null;
  }
}

var localStream, pc1, pc2;

var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

function gotStream(stream) {
  trace('Received local stream');
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localStream = stream;
  callButton.disabled = false;
}

function start() {
  trace('Requesting local stream');
  startButton.disabled = true;
  // Call into getUserMedia via the polyfill (adapter.js).
  getUserMedia({
      audio: true,
      video: true
    }, gotStream,
    function (e) {
      alert('getUserMedia() error: ' + e.name);
    });
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  trace('Starting call');
  startTime = performance.now();
  var videoTracks = localStream.getVideoTracks();
  var audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0)
    trace('Using video device: ' + videoTracks[0].label);
  if (audioTracks.length > 0)
    trace('Using audio device: ' + audioTracks[0].label);
  var servers = null;
  pc1 = new RTCPeerConnection(servers);
  trace('Created local peer connection object pc1');
  pc1.onicecandidate = onIceCandidate1;
  pc2 = new RTCPeerConnection(servers);
  trace('Created remote peer connection object pc2');
  pc2.onicecandidate = onIceCandidate2;
  pc1.oniceconnectionstatechange = onIceStateChange1;
  pc2.oniceconnectionstatechange = onIceStateChange2;
  pc2.onaddstream = gotRemoteStream;

  pc1.addStream(localStream);
  trace('Added local stream to pc1');

  trace('pc1 createOffer start');
  pc1.createOffer(onCreateOfferSuccess, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
  trace('Offer from pc1\n' + desc.sdp);
  trace('pc1 setLocalDescription start');
  pc1.setLocalDescription(desc, onSetLocalSuccess1);
  trace('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc, onSetRemoteSuccess2);
  trace('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer(onCreateAnswerSuccess, onCreateSessionDescriptionError,
                   sdpConstraints);
}

function onSetLocalSuccess1() {
  trace('pc1 setLocalDescription complete\n');
}

function onSetRemoteSuccess2() {
  trace('pc2 setRemoteDescription complete\n');
}

function gotRemoteStream(e) {
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(remoteVideo, e.stream);
  trace('pc2 received remote stream');
}

function onCreateAnswerSuccess(desc) {
  trace('Answer from pc2:\n' + desc.sdp);
  trace('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc, onSetLocalSuccess2);
  trace('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc, onSetRemoteSuccess1);
}

function onSetLocalSuccess2() {
  trace('pc2 setLocalDescription complete\n');
}

function onSetRemoteSuccess1() {
  trace('pc1 setRemoteDescription complete\n');
}

function onIceCandidate1(event) {
  if (event.candidate) {
    pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
      onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('pc1 ICE candidate: \n' + event.candidate.candidate);
  }
}

function onIceCandidate2(event) {
  if (event.candidate) {
    pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
      onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('pc2 ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onIceStateChange1(event) {
  if (pc1) {
    trace("pc1 ICE state: " + pc1.iceConnectionState);
  }
}

function onIceStateChange2(event) {
  if (pc2) {
    trace("pc2 ICE state: " + pc2.iceConnectionState);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add ICE Candidate: ' + error.toString());
}

function hangup() {
  trace('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}
