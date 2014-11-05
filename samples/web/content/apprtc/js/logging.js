/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var apprtc = apprtc || {};
apprtc.Log = apprtc.Log || {};

(function() {

var Log = apprtc.Log;

Log.ERROR_TOPIC = 'LOG_ERROR';

Log.info = function(message) {
  trace(message);
};

Log.warn = function(message) {
  trace('WARNING: ' + message);
};

Log.error = function(message) {
  trace('ERROR: ' + message);
  apprtc.pubsub.publish(Log.ERROR_TOPIC, { error: message });
};

})();
