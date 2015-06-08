/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

// Enable async testing since getStats uses a callback.
var AdapterTest = new AsyncTestCase('AdapterTest');

// Test getStats using the original Chrome ordering: successCallback,
// selector. This case does _not_ polyfill the results. It returns an
// object with a `results` getter. The getter returns an array of
// specialized maps.
AdapterTest.prototype.testOldGetStats = function(queue) {
  var pc = new RTCPeerConnection();

  var chromeReport0 =
      new FakeStatsReportStruct('chromeReport0', '1234', 'audio', {
	'field1': 'value1',
	'field2': 'value2',
      });
  var chromeReport1 =
      new FakeStatsReportStruct('chromeReport1', '1234', 'video', {
	'field1': 'value1',
	'field3': 'value3',
      });
  var chromeReport2 =
      new FakeStatsReportStruct('chromeReport2', '1234', 'data', {
	'field1': 'value1',
	'field2': 'value2',
	'field3': 'value3',
      });

  var report = {}
  report.result = function() {
    return [chromeReport0, chromeReport1, chromeReport2];
  }

  pc.fakeGetStatsData = report;

  var task = function(callbacks) {
    // Using the old argument style return whatever getStats returns to us.
    var success = callbacks.add(function (actualReport) {
      assertEquals(report.result(), actualReport.result());
    });
    pc.getStats(success);
  };

  // Call getStats using the old non-W3C argument spec.
  queue.call('getStats(successCallback)', task);
};

// Test getStats using W3C argument ordering: selector,
// successCallback, errorCallback. This triggers the polyfill to
// convert the Chrome style stats objects into the W3C standard
// format.
AdapterTest.prototype.testNewGetStats = function(queue) {
  var pc = new RTCPeerConnection();

  var chromeReport0 =
      new FakeStatsReportStruct('chromeReport0', '1234', 'audio', {
	'field1': 'value1',
	'field2': 'value2',
      });
  var chromeReport1 =
      new FakeStatsReportStruct('chromeReport1', '1234', 'video', {
	'field1': 'value1',
	'field3': 'value3',
      });
  var chromeReport2 =
      new FakeStatsReportStruct('chromeReport2', '1234', 'data', {
	'field1': 'value1',
	'field2': 'value2',
	'field3': 'value3',
  });

  var report = {}
  report.result = function() {
    return [chromeReport0, chromeReport1, chromeReport2];
  }

  pc.fakeGetStatsData = report;

  expectedStats = {
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
  }

  var task = function(callbacks) {
    // Using the old argument style return whatever getStats returns to us.
    var success = callbacks.add(function (actualStats) {
      assertEquals(expectedStats, actualStats);
    });
    pc.getStats(undefined, success);
  };

  // Call getStats using the W3C argument spec.
  queue.call('getStats(undefined, successCallback)', task);
};
