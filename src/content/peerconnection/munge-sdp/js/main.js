/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var getMediaButton = document.querySelector('button#getMedia');
var createPeerConnectionButton =
    document.querySelector('button#createPeerConnection');
var createOfferButton = document.querySelector('button#createOffer');
var setOfferButton = document.querySelector('button#setOffer');
var createAnswerButton = document.querySelector('button#createAnswer');
var setAnswerButton = document.querySelector('button#setAnswer');
var hangupButton = document.querySelector('button#hangup');
var dataChannelDataReceived;

getMediaButton.onclick = getMedia;
createPeerConnectionButton.onclick = createPeerConnection;
createOfferButton.onclick = createOffer;
setOfferButton.onclick = setOffer;
createAnswerButton.onclick = createAnswer;
setAnswerButton.onclick = setAnswer;
hangupButton.onclick = hangup;

var offerSdpTextarea = document.querySelector('div#local textarea');
var answerSdpTextarea = document.querySelector('div#remote textarea');

var audioSelect = document.querySelector('select#audioSrc');
var videoSelect = document.querySelector('select#videoSrc');

audioSelect.onchange = videoSelect.onchange = getMedia;

var localVideo = document.querySelector('div#local video');
var remoteVideo = document.querySelector('div#remote video');

var selectSourceDiv = document.querySelector('div#selectSource');

var localPeerConnection;
var remotePeerConnection;
var localStream;
var sendChannel;
var receiveChannel;
var dataChannelOptions = {
  ordered: true
};
var dataChannelCounter = 0;
var sendDataLoop;
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

getSources();

function getSources() {
  if (typeof MediaStreamTrack === 'undefined') {
    alert(
      'This browser does not support MediaStreamTrack.\n\nTry Chrome Canary.');
  } else {
    navigator.mediaDevices.enumerateDevices().then(gotSources);
  }
}

function gotSources(sourceInfos) {
  selectSourceDiv.classList.remove('hidden');
  var audioCount = 0;
  var videoCount = 0;
  for (var i = 0; i < sourceInfos.length; i++) {
    var option = document.createElement('option');
    option.value = sourceInfos[i].deviceId;
    option.text = sourceInfos[i].label;
    if (sourceInfos[i].kind === 'audioinput') {
      audioCount++;
      if (option.text === '') {
        option.text = 'Audio ' + audioCount;
      }
      audioSelect.appendChild(option);
    } else if (sourceInfos[i].kind === 'videoinput') {
      videoCount++;
      if (option.text === '') {
        option.text = 'Video ' + videoCount;
      }
      videoSelect.appendChild(option);
    } else {
      console.log('unknown', JSON.stringify(sourceInfos[i]));
    }
  }
}

function getMedia() {
  getMediaButton.disabled = true;
  createPeerConnectionButton.disabled = false;

  if (localStream) {
    localVideo.srcObject = null;
    localStream.getTracks().forEach(function(track) {
      track.stop();
    });
  }
  var audioSource = audioSelect.value;
  trace('Selected audio source: ' + audioSource);
  var videoSource = videoSelect.value;
  trace('Selected video source: ' + videoSource);

  var constraints = {
    audio: {
      optional: [{
        sourceId: audioSource
      }]
    },
    video: {
      optional: [{
        sourceId: videoSource
      }]
    }
  };
  trace('Requested local stream');
  navigator.mediaDevices.getUserMedia(constraints)
  .then(gotStream)
  .catch(function(e) {
    console.log('navigator.getUserMedia error: ', e);
  });
}

function gotStream(stream) {
  trace('Received local stream');
  localVideo.srcObject = stream;
  localStream = stream;
}

function createPeerConnection() {
  createPeerConnectionButton.disabled = true;
  createOfferButton.disabled = false;
  createAnswerButton.disabled = false;
  setOfferButton.disabled = false;
  setAnswerButton.disabled = false;
  hangupButton.disabled = false;
  trace('Starting call');
  var videoTracks = localStream.getVideoTracks();
  var audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace('Using video device: ' + videoTracks[0].label);
  }
  if (audioTracks.length > 0) {
    trace('Using audio device: ' + audioTracks[0].label);
  }
  var servers = null;

  localPeerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object localPeerConnection');
  localPeerConnection.onicecandidate = function(e) {
    onIceCandidate(localPeerConnection, e);
  };
  if (RTCPeerConnection.prototype.createDataChannel) {
    sendChannel = localPeerConnection.createDataChannel('sendDataChannel',
        dataChannelOptions);
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;
    sendChannel.onerror = onSendChannelStateChange;
  }

  remotePeerConnection = new RTCPeerConnection(servers);
  trace('Created remote peer connection object remotePeerConnection');
  remotePeerConnection.onicecandidate = function(e) {
    onIceCandidate(remotePeerConnection, e);
  };
  remotePeerConnection.ontrack = gotRemoteStream;
  remotePeerConnection.ondatachannel = receiveChannelCallback;

  localStream.getTracks().forEach(
    function(track) {
      localPeerConnection.addTrack(
        track,
        localStream
      );
    }
  );
  trace('Adding Local Stream to peer connection');
}

function onSetSessionDescriptionSuccess() {
  trace('Set session description success.');
}

function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

// Workaround for crbug/322756.
function maybeAddLineBreakToEnd(sdp) {
  var endWithLineBreak = new RegExp(/\n$/);
  if (!endWithLineBreak.test(sdp)) {
    return sdp + '\n';
  }
  return sdp;
}

function createOffer() {
  localPeerConnection.createOffer(
    offerOptions
  ).then(
    gotDescription1,
    onCreateSessionDescriptionError
  );
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function setOffer() {
  var sdp = offerSdpTextarea.value;
  sdp = maybeAddLineBreakToEnd(sdp);
  sdp = sdp.replace(/\n/g, '\r\n');
  var offer = {
    type: 'offer',
    sdp: sdp
  };
  localPeerConnection.setLocalDescription(offer).then(
    onSetSessionDescriptionSuccess,
    onSetSessionDescriptionError
  );
  trace('Modified Offer from localPeerConnection \n' + sdp);
  remotePeerConnection.setRemoteDescription(offer).then(
    onSetSessionDescriptionSuccess,
    onSetSessionDescriptionError
  );
}

function gotDescription1(description) {
  offerSdpTextarea.disabled = false;
  offerSdpTextarea.value = description.sdp;
}

function createAnswer() {
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  remotePeerConnection.createAnswer().then(
    gotDescription2,
    onCreateSessionDescriptionError
  );
}

function setAnswer() {
  var sdp = answerSdpTextarea.value;
  sdp = maybeAddLineBreakToEnd(sdp);
  sdp = sdp.replace(/\n/g, '\r\n');
  var answer = {
    type: 'answer',
    sdp: sdp
  };
  remotePeerConnection.setLocalDescription(answer).then(
    onSetSessionDescriptionSuccess,
    onSetSessionDescriptionError
  );
  trace('Modified Answer from remotePeerConnection \n' + sdp);
  localPeerConnection.setRemoteDescription(answer).then(
    onSetSessionDescriptionSuccess,
    onSetSessionDescriptionError
  );
}

function gotDescription2(description) {
  answerSdpTextarea.disabled = false;
  answerSdpTextarea.value = description.sdp;
}

function sendData() {
  sendChannel.send(dataChannelCounter);
  trace('DataChannel send counter: ' + dataChannelCounter);
  dataChannelCounter++;
}

function hangup() {
  remoteVideo.srcObject = null;
  trace('Ending call');
  localStream.getTracks().forEach(function(track) {
    track.stop();
  });
  sendChannel.close();
  if (receiveChannel) {
    receiveChannel.close();
  }
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  offerSdpTextarea.disabled = true;
  answerSdpTextarea.disabled = true;
  getMediaButton.disabled = false;
  createPeerConnectionButton.disabled = true;
  createOfferButton.disabled = true;
  setOfferButton.disabled = true;
  createAnswerButton.disabled = true;
  setAnswerButton.disabled = true;
  hangupButton.disabled = true;
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    trace('Received remote stream');
  }
}

function getOtherPc(pc) {
  return (pc === localPeerConnection) ? remotePeerConnection :
      localPeerConnection;
}

function getName(pc) {
  return (pc === localPeerConnection) ? 'localPeerConnection' :
      'remotePeerConnection';
}

function onIceCandidate(pc, event) {
  getOtherPc(pc).addIceCandidate(event.candidate)
  .then(
    function() {
      onAddIceCandidateSuccess(pc);
    },
    function(err) {
      onAddIceCandidateError(pc, err);
    }
  );
  trace(getName(pc) + ' ICE candidate: \n' + (event.candidate ?
      event.candidate.candidate : '(null)'));
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add Ice Candidate: ' + error.toString());
}

function receiveChannelCallback(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(event) {
  dataChannelDataReceived = event.data;
  trace('DataChannel receive counter: ' + dataChannelDataReceived);
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    sendDataLoop = setInterval(sendData, 1000);
  } else {
    clearInterval(sendDataLoop);
  }
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
