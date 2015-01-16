/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

var AdapterTest = new TestCase('AdapterTest');

AdapterTest.prototype.setUp = function() {
  window.console.log("Setting stuff up!");
};

AdapterTest.prototype.tearDown = function() {
  window.console.log("Tearing stuff down!");
};

// FakeReportStruct is basically a dictionary but with accessor
// functions. This is the way that Chrome returns stats to us.
var FakeReportStruct = function(id, timestamp, type, obj) {
  this.id = id;
  this.timestamp = timestamp;
  this.type = type;
  this.obj = obj;
};

FakeReportStruct.prototype.names = function() {
  return Object.keys(this.obj);
};

FakeReportStruct.prototype.stat = function(key) {
  return this.obj[key];
};

AdapterTest.prototype.testWhich = function() {
  var chromeReport0 = new FakeReportStruct('chromeReport0', '1234', 'audio', {
    'field1': 'value1',
    'field2': 'value2',
  });
  var chromeReport1 = new FakeReportStruct('chromeReport1', '1234', 'video', {
    'field1': 'value1',
    'field3': 'value3',
  });
  var chromeReport2 = new FakeReportStruct('chromeReport2', '1234', 'data', {
    'field1': 'value1',
    'field2': 'value2',
    'field3': 'value3',
  });

  var report = {}
  report.result = function() {
    return [chromeReport0, chromeReport1, chromeReport2];
  }

  fixedStats = RTCPeerConnection.fixChromeStats(report);
  assertEquals(fixedStats, {
    'chromeReport0': {
      'id': 'chromeReport0',
      'timestamp': '1234',
      'type': 'audio',
      'field1': 'value1',
      'field2': 'value2',
    },
    'chromeReport1': {
      'id': 'chromeReport1',
      'timestamp': '1234',
      'type': 'video',
      'field1': 'value1',
      'field3': 'value3',
    },
    'chromeReport2': {
      'id': 'chromeReport2',
      'timestamp': '1234',
      'type': 'data',
      'field1': 'value1',
      'field2': 'value2',
      'field3': 'value3',
    }
  });

};
