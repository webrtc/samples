/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var callButton = document.querySelector('button#callButton');
var sendTonesButton = document.querySelector('button#sendTonesButton');
var hangupButton = document.querySelector('button#hangupButton');

sendTonesButton.disabled = true;
hangupButton.disabled = true;

callButton.onclick = call;
sendTonesButton.onclick = handleSendTonesClick;
hangupButton.onclick = hangup;

var durationInput = document.querySelector('input#duration');
var gapInput = document.querySelector('input#gap');
var tonesInput = document.querySelector('input#tones');

var sentTonesDiv = document.querySelector('div#sentTones');
var dtmfStatusDiv = document.querySelector('div#dtmfStatus');

var audio = document.querySelector('audio');

var pc1, pc2;
var localStream;
var dtmfSender;

var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': false
  }
};


main();

function main() {
  addDialPadHandlers();
}

function gotStream(stream) {
  trace('Received local stream');
  // Call the polyfill wrapper to attach the media stream to this element.
  localStream = stream;
  var audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    trace('Using Audio device: ' + audioTracks[0].label);
  }
  pc1.addStream(localStream);
  trace('Adding Local Stream to peer connection');
  pc1.createOffer(gotDescription1, onCreateSessionDescriptionError);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function call() {
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
    gotStream, function(e) {
      alert('getUserMedia() error: ' + e.name);
    });

  callButton.disabled = true;
  hangupButton.disabled = false;
  sendTonesButton.disabled = false;
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
  // Setting PCMU as the preferred codec.
  desc.sdp = desc.sdp.replace(/m=.*\r\n/, 'm=audio 1 RTP/SAVPF 0 126\r\n');
  // Workaround for issue 1603.
  desc.sdp = desc.sdp.replace(/.*fmtp.*\r\n/g, '');
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
  localStream = null;
  dtmfSender = null;
  callButton.disabled = false;
  hangupButton.disabled = true;
  sendTonesButton.disabled = true;
  dtmfStatusDiv.textContent = 'DTMF deactivated';
}

function gotRemoteStream(e) {
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(audio, e.stream);
  trace('Received remote stream');
  if (pc1.createDTMFSender) {
    enableDtmfSender();
  } else {
    alert(
      'This demo requires the RTCPeerConnection method createDTMFSender() which is not support by this browser.'
    );
  }

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
  trace('AddIceCandidate success');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function enableDtmfSender() {
  dtmfStatusDiv.textContent = 'DTMF activated';
  if (localStream !== null) {
    var localAudioTrack = localStream.getAudioTracks()[0];
    dtmfSender = pc1.createDTMFSender(localAudioTrack);
    trace('Created DTMFSender:\n');
    dtmfSender.ontonechange = dtmfOnToneChange;
  } else {
    trace('No local stream to create DTMF Sender\n');
  }
}

function dtmfOnToneChange(tone) {
  if (tone) {
    trace('Sent DTMF tone: ' + tone.tone);
    sentTonesDiv.textContent += tone.tone + ' ';
  }
}

function sendTones(tones) {
  if (dtmfSender) {
    var duration = durationInput.value;
    var gap = gapInput.value;
    console.log('Tones, duration, gap: ', tones, duration, gap);
    dtmfSender.insertDTMF(tones, duration, gap);
  }
}

function handleSendTonesClick() {
  sendTones(tonesInput.value);
}

function addDialPadHandlers() {
  var dialPad = document.querySelector('div#dialPad');
  var buttons = dialPad.querySelectorAll('button');
  for (var i = 0; i !== buttons.length; ++i) {
    buttons[i].onclick = sendDtmfTone;
  }
}

function sendDtmfTone() {
  /*jshint validthis:true */
  sendTones(this.textContent);
}
