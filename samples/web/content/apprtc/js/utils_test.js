/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals TestCase, filterTurnUrls, assertEquals */

'use strict';

var TURN_URLS = [
    'turn:turn.example.com?transport=tcp',
    'turn:turn.example.com?transport=udp',
    'turn:turn.example.com:8888?transport=udp',
    'turn:turn.example.com:8888?transport=tcp'
];

var TURN_URLS_UDP = [
    'turn:turn.example.com?transport=udp',
    'turn:turn.example.com:8888?transport=udp',
];

var TURN_URLS_TCP = [
    'turn:turn.example.com?transport=tcp',
    'turn:turn.example.com:8888?transport=tcp'
];

var UtilsTest = new TestCase('UtilsTest');

UtilsTest.prototype.testFilterTurnUrlsUdp = function() {
  var urls = TURN_URLS.slice(0);  // make a copy
  filterTurnUrls(urls, 'udp');
  assertEquals('Only transport=udp URLs should remain.', TURN_URLS_UDP, urls);
};

UtilsTest.prototype.testFilterTurnUrlsTcp = function() {
  var urls = TURN_URLS.slice(0);  // make a copy
  filterTurnUrls(urls, 'tcp');
  assertEquals('Only transport=tcp URLs should remain.', TURN_URLS_TCP, urls);
};

