/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals TestCase, maybePreferCodec, assertEquals */

'use strict';

var SDP_WITH_AUDIO_CODECS = 
    ['v=0',
     'm=audio 1 RTP/SAVPF 111 103 104 0 8',
     'a=rtcp-mux',
     'a=rtpmap:111 opus/48000/2',
     'a=fmtp:111 minptime=10',
     'a=rtpmap:103 ISAC/16000',
     'a=rtpmap:104 ISAC/32000',
     'a=rtpmap:0 PCMU/8000',
     'a=rtpmap:8 PCMA/8000',
    ].join('\r\n');

var SdpUtilsTest = new TestCase('SdpUtilsTest');

SdpUtilsTest.prototype.testMovesIsac16KToDefaultWhenPreferred = function() {
  var result = maybePreferCodec(SDP_WITH_AUDIO_CODECS, 'audio', 'send',
                                'iSAC/16000');
  var audioLine = result.split('\r\n')[1];
  assertEquals('iSAC 16K (of type 103) should be moved to front.',
               'm=audio 1 RTP/SAVPF 103 111 104 0 8',
               audioLine);
};

SdpUtilsTest.prototype.testDoesNothingIfPreferredCodecNotFound = function() {
  var result = maybePreferCodec(SDP_WITH_AUDIO_CODECS, 'audio', 'send',
                                'iSAC/123456');
  var audioLine = result.split('\r\n')[1];
  assertEquals('SDP should be unaffected since the codec does not exist.',
               SDP_WITH_AUDIO_CODECS.split('\r\n')[1],
               audioLine);
};
