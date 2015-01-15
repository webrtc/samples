/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
// Variables defined in and used from main.js.
/* globals randomString, AppController, sendAsyncUrlRequest, parseJSON */
/* exported params */
'use strict';

// Generate random room id and connect.

var roomServer = 'https://apprtc.appspot.com';
var loadingParams = {
  errorMessages: [],
  roomId: randomString(9),
  roomServer: roomServer,
  paramsFunction: function() {
    return new Promise(function(resolve, reject) {
      trace('Initializing; retrieving params from: ' + roomServer + '/params');
      sendAsyncUrlRequest('GET', roomServer + '/params').then(function(result) {
        var serverParams = parseJSON(result);
        var newParams = {};
        if (!serverParams)
        {
          resolve(newParams);
          return;
        }
        
        // Convert from server format to expected format.
        // TODO(tkchin): clean up response format. JSHint doesn't like it.
        /* jshint ignore:start */
        newParams.isLoopback = serverParams.is_loopback === 'true';
        newParams.mediaConstraints = parseJSON(serverParams.media_constraints);
        newParams.offerConstraints = parseJSON(serverParams.offer_constraints);
        newParams.peerConnectionConfig = parseJSON(serverParams.pc_config);
        newParams.peerConnectionConstraints = parseJSON(serverParams.pc_constraints);
        newParams.turnRequestUrl = serverParams.turn_url;
        newParams.turnTransports = serverParams.turn_transports;
        newParams.audioSendBitrate = serverParams.asbr;
        newParams.audioSendCodec = serverParams.audio_send_codec;
        newParams.audioRecvBitrate = serverParams.arbr;
        newParams.audioRecvCodec = serverParams.audio_receive_codec;
        newParams.opusMaxPbr = serverParams.opusmaxpbr;
        newParams.opusFec = serverParams.opusfec;
        newParams.videoSendBitrate = serverParams.vsbr;
        newParams.videoSendInitialBitrate = serverParams.vsibr;
        newParams.videoSendCodec = serverParams.video_send_codec;
        newParams.videoRecvBitrate = serverParams.vrbr;
        newParams.videoRecvCodec = serverParams.video_receive_codec;
        newParams.wssUrl = serverParams.wss_url;
        newParams.wssPostUrl = serverParams.wss_post_url;
        /* jshint ignore:end */
        newParams.messages = serverParams.messages;
        
        trace('Initializing; parameters from server: ');
        trace(JSON.stringify(newParams));
        resolve(newParams);
      }).catch(function(error) {
        trace('Initializing; error getting params from server: ' + error.message);
        reject(error);
      });
    });
  }
};

new AppController(loadingParams);