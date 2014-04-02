var startButton = document.querySelector("button#startButton");
var callButton = document.querySelector("button#callButton");
var rehydrateButton = document.querySelector("button#rehydrateButton");
var hangupButton = document.querySelector("button#hangupButton");

callButton.disabled = true;
rehydrateButton.disabled = true;
hangupButton.disabled = true;

startButton.onclick = start;
callButton.onclick = call;
rehydrateButton.onclick = rehydrate;
hangupButton.onclick = hangup;

var localVideo = document.querySelector("video#localVideo");
var remoteVideo = document.querySelector("video#remoteVideo");

localVideo.onloadedmetadata = function(){
  trace("Local video currentSrc: " + this.currentSrc +
    ", videoWidth: " + this.videoWidth +
    "px,  videoHeight: " + this.videoHeight + "px");
};

remoteVideo.onloadedmetadata = function(){
  trace("Remote video currentSrc: " + this.currentSrc +
    ", videoWidth: " + this.videoWidth +
    "px,  videoHeight: " + this.videoHeight + "px");
};

var localStream, localPeerConnection, remotePeerConnection;


function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function gotStream(stream){
  trace("Received local stream");
  localVideo.src = URL.createObjectURL(stream);
  localStream = stream;
  callButton.disabled = false;
  rehydrateButton.disabled = false;
}

function start() {
  trace("Requesting local stream");
  startButton.disabled = true;
  navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  navigator.getUserMedia({video:true}, gotStream,
    function(error) {
      trace("navigator.getUserMedia error: ", error);
  });
}

function call() {
  callButton.disabled = true;
  rehydrateButton.disabled = false;
  hangupButton.disabled = false;
  trace("Starting call");

  if (localStream.getVideoTracks().length > 0) {
    trace('Using video device: ' +
      localStream.getVideoTracks()[0].label);
  }
  if (localStream.getAudioTracks().length > 0) {
    trace('Using audio device: ' +
      localStream.getAudioTracks()[0].label);
  }

  var servers = null;

  localPeerConnection = new webkitRTCPeerConnection(servers);
  trace("Created localPeerConnection");
  localPeerConnection.onicecandidate = gotLocalIceCandidate;

  remotePeerConnection = new webkitRTCPeerConnection(servers);
  trace("Created remotePeerConnection");
  remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
  remotePeerConnection.onaddstream = gotRemoteStream;

  localPeerConnection.addStream(localStream);
  trace("Added localStream to localPeerConnection");
  localPeerConnection.createOffer(gotLocalDescription);
}

function gotLocalDescription(description){
  localPeerConnection.setLocalDescription(description);
  trace("Offer from localPeerConnection: \n" + description.sdp);
  remotePeerConnection.setRemoteDescription(description);
  remotePeerConnection.createAnswer(gotRemoteDescription);
}

function gotRemoteDescription(description){
  remotePeerConnection.setLocalDescription(description);
  trace("Answer from remotePeerConnection: \n" + description.sdp);
  localPeerConnection.setRemoteDescription(description);
}

function hangup() {
  trace("Ending call");
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  rehydrateButton.disabled = true;
  callButton.disabled = false;
}

function gotRemoteStream(event){
  remoteVideo.src = URL.createObjectURL(event.stream);
  trace("Received remote stream");
}

function gotLocalIceCandidate(event){
  if (event.candidate) {
    remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    trace("Local ICE candidate: \n" + event.candidate.candidate);
  }
}

function gotRemoteIceCandidate(event){
  if (event.candidate) {
    localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
    trace("Remote ICE candidate: \n " + event.candidate.candidate);
  }
}

function rehydrate() {
  var oldLocal = remotePeerConnection.localDescription;
  // need to munge a=crypto
  remotePeerConnection = null;
  trace("Destroyed remotePeerConnection");
  var servers = null;
  remotePeerConnection = new webkitRTCPeerConnection(servers);
  trace("Created new remotePeerConnection");
  remotePeerConnection.onaddstream = gotRemoteStream;
  remotePeerConnection.setLocalDescription(remotePeerConnection.SDP_OFFER, oldLocal);
  localPeerConnection.setRemoteDescription(localPeerConnection.SDP_OFFER, oldLocal);
  var answer = localPeerConnection.createAnswer(oldLocal.toSdp(),
    {has_audio: true, has_video: true});
  localPeerConnection.setLocalDescription(localPeerConnection.SDP_ANSWER, answer);
  remotePeerConnection.setRemoteDescription(remotePeerConnection.SDP_ANSWER, answer);
  remotePeerConnection.startIce();
  trace("Inited new remotePeerConnection");
}
