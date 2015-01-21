/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals TestCase, assertEquals, InfoBox */

'use strict';

var InfoBoxTest = new TestCase('InfoBoxTest');

InfoBoxTest.prototype.testFormatBitrate = function() {
  assertEquals('Format bps.', '789 bps', InfoBox.formatBitrate_(789));
  assertEquals('Format kbps.', '78.9 kbps', InfoBox.formatBitrate_(78912));
  assertEquals('Format Mbps.', '7.89 Mbps', InfoBox.formatBitrate_(7891234));
};

InfoBoxTest.prototype.testFormatInterval = function() {
  assertEquals('Format 00:01', '00:01', InfoBox.formatInterval_(1999));
  assertEquals('Format 00:12', '00:12', InfoBox.formatInterval_(12500));
  assertEquals('Format 01:23', '01:23', InfoBox.formatInterval_(83123));
  assertEquals('Format 12:34', '12:34', InfoBox.formatInterval_(754000));
  assertEquals('Format 01:23:45', '01:23:45',
      InfoBox.formatInterval_(5025000));
  assertEquals('Format 12:34:56', '12:34:56',
      InfoBox.formatInterval_(45296000));
  assertEquals('Format 123:45:43', '123:45:43',
      InfoBox.formatInterval_(445543000));
};
