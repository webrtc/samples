/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals TestCase, maybePreferCodec, removeCodecParam, setCodecParam,
   assertEquals */

'use strict';

var SDP_WITH_AUDIO_CODECS =
    ['v=0',
     'm=audio 9 RTP/SAVPF 111 103 104 0 9',
     'a=rtcp-mux',
     'a=rtpmap:111 opus/48000/2',
     'a=fmtp:111 minptime=10',
     'a=rtpmap:103 ISAC/16000',
     'a=rtpmap:9 G722/8000',
     'a=rtpmap:0 PCMU/8000',
     'a=rtpmap:8 PCMA/8000',
    ].join('\r\n');

var SdpUtilsTest = new TestCase('SdpUtilsTest');

SdpUtilsTest.prototype.testMovesIsac16KToDefaultWhenPreferred = function() {
  var result = maybePreferCodec(SDP_WITH_AUDIO_CODECS, 'audio', 'send',
                                'iSAC/16000');
  var audioLine = result.split('\r\n')[1];
  assertEquals('iSAC 16K (of type 103) should be moved to front.',
               'm=audio 9 RTP/SAVPF 103 111 104 0 9',
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

SdpUtilsTest.prototype.testMovesCodecEvenIfPayloadTypeIsSameAsUdpPort =
    function() {
      var result = maybePreferCodec(SDP_WITH_AUDIO_CODECS,
                                    'audio',
                                    'send',
                                    'G722/8000');
      var audioLine = result.split('\r\n')[1];
      assertEquals('G722/8000 (of type 9) should be moved to front.',
                   'm=audio 9 RTP/SAVPF 9 111 103 104 0',
                   audioLine);
    };

SdpUtilsTest.prototype.testRemoveAndSetCodecParamModifyFmtpLine =
    function() {
      var result = setCodecParam(SDP_WITH_AUDIO_CODECS, 'opus/48000',
                                 'minptime', '20');
      var audioLine = result.split('\r\n')[4];
      assertEquals('minptime=10 should be modified in a=fmtp:111 line.',
                   'a=fmtp:111 minptime=20', audioLine);

      result = setCodecParam(result, 'opus/48000', 'useinbandfec', '1');
      audioLine = result.split('\r\n')[4];
      assertEquals('useinbandfec=1 should be added to a=fmtp:111 line.',
                   'a=fmtp:111 minptime=20; useinbandfec=1', audioLine);

      result = removeCodecParam(result, 'opus/48000', 'minptime');
      audioLine = result.split('\r\n')[4];
      assertEquals('minptime should be removed from a=fmtp:111 line.',
                   'a=fmtp:111 useinbandfec=1', audioLine);

      var newResult = removeCodecParam(result, 'opus/48000', 'minptime');
      assertEquals('removeCodecParam should not affect sdp ' +
                   'if param did not exist', result, newResult);
    };

SdpUtilsTest.prototype.testRemoveAndSetCodecParamRemoveAndAddFmtpLineIfNeeded =
    function() {
      var result = removeCodecParam(SDP_WITH_AUDIO_CODECS, 'opus/48000',
                                    'minptime');
      var audioLine = result.split('\r\n')[4];
      assertEquals('a=fmtp:111 line should be deleted.',
                   'a=rtpmap:103 ISAC/16000', audioLine);
      result = setCodecParam(result, 'opus/48000', 'inbandfec', '1');
      audioLine = result.split('\r\n')[4];
      assertEquals('a=fmtp:111 line should be added.',
                   'a=fmtp:111 inbandfec=1', audioLine);
    };
