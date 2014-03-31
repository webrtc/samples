var callButton = document.querySelector('button#callButton');
var hangupButton = document.querySelector('button#hangupButton');
callButton.disabled = false;
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.disabled = hangup;

var pc1, pc2;
var localstream;

var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': false
  }
};

function gotStream(stream) {
  trace('Received local stream');
  // Call the polyfill wrapper to attach the media stream to this element.
  localstream = stream;
  audioTracks = localstream.getAudioTracks();
  if (audioTracks.length > 0)
    trace('Using Audio device: ' + audioTracks[0].label);
  pc1.addStream(localstream);
  trace('Adding Local Stream to peer connection');

  pc1.createOffer(gotDescription1, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  trace('Starting call');
  var servers = null;
  var pcConstraints = {
    'optional': []
  };
  pc1 = new RTCPeerConnection(servers, pcConstraints);
  trace('Created local peer connection object pc1');
  pc1.onicecandidate = iceCallback1;
  pc2 = new RTCPeerConnection(servers, pcConstraints);
  trace('Created remote peer connection object pc2');
  pc2.onicecandidate = iceCallback2;
  pc2.onaddstream = gotRemoteStream;
  trace('Requesting local stream');
  // Call into getUserMedia via the polyfill (adapter.js).
  getUserMedia({
      audio: true,
      video: false
    },
    gotStream, function(e){
      alert('getUserMedia() error: ' + e.name);
    });
}

function gotDescription1(desc) {
  pc1.setLocalDescription(desc);
  trace('Offer from pc1 \n' + desc.sdp);
  pc2.setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio.
  pc2.createAnswer(gotDescription2, onCreateSessionDescriptionError,
    sdpConstraints);
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc);
  trace('Answer from pc2 \n' + desc.sdp);
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
  attachMediaStream(audio2, e.stream);
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
