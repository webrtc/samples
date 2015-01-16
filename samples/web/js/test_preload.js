/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* This file is used to simply extract the Chrome bits somewhere we can test. */

// Fake for Chrome to take over getUserMedia.
var webkitGetUserMediaFake = function() {
};

webkitGetUserMediaFake.prototype.bind = function() {
};
navigator.webkitGetUserMedia = new webkitGetUserMediaFake();

// Fake for webkitRTCPeerConnection
webkitRTCPeerConnection = function(config, constraints) {
};
