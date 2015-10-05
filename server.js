var express = require('express');
var https = require('https');
var http = require('http');
var pem = require('pem');

pem.createCertificate({ days:1, selfSigned:true }, function(err, keys) {
  var options = {
    key: keys.serviceKey,
    cert: keys.certificate
  };

  var app = express();

  app.use(express.static('.'));

  // Create an HTTPS service
  https.createServer(options, app).listen(8080);

  console.log('serving on https://localhost:8080');
});
