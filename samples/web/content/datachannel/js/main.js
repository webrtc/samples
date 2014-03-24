var pc1, pc2, sendChannel, receiveChannel, pcConstraint, dataConstraint;
var dataChannelSend = document.querySelector('textarea#dataChannelSendId');
var dataChannelReceive = document.querySelector('textarea#dataChannelReceiveId');
var sctpSelect = document.querySelector('input#useSctp');
var rtpSelect = document.querySelector('input#useRtp');
var startButton = document.querySelector('button#startButton');
var sendButton = document.querySelector('button#sendButton');
var closeButton = document.querySelector('button#closeButton');

startButton.onclick = createConnection;
sendButton.onclick = sendData;
closeButton.onclick = closeDataChannels;
rtpSelect.onclick = enableStartButton;
sctpSelect.onclick = enableStartButton;

function enableStartButton() {
  startButton.disabled = false;
}

function disableSendButton() {
  sendButton.disabled = true;
}

rtpSelect.onclick = sctpSelect.onclick = function() {
  dataChannelReceive.value = '';
  dataChannelSend.value = '';
  disableSendButton();
  enableStartButton();
};

function createConnection() {
  dataChannelSendId.placeholder = '';
  var servers = null;
  pcConstraint = null;
  dataConstraint = null;
  if (sctpSelect.checked &&
     (webrtcDetectedBrowser === 'chrome' && webrtcDetectedVersion >= 31) ||
      webrtcDetectedBrowser === 'firefox'){
    // SCTP is supported from Chrome M31 and is supported in FF.
    // No need to pass DTLS constraint as it is on by default in Chrome M31.
    // For SCTP, reliable and ordered is true by default.
    trace('Using SCTP based Data Channels');
  } else {
    pcConstraint = {optional: [{RtpDataChannels: true}]};
    if (!rtpSelect.checked) {
      // Use rtp data channels for chrome versions older than M31.
      trace('Using RTP based Data Channels,' +
            'as you are on an older version than M31.');
      alert('Reverting to RTP based data channels,' +
            'as you are on an older version than M31.');
      rtpSelect.checked = true;
    }
  }
  pc1 = new RTCPeerConnection(servers, pcConstraint);
  trace('Created local peer connection object pc1');

  try {
    // Data Channel api supported from Chrome M25.
    // You might need to start chrome with  --enable-data-channels flag.
    sendChannel = pc1.createDataChannel('sendDataChannel', dataConstraint);
    trace('Created send data channel');
  } catch (e) {
    alert('Failed to create data channel. ' +
          'You need Chrome M25 or later with --enable-data-channels flag');
    trace('Create Data channel failed with exception: ' + e.message);
  }
  pc1.onicecandidate = iceCallback1;
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onclose = onSendChannelStateChange;

  pc2 = new RTCPeerConnection(servers, pcConstraint);
  trace('Created remote peer connection object pc2');

  pc2.onicecandidate = iceCallback2;
  pc2.ondatachannel = receiveChannelCallback;

  pc1.createOffer(gotDescription1, onCreateSessionDescriptionError);
  startButton.disabled = true;
  closeButton.disabled = false;
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function sendData() {
  var data = dataChannelSend.value;
  sendChannel.send(data);
  trace('Sent Data: ' + data);
}

function closeDataChannels() {
  trace('Closing data Channels');
  sendChannel.close();
  trace('Closed data channel with label: ' + sendChannel.label);
  receiveChannel.close();
  trace('Closed data channel with label: ' + receiveChannel.label);
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  trace('Closed peer connections');
  startButton.disabled = false;
  sendButton.disabled = true;
  closeButton.disabled = true;
  dataChannelSend.value = '';
  dataChannelReceive.value = '';
  dataChannelSend.disabled = true;
}

function gotDescription1(desc) {
  pc1.setLocalDescription(desc);
  trace('Offer from pc1 \n' + desc.sdp);
  pc2.setRemoteDescription(desc);
  pc2.createAnswer(gotDescription2, onCreateSessionDescriptionError);
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc);
  trace('Answer from pc2 \n' + desc.sdp);
  pc1.setRemoteDescription(desc);
}

function iceCallback1(event) {
  trace('local ice callback');
  if (event.candidate) {
    pc2.addIceCandidate(event.candidate,
                        onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Local ICE candidate: \n' + event.candidate.candidate);
  }
}

function iceCallback2(event) {
  trace('remote ice callback');
  if (event.candidate) {
    pc1.addIceCandidate(event.candidate,
                        onAddIceCandidateSuccess, onAddIceCandidateError);
    trace('Remote ICE candidate: \n ' + event.candidate.candidate);
  }
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
  trace('Received Message');
  dataChannelReceive.value = event.data;
}

function onSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState == 'open') {
    dataChannelSend.disabled = false;
    dataChannelSendId.focus();
    sendButton.disabled = false;
    closeButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function onReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
