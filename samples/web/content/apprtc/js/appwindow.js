/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
// Variables defined in and used from main.js.
/* globals randomString, initialize */
/* exported params */
'use strict';

// Provide default params set to the values returned by apprtc.appspot.com.
var params = {
  errorMessages: [],
  isLoopback: false,
  mediaConstraints: {
    'audio': true,
    'video': {
      'optional': [{
        'minWidth': '1280'
      }, {
        'minHeight': '720'
      }],
      'mandatory': {}
    }
  },
  offerConstraints: {
    'optional': [],
    'mandatory': {}
  },
  peerConnectionConfig: {
    'iceServers': []
  },
  peerConnectionConstraints: {
    'optional': [{
      'googImprovedWifiBwe': true
    }]
  },
  turnRequestUrl: 'https://computeengineondemand.appspot.com/turn?username=073557600&key=4080218913',
  turnTransports: '',
  audioSendBitrate: '',
  audioSendCodec: '',
  audioRecvBitrate: '',
  audioRecvCodec: '',
  isStereoscopic: '',
  opusMaxPbr: '',
  opusFec: '',
  opusStereo: '',
  videoSendBitrate: '',
  videoSendInitialBitrate: '',
  videoSendCodec: '',
  videoRecvBitrate: '',
  videoRecvCodec: '',
  wssUrl: 'wss://apprtc-ws.webrtc.org:443/ws',
  wssPostUrl: 'https://apprtc-ws.webrtc.org:443'
};

// Generate random room id and connect.
params.roomId = randomString(9);
params.roomLink =  'https://apprtc.appspot.com/room/' + params.roomId;
params.roomServer = 'https://apprtc.appspot.com';

var joinRoomLink = document.querySelector('#room-link-href');
joinRoomLink.href = params.roomLink;
joinRoomLink.text = params.roomLink;

var appController = new AppController(params);