/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals TestCase, filterTurnUrls, assertEquals, randomString,
   queryStringToDictionary */

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

UtilsTest.prototype.testRandomReturnsCorrectLength = function() {
  assertEquals('13 length string', 13, randomString(13).length);
  assertEquals('5 length string', 5, randomString(5).length);
  assertEquals('10 length string', 10, randomString(10).length);
};

UtilsTest.prototype.testRandomReturnsCorrectCharacters = function() {
  var str = randomString(500);

  // randromString should return only the digits 0-9.
  var positiveRe = /^[0-9]+$/;
  var negativeRe = /[^0-9]/;

  var positiveResult = positiveRe.exec(str);
  var negativeResult = negativeRe.exec(str);

  assertEquals(
      'Number only regular expression should match.',
      0, positiveResult.index);
  assertEquals(
      'Anything other than digits regular expression should not match.',
      null, negativeResult);
};

UtilsTest.prototype.testQueryStringToDictionary = function() {
  var dictionary = {
    'foo': 'a',
    'bar': 'b',
    'tee': ''
  };
  var query = '?';
  for (var key in dictionary) {
    query += key + '=' + dictionary[key] + '&';
  }
  window.location.search = query;
  var result = queryStringToDictionary();
  assertEquals(JSON.stringify(dictionary), JSON.stringify(result));

  window.location.search = '?';
  result = queryStringToDictionary();
  assertEquals(0, Object.keys(result).length);

  window.location.search = '?=';
  result = queryStringToDictionary();
  assertEquals(0, Object.keys(result).length);

  window.location.search = '?&=';
  result = queryStringToDictionary();
  assertEquals(0, Object.keys(result).length);

  window.location.search = '';
  result = queryStringToDictionary();
  assertEquals(0, Object.keys(result).length);

  window.location.search = '?=abc';
  result = queryStringToDictionary();
  assertEquals(0, Object.keys(result).length);
};
