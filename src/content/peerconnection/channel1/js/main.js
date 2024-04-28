/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const socketConnectButton = document.getElementById('socketConnectButton');
const testSendSocketMsgButton = document.getElementById('testSendSocketMsgButton');
const user1Button = document.getElementById('user1Button');
const user2Button = document.getElementById('user2Button');

const callingButton = document.getElementById('callingButton');
const acceptButton = document.getElementById('acceptButton');
const rejectButton = document.getElementById('rejectButton');

const hangupButton = document.getElementById('hangupButton');
hangupButton.disabled = true;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

user1Button.disabled = false
user2Button.disabled = false
socketConnectButton.disabled = true
testSendSocketMsgButton.disabled = true
callingButton.disabled = true
acceptButton.disabled = true
rejectButton.disabled = true
hangupButton.disabled = true

// 创建一个WebSocket客户端实例
let socket = null;
let test_uid = null;

const rtcConfig = {
  iceServers: [
    {
      urls: ["stun:101.233.131.223:3478"],
      username: "syfhadmin",
      credential: "syfhadmin123fail"
    },
    {
      urls: ["turn:101.233.131.223:3478"],
      // username: "turn20241111",
      // credential: "adfsdfsgsgdgiisdfjdgsdh335gsdguet"
      username: "syfhadmin",
      credential: "syfhadmin123fail"
    }
  ]
}

let pc;
let localStream;

user1Button.onclick = async () => {
  test_uid = 1
  user1Button.disabled = true
  user2Button.disabled = true

  socketConnectButton.disabled = false
};
user2Button.onclick = async () => {
  test_uid = 2
  user1Button.disabled = true
  user2Button.disabled = true

  socketConnectButton.disabled = false
};
testSendSocketMsgButton.onclick = async () => {
  if (!test_uid) {
    return
  }

  // 发送一个消息到服务器
  socket.send(JSON.stringify({
    type: 'webrtc_test',
    from_appid: 'browser',
    from_uid: test_uid,
    to_appid: 'browser',
    to_uid: test_uid == 1 ? 2 : 1,
    content: 'hello, webrtc!!'
  }));
}
callingButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
  console.log(' --- localStream => ', localStream)
  localVideo.srcObject = localStream;

  if (!pc) {
    await createPC()
    await sendOffer()
  }

  socket.send(JSON.stringify({
    type: 'webrtc_calling',
    from_appid: 'browser',
    from_uid: test_uid,
    to_appid: 'browser',
    to_uid: test_uid == 1 ? 2 : 1
  }));

  callingButton.disabled = true
  acceptButton.disabled = true
  rejectButton.disabled = true
  hangupButton.disabled = false
}
acceptButton.onclick = async () => {
  socket.send(JSON.stringify({
    type: 'webrtc_accept',
    from_appid: 'browser',
    from_uid: test_uid,
    to_appid: 'browser',
    to_uid: test_uid == 1 ? 2 : 1
  }));
  answerCalling(true)
  callingButton.disabled = true
  acceptButton.disabled = true
  rejectButton.disabled = true
  hangupButton.disabled = false
}
rejectButton.onclick = async () => {
  socket.send(JSON.stringify({
    type: 'webrtc_reject',
    from_appid: 'browser',
    from_uid: test_uid,
    to_appid: 'browser',
    to_uid: test_uid == 1 ? 2 : 1
  }));
  answerCalling(false)
}
socketConnectButton.onclick = async () => {
  socketConnectButton.disabled = true
  testSendSocketMsgButton.disabled = false
  callingButton.disabled = false

  if (socket) {
    return
  }
  socket = new WebSocket('ws://192.168.1.2:9014/app_socket');
 
  // 当WebSocket连接打开时触发
  socket.onopen = (event) => {
    console.log('WebSocket客户端连接已打开。');
  }
  
  // 当接收到服务器发送的消息时触发
  socket.onmessage = async (event) => {
    console.log('收到服务器消息: event => ', event);
    let res_data = JSON.parse(event.data)

    if (res_data.type == '0') {
      let client_id = res_data.client_id

      socket.send(JSON.stringify({
        ctype: 100,
        client_appid: 'browser',
        client_webrtc_id: client_id,
        client_uid: test_uid
      }));
      return
    }

    if (res_data.type == 'webrtc_calling') {
      let from_appid = res_data.from_appid
      let from_uid = res_data.from_uid
      console.log(` ---- from ${from_uid} calling ... `)

      callingButton.disabled = true
      acceptButton.disabled = false
      rejectButton.disabled = false
      hangupButton.disabled = true

      return
    }

    if (res_data.type == 'webrtc_accept') {
      let from_appid = res_data.from_appid
      let from_uid = res_data.from_uid
      console.log(` ---- from ${from_uid} accept ... `)

      callingButton.disabled = true
      acceptButton.disabled = true
      rejectButton.disabled = true
      hangupButton.disabled = false

      return
    }

    if (res_data.type == 'webrtc_reject') {
      let from_appid = res_data.from_appid
      let from_uid = res_data.from_uid
      console.log(` ---- from ${from_uid} reject ... `)
      hangup()
      return
    }

    if (res_data.type == 'webrtc_hangup') {
      let from_appid = res_data.from_appid
      let from_uid = res_data.from_uid
      console.log(` ---- from ${from_uid} hangup ... `)
      hangup()
      return
    }
    
    if (res_data.type == 'webrtc_candidate') {
      let from_appid = res_data.from_appid
      let from_uid = res_data.from_uid
      let candidate = res_data.payload
      if (!candidate) {
        await pc.addIceCandidate(null);
        return
      }
      if (!candidate.candidate) {
        await pc.addIceCandidate(null);
      } else {
        await pc.addIceCandidate(candidate);
      }

      return
    }

    if (res_data.type == 'webrtc_offer') {
      let from_appid = res_data.from_appid
      let from_uid = res_data.from_uid
      let offer = res_data.payload
      
      if (!pc) {
        await createPC()
      }
      console.log('received webrtc_offer, offer => ', offer)
      await pc.setRemoteDescription(offer)

      return
    }

    if (res_data.type == 'webrtc_answer') {
      let from_appid = res_data.from_appid
      let from_uid = res_data.from_uid
      let answer = res_data.payload
      console.log('received webrtc_answer, answer => ', answer)
      
      await pc.setRemoteDescription(answer)

      return
    }
  }
  
  // 当WebSocket连接关闭时触发
  socket.onclose = (event) => {
    console.log('WebSocket客户端连接已关闭: event => ', event);
    socket = null;
  }
  
  // 处理错误
  socket.onerror = (event) => {
    console.error('WebSocket客户端出错: event => ', event);
  }
};

async function answerCalling(opt) {
  if (!opt) {
    hangup()
    return
  }
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
  }
  localVideo.srcObject = localStream;

  if (!pc) {
    await createPC()
  }
  
  const answer = await pc.createAnswer();
  console.log('pc.createAnswer(), answer => ', answer)
  await pc.setLocalDescription(answer);

  socket.send(JSON.stringify({
    type: 'webrtc_answer',
    from_appid: 'browser',
    from_uid: test_uid,
    to_appid: 'browser',
    to_uid: test_uid == 1 ? 2 : 1,
    payload: answer
  }));
}


hangupButton.onclick = async () => {
  socket.send(JSON.stringify({
    type: 'webrtc_hangup',
    from_appid: 'browser',
    from_uid: test_uid,
    to_appid: 'browser',
    to_uid: test_uid == 1 ? 2 : 1
  }));
  hangup();
};

async function hangup() {
  if (pc) {
    pc.close();
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;

  callingButton.disabled = false
  acceptButton.disabled = true
  rejectButton.disabled = true
  hangupButton.disabled = true
};

async function createPC() {
  pc = new RTCPeerConnection(rtcConfig);
  pc.ontrack = e => {
    console.log(' ------ ontrack --- , e => ', e)
    if (remoteVideo.srcObject !== e.streams[0]) {
      console.log('remotePeerConnection got stream ... ');
      remoteVideo.srcObject = e.streams[0];
    }
  }
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
  }
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  pc.onnegotiationneeded = () => console.log('Negotiation needed - localPeerConnection');
  pc.onicecandidate = e => {
    socket.send(JSON.stringify({
      type: 'webrtc_candidate',
      from_appid: 'browser',
      from_uid: test_uid,
      to_appid: 'browser',
      to_uid: test_uid == 1 ? 2 : 1,
      payload: e.candidate
    }));
  };
}
async function sendOffer() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.send(JSON.stringify({
    type: 'webrtc_offer',
    from_appid: 'browser',
    from_uid: test_uid,
    to_appid: 'browser',
    to_uid: test_uid == 1 ? 2 : 1,
    payload: offer
  }));
}
