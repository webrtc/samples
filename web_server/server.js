/*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

'use strict';

var express = require('express');
var https = require('https');
var pem = require('pem');

pem.createCertificate({days: 1, selfSigned: true}, function(err, keys) {
  var options = {
    key: keys.serviceKey,
    cert: keys.certificate
  };

  var app = express();

  app.use(express.static('../'));

  // Create an HTTPS service.
  https.createServer(options, app).listen(8080);

  console.log('serving on https://localhost:8080');
});
