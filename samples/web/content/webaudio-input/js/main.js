var audioElement;
var buttonStart;
var buttonStop;
var localStream;
var pc1, pc2;
var display;

var webAudio;

// WebAudio helper class which takes care of the WebAudio related parts.

function WebAudio() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  this.context = new AudioContext();
  this.soundBuffer = null;
}

WebAudio.prototype.start = function() {
  this.filter = this.context.createBiquadFilter();
  this.filter.type = "highpass";
  this.filter.frequency.value = 1500;
};

WebAudio.prototype.applyFilter = function(stream) {
  this.mic = this.context.createMediaStreamSource(stream);
  this.mic.connect(this.filter);
  this.peer = this.context.createMediaStreamDestination();
  this.filter.connect(this.peer);
  return this.peer.stream;
};

WebAudio.prototype.renderLocally = function(enabled) {
  if (enabled) {
    this.mic.connect(this.context.destination);
  } else {
    this.mic.disconnect(0);
    this.mic.connect(this.filter);
  }
};

WebAudio.prototype.stop = function() {
  this.mic.disconnect(0);
  this.filter.disconnect(0);
  mic = null;
  peer = null;
};

WebAudio.prototype.addEffect = function() {
  var effect = this.context.createBufferSource();
  effect.buffer = this.soundBuffer;
  if (this.peer) {
    effect.connect(this.peer);
    effect.start(0);
  }
};

WebAudio.prototype.loadCompleted = function() {
  this.context.decodeAudioData(this.request.response, function (buffer) {this.soundBuffer = buffer;}.bind(this));
};

WebAudio.prototype.loadSound = function(url) {
  this.request = new XMLHttpRequest();
  this.request.open('GET', url, true);
  this.request.responseType = 'arraybuffer';
  this.request.onload = this.loadCompleted.bind(this);
  this.request.send();
};

// Global methods.

function trace(txt) {
  display.innerHTML += txt + "<br>";
}

function logEvent(e) {
  console.log(e.type + ':' + e.target + ':' + e.target.id + ':muted=' +
              e.target.muted);
}

$ = function(id) {
  return document.getElementById(id);
};

function start() {
  webAudio.start();
  var constraints = {audio:true, video:false};
  getUserMedia(constraints, gotStream, gotStreamFailed);
  buttonStart.disabled = true;
  buttonStop.disabled = false;
}

function stop() {
  webAudio.stop();
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  buttonStart.enabled = true;
  buttonStop.enabled = false;
  localStream.stop();
}

function gotStream(stream) {
  audioTracks = stream.getAudioTracks();
  if (audioTracks.length == 1) {
    console.log('gotStream({audio:true, video:false})');

    var filteredStream = webAudio.applyFilter(stream);

    var servers = null;

    window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    pc1 = new RTCPeerConnection(servers);
    console.log('Created local peer connection object pc1');
    pc1.onicecandidate = iceCallback1;
    pc2 = new RTCPeerConnection(servers);
    console.log('Created remote peer connection object pc2');
    pc2.onicecandidate = iceCallback2;
    pc2.onaddstream = gotRemoteStream;

    pc1.addStream(filteredStream);
    pc1.createOffer(gotDescription1);

    stream.onended = function() {
      console.log('stream.onended');
      buttonStart.disabled = false;
      buttonStop.disabled = true;
    };

    localStream = stream;
  } else {
    alert('The media stream contains an invalid amount of audio tracks.');
    stream.stop();
  }
}

function gotStreamFailed(error) {
  buttonStart.disabled = false;
  buttonStop.disabled = true;
  alert('Failed to get access to local media. Error code: ' + error.code);
}

function forceOpus(sdp) {
  // Remove all other codecs (not the video codecs though).
  sdp = sdp.replace(/m=audio (\d+) RTP\/SAVPF.*\r\n/g,
                    'm=audio $1 RTP/SAVPF 111\r\n');
  sdp = sdp.replace(/a=rtpmap:(?!111)\d{1,3} (?!VP8|red|ulpfec).*\r\n/g, '');
  return sdp;
}

function gotDescription1(desc){
  console.log('Offer from pc1 \n' + desc.sdp);
  var modifiedOffer = new RTCSessionDescription({type: 'offer',
                                                 sdp: forceOpus(desc.sdp)});
  pc1.setLocalDescription(modifiedOffer);
  console.log('Offer from pc1 \n' + modifiedOffer.sdp);
  pc2.setRemoteDescription(modifiedOffer);
  pc2.createAnswer(gotDescription2);
}

function gotDescription2(desc){
  pc2.setLocalDescription(desc);
  console.log('Answer from pc2 \n' + desc.sdp);
  pc1.setRemoteDescription(desc);
}

function gotRemoteStream(e){
  attachMediaStream(audioElement, e.stream);
}

function iceCallback1(event){
  if (event.candidate) {
    pc2.addIceCandidate(new RTCIceCandidate(event.candidate),
                        onAddIceCandidateSuccess, onAddIceCandidateError);
    console.log('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event){
  if (event.candidate) {
    pc1.addIceCandidate(new RTCIceCandidate(event.candidate),
                        onAddIceCandidateSuccess, onAddIceCandidateError);
    console.log('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace("AddIceCandidate success.");
}

function onAddIceCandidateError(error) {
  trace("Failed to add Ice Candidate: " + error.toString());
}

function handleKeyDown(event) {
  var keyCode = event.keyCode;
  webAudio.addEffect();
}

function doMix(checkbox) {
  webAudio.renderLocally(checkbox.checked);
}

function onload() {
  webAudio = new WebAudio();
  webAudio.loadSound('audio/Shamisen-C4.wav');

  audioElement = $('audio');
  buttonStart = $('start');
  buttonStop = $('stop');
  display = $('display');

  document.addEventListener('keydown', handleKeyDown, false);

  buttonStart.enabled = true;
  buttonStop.disabled = true;
}