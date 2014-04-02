var startButton = document.getElementById('startButton');
var callButton = document.getElementById('callButton');
var hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

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
  var videoTracks = localStream.getVideoTracks();
  var audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0)
    trace('Using video device: ' + videoTracks[0].label);
  if (audioTracks.length > 0)
    trace('Using audio device: ' + audioTracks[0].label);
  var servers = null;
  pc1 = new RTCPeerConnection(servers);
  trace('Created local peer connection object pc1');
  pc1.onicecandidate = iceCallback1;
  pc2 = new RTCPeerConnection(servers);
  trace('Created remote peer connection object pc2');
  pc2.onicecandidate = iceCallback2;
  pc2.onaddstream = gotRemoteStream;

  pc1.addStream(localStream);
  trace('Added local stream to peer connection');

  pc1.createOffer(gotDescription1, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function gotDescription1(desc) {
  pc1.setLocalDescription(desc);
  trace('Offer from pc1 \n' + desc.sdp);
  pc2.setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer(gotDescription2, onCreateSessionDescriptionError,
    sdpConstraints);
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc);
  trace('Answer from pc2: \n' + desc.sdp);
  pc1.setRemoteDescription(desc);
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

function gotRemoteStream(e) {
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(remoteVideo, e.stream);
  trace('Received remote stream');
}

function iceCallback1(event) {
  if (event.candidate) {
    pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
      onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event) {
  if (event.candidate) {
    pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
      onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add ICE Candidate: ' + error.toString());
}
