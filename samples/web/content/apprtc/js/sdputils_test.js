/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

use strict;

SdpUtilsTest = TestCase("SdpUtilsTest");

SdpUtilsTest.prototype.testMovesIsac16KToDefaultWhenPreferred = function() {
  var sdp = 
      ['v=0',
       'm=audio 1 RTP/SAVPF 111 103 104 0 8 106 105 13 126',
       'a=rtcp-mux',
       'a=rtpmap:111 opus/48000/2',
       'a=fmtp:111 minptime=10',
       'a=rtpmap:103 ISAC/16000',
       'a=rtpmap:104 ISAC/32000',
       'a=rtpmap:0 PCMU/8000',
       'a=rtpmap:8 PCMA/8000',
       'a=rtpmap:106 CN/32000',
       'a=rtpmap:105 CN/16000',
       'a=rtpmap:13 CN/8000',
       'a=rtpmap:126 telephone-event/8000',
       'a=maxptime:60',
       'a=ssrc:1123423857'
      ].join('\r\n');

  var result = maybePreferCodec(sdp, 'audio', 'send', 'iSAC/16000');
  var audioLine = result.split('\r\n')[1];
  assertEquals('iSAC 16K (of type 103) should be moved to front.',
               'm=audio 1 RTP/SAVPF 103 111 104 0 8 106 105 13 126',
               result[1]);
};
