/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* global TimelineDataSeries, TimelineGraphView */

'use strict';

const remoteVideo = document.querySelector('video#remoteVideo');
const localVideo = document.querySelector('video#localVideo');
const callButton = document.querySelector('button#callButton');
const bandwidthSelector = document.querySelector('select#bandwidth');
const sourceSelector = document.querySelector('select#source');
const resolutionSelector = document.querySelector('select#resolution');
const codecSelector = document.querySelector('select#codec');
const upscaleToggle = document.getElementById("upscale");
const upscaledContainer=  document.getElementById("upscaled-container");
const feedContainer = document.getElementById("feeds-container");

callButton.onclick = call;

let pc1;
let pc2;
let localStream;

// Can be set in the console before making a call to test this keeps
// within the envelope set by the SDP. In kbps.
// eslint-disable-next-line prefer-const
let maxBandwidth = 0;

let bitrateGraph;
let bitrateSeries;
let headerrateSeries;


let height = 240;
let width = 320;

let packetGraph;
let packetSeries;

let upscaler;

let lastResult;

const offerOptions = {
  offerToReceiveAudio: 0,
  offerToReceiveVideo: 1
};

function gotStream(stream) {
  console.log('Received local stream');
  localStream = stream;
  localVideo.srcObject = stream;
  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  console.log('Adding Local Stream to peer connection');

  pc1.createOffer(
      offerOptions
  ).then(
      gotDescription1,
      onCreateSessionDescriptionError
  );

  bitrateSeries = new TimelineDataSeries();
  bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
  bitrateGraph.updateEndDate();

  headerrateSeries = new TimelineDataSeries();
  headerrateSeries.setColor('green');

  packetSeries = new TimelineDataSeries();
  packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
  packetGraph.updateEndDate();
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function call() {
  callButton.disabled = true;
  bandwidthSelector.disabled = false;
  resolutionSelector.disabled = true;
  console.log('Starting call');
  const servers = null;
  pc1 = new RTCPeerConnection(servers);
  console.log('Created local peer connection object pc1');
  pc1.onicecandidate = onIceCandidate.bind(pc1);

  pc2 = new RTCPeerConnection(servers);
  console.log('Created remote peer connection object pc2');
  pc2.onicecandidate = onIceCandidate.bind(pc2);
  pc2.ontrack = gotRemoteStream;

  console.log('Requesting local stream');
  navigator.mediaDevices.getUserMedia({video: { width:width, height: height }})
      .then(gotStream)
      .catch(e => console.warn('getUserMedia() error: ' + e.name));


  upscaler  = new Upscaler(document.getElementById("remoteVideo"), {width: width, height: height});


}

function gotDescription1(desc) {
  console.log('Offer from pc1 \n' + desc.sdp);
  pc1.setLocalDescription(desc).then(
      () => {
        pc2.setRemoteDescription(desc)
            .then(() => pc2.createAnswer().then(gotDescription2, onCreateSessionDescriptionError),
                onSetSessionDescriptionError);
      }, onSetSessionDescriptionError
  );
}

function gotDescription2(desc) {
  pc2.setLocalDescription(desc).then(
      () => {
        console.log('Answer from pc2 \n' + desc.sdp);
        let p;
        if (maxBandwidth) {
          p = pc1.setRemoteDescription({
            type: desc.type,
            sdp: updateBandwidthRestriction(desc.sdp, maxBandwidth)
          });
        } else {
          p = pc1.setRemoteDescription(desc);
        }
        p.then(() => {}, onSetSessionDescriptionError);
      },
      onSetSessionDescriptionError
  );
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log('Received remote stream');
  }
}

function getOtherPc(pc) {
  return pc === pc1 ? pc2 : pc1;
}

function getName(pc) {
  return pc === pc1 ? 'pc1' : 'pc2';
}

function onIceCandidate(event) {
  getOtherPc(this)
      .addIceCandidate(event.candidate)
      .then(onAddIceCandidateSuccess)
      .catch(onAddIceCandidateError);

  console.log(`${getName(this)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess() {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log('Failed to add ICE Candidate: ' + error.toString());
}

function onSetSessionDescriptionError(error) {
  console.log('Failed to set session description: ' + error.toString());
}

// renegotiate bandwidth on the fly.
bandwidthSelector.onchange = () => {
  bandwidthSelector.disabled = true;
  const bandwidth = bandwidthSelector.options[bandwidthSelector.selectedIndex].value;

  // In Chrome, use RTCRtpSender.setParameters to change bandwidth without
  // (local) renegotiation. Note that this will be within the envelope of
  // the initial maximum bandwidth negotiated via SDP.
  if ((adapter.browserDetails.browser === 'chrome' ||
       adapter.browserDetails.browser === 'safari' ||
       (adapter.browserDetails.browser === 'firefox' &&
        adapter.browserDetails.version >= 64)) &&
      'RTCRtpSender' in window &&
      'setParameters' in window.RTCRtpSender.prototype) {
    const sender = pc1.getSenders()[0];
    const parameters = sender.getParameters();
    if (!parameters.encodings) {
      parameters.encodings = [{}];
    }
    if (bandwidth === 'unlimited') {
      delete parameters.encodings[0].maxBitrate;
    } else {
      parameters.encodings[0].maxBitrate = bandwidth * 1000;
    }
    sender.setParameters(parameters)
        .then(() => {
          bandwidthSelector.disabled = false;
        })
        .catch(e => console.error(e));
    return;
  }
  // Fallback to the SDP munging with local renegotiation way of limiting
  // the bandwidth.
  pc1.createOffer()
      .then(offer => pc1.setLocalDescription(offer))
      .then(() => {
        const desc = {
          type: pc1.remoteDescription.type,
          sdp: bandwidth === 'unlimited' ?
          removeBandwidthRestriction(pc1.remoteDescription.sdp) :
          updateBandwidthRestriction(pc1.remoteDescription.sdp, bandwidth)
        };
        console.log('Applying bandwidth restriction to setRemoteDescription:\n' +
        desc.sdp);
        return pc1.setRemoteDescription(desc);
      })
      .then(() => {
        bandwidthSelector.disabled = false;
      })
      .catch(onSetSessionDescriptionError);
};

function updateBandwidthRestriction(sdp, bandwidth) {
  let modifier = 'AS';
  if (adapter.browserDetails.browser === 'firefox') {
    bandwidth = (bandwidth >>> 0) * 1000;
    modifier = 'TIAS';
  }
  if (sdp.indexOf('b=' + modifier + ':') === -1) {
    // insert b= after c= line.
    sdp = sdp.replace(/c=IN (.*)\r\n/, 'c=IN $1\r\nb=' + modifier + ':' + bandwidth + '\r\n');
  } else {
    sdp = sdp.replace(new RegExp('b=' + modifier + ':.*\r\n'), 'b=' + modifier + ':' + bandwidth + '\r\n');
  }
  return sdp;
}

function removeBandwidthRestriction(sdp) {
  return sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, '');
}



upscaleToggle.onchange = () =>{
    if(upscaleToggle.checked) upscaler.enable();
    else  upscaler.disable();
};


sourceSelector.onchange = () =>{

  if(sourceSelector.value === "local") upscaledContainer.style.visibility = "hidden";
  else upscaledContainer.style.visibility = "visible";

};


resolutionSelector.onchange = () =>{

  if(resolutionSelector.value === "240p"){
      height = 240;
      width = 320;


      feedContainer.style.width = "720px";
      feedContainer.style.height = "540px";

      localVideo.style.width = "720px";
      localVideo.style.height ="540px";

      upscaledContainer.style.width =  "720px";
      upscaledContainer.style.height = "540px";

  } else if(resolutionSelector.value === "360p") {

    height = 360;
    width = 480;

      feedContainer.style.width = "720px";
      feedContainer.style.height = "540px";

      localVideo.style.width = "720px";
      localVideo.style.height ="540px";

      upscaledContainer.style.width =  "720px";
      upscaledContainer.style.height = "540px";

  } else if(resolutionSelector.value === "360pw"){

      height = 360;
      width = 640;


      feedContainer.style.width = "920px";
      feedContainer.style.height = "540px";

      localVideo.style.width = "920px";
      localVideo.style.height ="540px";

      upscaledContainer.style.width =  "920px";
      upscaledContainer.style.height = "540px";
  }



    remoteVideo.width = width;
    remoteVideo.height = height;


};


// query getStats every second
window.setInterval(() => {
  if (!pc1) {
    return;
  }
  const sender = pc1.getSenders()[0];
  if (!sender) {
    return;
  }
  sender.getStats().then(res => {
    res.forEach(report => {
      let bytes;
      let headerBytes;
      let packets;
      if (report.type === 'outbound-rtp') {
        if (report.isRemote) {
          return;
        }
        const now = report.timestamp;
        bytes = report.bytesSent;
        headerBytes = report.headerBytesSent;

        packets = report.packetsSent;
        if (lastResult && lastResult.has(report.id)) {
          // calculate bitrate
          const bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) /
            (now - lastResult.get(report.id).timestamp);
          const headerrate = 8 * (headerBytes - lastResult.get(report.id).headerBytesSent) /
            (now - lastResult.get(report.id).timestamp);

          // append to chart
          bitrateSeries.addPoint(now, bitrate);
          headerrateSeries.addPoint(now, headerrate);
          bitrateGraph.setDataSeries([bitrateSeries, headerrateSeries]);
          bitrateGraph.updateEndDate();

          // calculate number of packets and append to chart
          packetSeries.addPoint(now, packets -
            lastResult.get(report.id).packetsSent);
          packetGraph.setDataSeries([packetSeries]);
          packetGraph.updateEndDate();
        }
      }
    });
    lastResult = res;
  });
}, 1000);
