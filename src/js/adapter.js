/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true,
   eqeqeq: true, forin: false, globalstrict: true, node: true,
   quotmark: single, undef: true, unused: strict */
/* global mozRTCIceCandidate, mozRTCPeerConnection, Promise,
mozRTCSessionDescription, webkitRTCPeerConnection, MediaStreamTrack */
/* exported trace,requestUserMedia */

'use strict';

var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;
var webrtcMinimumVersion = null;
var webrtcUtils = {
  log: function() {
    // suppress console.log output when being included as a module.
    if (typeof module !== 'undefined' ||
        typeof require === 'function' && typeof define === 'function') {
      return;
    }
    console.log.apply(console, arguments);
  },
  extractVersion: function(uastring, expr, pos) {
    var match = uastring.match(expr);
    return match && match.length >= pos && parseInt(match[pos]);
  }
};

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3);
    webrtcUtils.log(now + ': ' + text);
  } else {
    webrtcUtils.log(text);
  }
}

if (typeof window === 'object') {
  if (window.HTMLMediaElement &&
    !('srcObject' in window.HTMLMediaElement.prototype)) {
    // Shim the srcObject property, once, when HTMLMediaElement is found.
    Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
      get: function() {
        // If prefixed srcObject property exists, return it.
        // Otherwise use the shimmed property, _srcObject
        return 'mozSrcObject' in this ? this.mozSrcObject : this._srcObject;
      },
      set: function(stream) {
        if ('mozSrcObject' in this) {
          this.mozSrcObject = stream;
        } else {
          // Use _srcObject as a private property for this shim
          this._srcObject = stream;
          // TODO: revokeObjectUrl(this.src) when !stream to release resources?
          this.src = URL.createObjectURL(stream);
        }
      }
    });
  }
  // Proxy existing globals
  getUserMedia = window.navigator && window.navigator.getUserMedia;
}

// Attach a media stream to an element.
attachMediaStream = function(element, stream) {
  element.srcObject = stream;
};

reattachMediaStream = function(to, from) {
  to.srcObject = from.srcObject;
};

if (typeof window === 'undefined' || !window.navigator) {
  webrtcUtils.log('This does not appear to be a browser');
  webrtcDetectedBrowser = 'not a browser';
} else if (navigator.mozGetUserMedia && window.mozRTCPeerConnection) {
  webrtcUtils.log('This appears to be Firefox');

  webrtcDetectedBrowser = 'firefox';

  // the detected firefox version.
  webrtcDetectedVersion = webrtcUtils.extractVersion(navigator.userAgent,
      /Firefox\/([0-9]+)\./, 1);

  // the minimum firefox version still supported by adapter.
  webrtcMinimumVersion = 31;

  // The RTCPeerConnection object.
  window.RTCPeerConnection = function(pcConfig, pcConstraints) {
    if (webrtcDetectedVersion < 38) {
      // .urls is not supported in FF < 38.
      // create RTCIceServers with a single url.
      if (pcConfig && pcConfig.iceServers) {
        var newIceServers = [];
        for (var i = 0; i < pcConfig.iceServers.length; i++) {
          var server = pcConfig.iceServers[i];
          if (server.hasOwnProperty('urls')) {
            for (var j = 0; j < server.urls.length; j++) {
              var newServer = {
                url: server.urls[j]
              };
              if (server.urls[j].indexOf('turn') === 0) {
                newServer.username = server.username;
                newServer.credential = server.credential;
              }
              newIceServers.push(newServer);
            }
          } else {
            newIceServers.push(pcConfig.iceServers[i]);
          }
        }
        pcConfig.iceServers = newIceServers;
      }
    }
    return new mozRTCPeerConnection(pcConfig, pcConstraints); // jscs:ignore requireCapitalizedConstructors
  };

  // The RTCSessionDescription object.
  if (!window.RTCSessionDescription) {
    window.RTCSessionDescription = mozRTCSessionDescription;
  }

  // The RTCIceCandidate object.
  if (!window.RTCIceCandidate) {
    window.RTCIceCandidate = mozRTCIceCandidate;
  }

  // getUserMedia constraints shim.
  getUserMedia = function(constraints, onSuccess, onError) {
    var constraintsToFF37 = function(c) {
      if (typeof c !== 'object' || c.require) {
        return c;
      }
      var require = [];
      Object.keys(c).forEach(function(key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
          return;
        }
        var r = c[key] = (typeof c[key] === 'object') ?
            c[key] : {ideal: c[key]};
        if (r.min !== undefined ||
            r.max !== undefined || r.exact !== undefined) {
          require.push(key);
        }
        if (r.exact !== undefined) {
          if (typeof r.exact === 'number') {
            r.min = r.max = r.exact;
          } else {
            c[key] = r.exact;
          }
          delete r.exact;
        }
        if (r.ideal !== undefined) {
          c.advanced = c.advanced || [];
          var oc = {};
          if (typeof r.ideal === 'number') {
            oc[key] = {min: r.ideal, max: r.ideal};
          } else {
            oc[key] = r.ideal;
          }
          c.advanced.push(oc);
          delete r.ideal;
          if (!Object.keys(r).length) {
            delete c[key];
          }
        }
      });
      if (require.length) {
        c.require = require;
      }
      return c;
    };
    if (webrtcDetectedVersion < 38) {
      webrtcUtils.log('spec: ' + JSON.stringify(constraints));
      if (constraints.audio) {
        constraints.audio = constraintsToFF37(constraints.audio);
      }
      if (constraints.video) {
        constraints.video = constraintsToFF37(constraints.video);
      }
      webrtcUtils.log('ff37: ' + JSON.stringify(constraints));
    }
    return navigator.mozGetUserMedia(constraints, onSuccess, onError);
  };

  navigator.getUserMedia = getUserMedia;

  // Shim for mediaDevices on older versions.
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {getUserMedia: requestUserMedia,
      addEventListener: function() { },
      removeEventListener: function() { }
    };
  }
  navigator.mediaDevices.enumerateDevices =
      navigator.mediaDevices.enumerateDevices || function() {
    return new Promise(function(resolve) {
      var infos = [
        {kind: 'audioinput', deviceId: 'default', label: '', groupId: ''},
        {kind: 'videoinput', deviceId: 'default', label: '', groupId: ''}
      ];
      resolve(infos);
    });
  };

  if (webrtcDetectedVersion < 41) {
    // Work around http://bugzil.la/1169665
    var orgEnumerateDevices =
        navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = function() {
      return orgEnumerateDevices().then(undefined, function(e) {
        if (e.name === 'NotFoundError') {
          return [];
        }
        throw e;
      });
    };
  }
} else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
  webrtcUtils.log('This appears to be Chrome');

  webrtcDetectedBrowser = 'chrome';

  // the detected chrome version.
  webrtcDetectedVersion = webrtcUtils.extractVersion(navigator.userAgent,
      /Chrom(e|ium)\/([0-9]+)\./, 2);

  // the minimum chrome version still supported by adapter.
  webrtcMinimumVersion = 38;

  // The RTCPeerConnection object.
  window.RTCPeerConnection = function(pcConfig, pcConstraints) {
    // Translate iceTransportPolicy to iceTransports,
    // see https://code.google.com/p/webrtc/issues/detail?id=4869
    if (pcConfig && pcConfig.iceTransportPolicy) {
      pcConfig.iceTransports = pcConfig.iceTransportPolicy;
    }

    var pc = new webkitRTCPeerConnection(pcConfig, pcConstraints); // jscs:ignore requireCapitalizedConstructors
    var origGetStats = pc.getStats.bind(pc);
    pc.getStats = function(selector, successCallback, errorCallback) { // jshint ignore: line
      var self = this;
      var args = arguments;

      // If selector is a function then we are in the old style stats so just
      // pass back the original getStats format to avoid breaking old users.
      if (arguments.length > 0 && typeof selector === 'function') {
        return origGetStats(selector, successCallback);
      }

      var fixChromeStats = function(response) {
        var standardReport = {};
        var reports = response.result();
        reports.forEach(function(report) {
          var standardStats = {
            id: report.id,
            timestamp: report.timestamp,
            type: report.type
          };
          report.names().forEach(function(name) {
            standardStats[name] = report.stat(name);
          });
          standardReport[standardStats.id] = standardStats;
        });

        return standardReport;
      };

      if (arguments.length >= 2) {
        var successCallbackWrapper = function(response) {
          args[1](fixChromeStats(response));
        };

        return origGetStats.apply(this, [successCallbackWrapper, arguments[0]]);
      }

      // promise-support
      return new Promise(function(resolve, reject) {
        if (args.length === 1 && selector === null) {
          origGetStats.apply(self, [
              function(response) {
                resolve.apply(null, [fixChromeStats(response)]);
              }, reject]);
        } else {
          origGetStats.apply(self, [resolve, reject]);
        }
      });
    };

    return pc;
  };

  // add promise support
  ['createOffer', 'createAnswer'].forEach(function(method) {
    var nativeMethod = webkitRTCPeerConnection.prototype[method];
    webkitRTCPeerConnection.prototype[method] = function() {
      var self = this;
      if (arguments.length < 1 || (arguments.length === 1 &&
          typeof(arguments[0]) === 'object')) {
        var opts = arguments.length === 1 ? arguments[0] : undefined;
        return new Promise(function(resolve, reject) {
          nativeMethod.apply(self, [resolve, reject, opts]);
        });
      } else {
        return nativeMethod.apply(this, arguments);
      }
    };
  });

  ['setLocalDescription', 'setRemoteDescription',
      'addIceCandidate'].forEach(function(method) {
    var nativeMethod = webkitRTCPeerConnection.prototype[method];
    webkitRTCPeerConnection.prototype[method] = function() {
      var args = arguments;
      var self = this;
      return new Promise(function(resolve, reject) {
        nativeMethod.apply(self, [args[0],
            function() {
              resolve();
              if (args.length >= 2) {
                args[1].apply(null, []);
              }
            },
            function(err) {
              reject(err);
              if (args.length >= 3) {
                args[2].apply(null, [err]);
              }
            }]
          );
      });
    };
  });

  // getUserMedia constraints shim.
  var constraintsToChrome = function(c) {
    if (typeof c !== 'object' || c.mandatory || c.optional) {
      return c;
    }
    var cc = {};
    Object.keys(c).forEach(function(key) {
      if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
        return;
      }
      var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
      if (r.exact !== undefined && typeof r.exact === 'number') {
        r.min = r.max = r.exact;
      }
      var oldname = function(prefix, name) {
        if (prefix) {
          return prefix + name.charAt(0).toUpperCase() + name.slice(1);
        }
        return (name === 'deviceId') ? 'sourceId' : name;
      };
      if (r.ideal !== undefined) {
        cc.optional = cc.optional || [];
        var oc = {};
        if (typeof r.ideal === 'number') {
          oc[oldname('min', key)] = r.ideal;
          cc.optional.push(oc);
          oc = {};
          oc[oldname('max', key)] = r.ideal;
          cc.optional.push(oc);
        } else {
          oc[oldname('', key)] = r.ideal;
          cc.optional.push(oc);
        }
      }
      if (r.exact !== undefined && typeof r.exact !== 'number') {
        cc.mandatory = cc.mandatory || {};
        cc.mandatory[oldname('', key)] = r.exact;
      } else {
        ['min', 'max'].forEach(function(mix) {
          if (r[mix] !== undefined) {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname(mix, key)] = r[mix];
          }
        });
      }
    });
    if (c.advanced) {
      cc.optional = (cc.optional || []).concat(c.advanced);
    }
    return cc;
  };

  getUserMedia = function(constraints, onSuccess, onError) {
    if (constraints.audio) {
      constraints.audio = constraintsToChrome(constraints.audio);
    }
    if (constraints.video) {
      constraints.video = constraintsToChrome(constraints.video);
    }
    webrtcUtils.log('chrome: ' + JSON.stringify(constraints));
    return navigator.webkitGetUserMedia(constraints, onSuccess, onError);
  };
  navigator.getUserMedia = getUserMedia;

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {getUserMedia: requestUserMedia,
                              enumerateDevices: function() {
      return new Promise(function(resolve) {
        var kinds = {audio: 'audioinput', video: 'videoinput'};
        return MediaStreamTrack.getSources(function(devices) {
          resolve(devices.map(function(device) {
            return {label: device.label,
                    kind: kinds[device.kind],
                    deviceId: device.id,
                    groupId: ''};
          }));
        });
      });
    }};
  }

  // A shim for getUserMedia method on the mediaDevices object.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      return requestUserMedia(constraints);
    };
  } else {
    // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
    // function which returns a Promise, it does not accept spec-style
    // constraints.
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      webrtcUtils.log('spec:   ' + JSON.stringify(c)); // whitespace for alignment
      c.audio = constraintsToChrome(c.audio);
      c.video = constraintsToChrome(c.video);
      webrtcUtils.log('chrome: ' + JSON.stringify(c));
      return origGetUserMedia(c);
    };
  }

  // Dummy devicechange event methods.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
  if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
    navigator.mediaDevices.addEventListener = function() {
      webrtcUtils.log('Dummy mediaDevices.addEventListener called.');
    };
  }
  if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
    navigator.mediaDevices.removeEventListener = function() {
      webrtcUtils.log('Dummy mediaDevices.removeEventListener called.');
    };
  }

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    if (webrtcDetectedVersion >= 43) {
      element.srcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      webrtcUtils.log('Error attaching stream to element.');
    }
  };
  reattachMediaStream = function(to, from) {
    if (webrtcDetectedVersion >= 43) {
      to.srcObject = from.srcObject;
    } else {
      to.src = from.src;
    }
  };

} else if (navigator.mediaDevices && navigator.userAgent.match(
    /Edge\/(\d+).(\d+)$/)) {
  webrtcUtils.log('This appears to be Edge');
  webrtcDetectedBrowser = 'edge';

  webrtcDetectedVersion = webrtcUtils.extractVersion(navigator.userAgent,
      /Edge\/(\d+).(\d+)$/, 2);

  // the minimum version still supported by adapter.
  webrtcMinimumVersion = 12;

  if (RTCIceGatherer) {
    window.RTCIceCandidate = function(args) {
      return args;
    };
    window.RTCSessionDescription = function(args) {
      return args;
    };

    window.RTCPeerConnection = function(config) {
      var self = this;

      this.onicecandidate = null;
      this.onaddstream = null;
      this.onremovestream = null;
      this.onsignalingstatechange = null;
      this.oniceconnectionstatechange = null;
      this.onnegotiationneeded = null;
      this.ondatachannel = null;

      this.localStreams = [];
      this.remoteStreams = [];
      this.getLocalStreams = function() { return self.localStreams; };
      this.getRemoteStreams = function() { return self.remoteStreams; };

      this.localDescription = new RTCSessionDescription({
        type: '',
        sdp: ''
      });
      this.remoteDescription = new RTCSessionDescription({
        type: '',
        sdp: ''
      });
      this.signalingState = 'stable';
      this.iceConnectionState = 'new';

      this.iceOptions = {
        gatherPolicy: 'all',
        iceServers: []
      };
      if (config && config.iceTransportPolicy) {
        switch (config.iceTransportPolicy) {
        case 'all':
        case 'relay':
          this.iceOptions.gatherPolicy = config.iceTransportPolicy;
          break;
        case 'none':
          // FIXME: remove once implementation and spec have added this.
          throw new TypeError('iceTransportPolicy "none" not supported');
        }
      }
      if (config && config.iceServers) {
        this.iceOptions.iceServers = config.iceServers;
      }

      // per-track iceGathers etc
      this.mLines = [];

      this._iceCandidates = [];

      this._peerConnectionId = 'PC_' + Math.floor(Math.random() * 65536);

      // FIXME: Should be generated according to spec (guid?)
      // and be the same for all PCs from the same JS
      this._cname = Math.random().toString(36).substr(2, 10);
    };

    window.RTCPeerConnection.prototype.addStream = function(stream) {
      // clone just in case we're working in a local demo
      // FIXME: seems to be fixed
      this.localStreams.push(stream.clone());

      // FIXME: maybe trigger negotiationneeded?
    };

    window.RTCPeerConnection.prototype.removeStream = function(stream) {
      var idx = this.localStreams.indexOf(stream);
      if (idx > -1) {
        this.localStreams.splice(idx, 1);
      }
      // FIXME: maybe trigger negotiationneeded?
    };

    // SDP helper from sdp-jingle-json with modifications.
    window.RTCPeerConnection.prototype._toCandidateJSON = function(line) {
      var parts;
      if (line.indexOf('a=candidate:') === 0) {
        parts = line.substring(12).split(' ');
      } else { // no a=candidate
        parts = line.substring(10).split(' ');
      }

      var candidate = {
        foundation: parts[0],
        component: parts[1],
        protocol: parts[2].toLowerCase(),
        priority: parseInt(parts[3], 10),
        ip: parts[4],
        port: parseInt(parts[5], 10),
        // skip parts[6] == 'typ'
        type: parts[7]
        //generation: '0'
      };

      for (var i = 8; i < parts.length; i += 2) {
        if (parts[i] === 'raddr') {
          candidate.relatedAddress = parts[i + 1]; // was: relAddr
        } else if (parts[i] === 'rport') {
          candidate.relatedPort = parseInt(parts[i + 1], 10); // was: relPort
        } else if (parts[i] === 'generation') {
          candidate.generation = parts[i + 1];
        } else if (parts[i] === 'tcptype') {
          candidate.tcpType = parts[i + 1];
        }
      }
      return candidate;
    };

    // SDP helper from sdp-jingle-json with modifications.
    window.RTCPeerConnection.prototype._toCandidateSDP = function(candidate) {
      var sdp = [];
      sdp.push(candidate.foundation);
      sdp.push(candidate.component);
      sdp.push(candidate.protocol.toUpperCase());
      sdp.push(candidate.priority);
      sdp.push(candidate.ip);
      sdp.push(candidate.port);

      var type = candidate.type;
      sdp.push('typ');
      sdp.push(type);
      if (type === 'srflx' || type === 'prflx' || type === 'relay') {
        if (candidate.relatedAddress && candidate.relatedPort) {
          sdp.push('raddr');
          sdp.push(candidate.relatedAddress); // was: relAddr
          sdp.push('rport');
          sdp.push(candidate.relatedPort); // was: relPort
        }
      }
      if (candidate.tcpType && candidate.protocol.toUpperCase() === 'TCP') {
        sdp.push('tcptype');
        sdp.push(candidate.tcpType);
      }
      return 'a=candidate:' + sdp.join(' ');
    };

    // SDP helper from sdp-jingle-json with modifications.
    window.RTCPeerConnection.prototype._parseRtpMap = function(line) {
      var parts = line.substr(9).split(' ');
      var parsed = {
        payloadType: parseInt(parts.shift(), 10) // was: id
      };

      parts = parts[0].split('/');

      parsed.name = parts[0];
      parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
      parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1; // was: channels
      return parsed;
    };

    // Parses SDP to determine capabilities.
    window.RTCPeerConnection.prototype._getRemoteCapabilities =
        function(section) {
      var remoteCapabilities = {
        codecs: [],
        headerExtensions: [],
        fecMechanisms: []
      };
      var i;
      var lines = section.split('\r\n');
      var mline = lines[0].substr(2).split(' ');
      var rtpmapFilter = function(line) {
        return line.indexOf('a=rtpmap:' + mline[i]) === 0;
      };
      var fmtpFilter = function(line) {
        return line.indexOf('a=fmtp:' + mline[i]) === 0;
      };
      var parseFmtp = function(line) {
        var parsed = {};
        var kv;
        var parts = line.substr(('a=fmtp:' + mline[i]).length + 1).split(';');
        for (var j = 0; j < parts.length; j++) {
          kv = parts[j].split('=');
          parsed[kv[0].trim()] = kv[1];
        }
        console.log('fmtp', mline[i], parsed);
        return parsed;
      };
      var rtcpFbFilter = function(line) {
        return line.indexOf('a=rtcp-fb:' + mline[i]) === 0;
      };
      var parseRtcpFb = function(line) {
        var parts = line.substr(('a=rtcp-fb:' + mline[i]).length + 1)
            .split(' ');
        return {
          type: parts.shift(),
          parameter: parts.join(' ')
        };
      };
      for (i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
        var line = lines.filter(rtpmapFilter)[0];
        if (line) {
          var codec = this._parseRtpMap(line);

          var fmtp = lines.filter(fmtpFilter);
          codec.parameters = fmtp.length ? parseFmtp(fmtp[0]) : {};
          codec.rtcpFeedback = lines.filter(rtcpFbFilter).map(parseRtcpFb);

          remoteCapabilities.codecs.push(codec);
        }
      }
      return remoteCapabilities;
    };

    // Serializes capabilities to SDP.
    window.RTCPeerConnection.prototype._capabilitiesToSDP = function(caps) {
      var sdp = '';
      caps.codecs.forEach(function(codec) {
        var pt = codec.payloadType;
        if (codec.preferredPayloadType !== undefined) {
          pt = codec.preferredPayloadType;
        }
        sdp += 'a=rtpmap:' + pt +
            ' ' + codec.name +
            '/' + codec.clockRate +
            (codec.numChannels !== 1 ? '/' + codec.numChannels : '') +
            '\r\n';
        if (codec.parameters && codec.parameters.length) {
          sdp += 'a=ftmp:' + pt + ' ';
          Object.keys(codec.parameters).forEach(function(param) {
            sdp += param + '=' + codec.parameters[param];
          });
          sdp += '\r\n';
        }
        if (codec.rtcpFeedback) {
          // FIXME: special handling for trr-int?
          codec.rtcpFeedback.forEach(function(fb) {
            sdp += 'a=rtcp-fb:' + pt + ' ' + fb.type + ' ' +
                fb.parameter + '\r\n';
          });
        }
      });
      return sdp;
    };

    // Calculates the intersection of local and remote capabilities.
    window.RTCPeerConnection.prototype._getCommonCapabilities =
        function(localCapabilities, remoteCapabilities) {
      var commonCapabilities = {
        codecs: [],
        headerExtensions: [],
        fecMechanisms: []
      };
      localCapabilities.codecs.forEach(function(lCodec) {
        for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
          var rCodec = remoteCapabilities.codecs[i];
          if (lCodec.name === rCodec.name &&
              lCodec.clockRate === rCodec.clockRate &&
              lCodec.numChannels === rCodec.numChannels) {
            // push rCodec so we reply with offerer payload type
            commonCapabilities.codecs.push(rCodec);

            // FIXME: also need to calculate intersection between
            // .rtcpFeedback and .parameters
            break;
          }
        }
      });

      localCapabilities.headerExtensions.forEach(function(lHeaderExtension) {
        for (var i = 0; i < remoteCapabilities.headerExtensions.length; i++) {
          var rHeaderExtension = remoteCapabilities.headerExtensions[i];
          if (lHeaderExtension.uri === rHeaderExtension.uri) {
            commonCapabilities.headerExtensions.push(rHeaderExtension);
            break;
          }
        }
      });

      // FIXME: fecMechanisms
      return commonCapabilities;
    };

    // Parses DTLS parameters from SDP section or sessionpart.
    window.RTCPeerConnection.prototype._getDtlsParameters =
        function(section, session) {
      var lines = section.split('\r\n');
      lines = lines.concat(session.split('\r\n')); // Search in session part, too.
      var fpLine = lines.filter(function(line) {
        return line.indexOf('a=fingerprint:') === 0;
      });
      fpLine = fpLine[0].substr(14);
      var dtlsParameters = {
        role: 'auto',
        fingerprints: [{
          algorithm: fpLine.split(' ')[0],
          value: fpLine.split(' ')[1]
        }]
      };
      return dtlsParameters;
    };

    // Serializes DTLS parameters to SDP.
    window.RTCPeerConnection.prototype._dtlsParametersToSDP =
        function(params, setupType) {
      var sdp = 'a=setup:' + setupType + '\r\n';
      params.fingerprints.forEach(function(fp) {
        sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
      });
      return sdp;
    };

    // Parses ICE information from SDP section or sessionpart.
    window.RTCPeerConnection.prototype._getIceParameters =
        function(section, session) {
      var lines = section.split('\r\n');
      lines = lines.concat(session.split('\r\n')); // Search in session part, too.
      var iceParameters = {
        usernameFragment: lines.filter(function(line) {
          return line.indexOf('a=ice-ufrag:') === 0;
        })[0].substr(12),
        password: lines.filter(function(line) {
          return line.indexOf('a=ice-pwd:') === 0;
        })[0].substr(10),
      };
      return iceParameters;
    };

    // Serializes ICE parameters to SDP.
    window.RTCPeerConnection.prototype._iceParametersToSDP = function(params) {
      return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
          'a=ice-pwd:' + params.password + '\r\n';
    };

    window.RTCPeerConnection.prototype._getEncodingParameters = function(ssrc) {
      return {
        ssrc: ssrc,
        codecPayloadType: 0,
        fec: 0,
        rtx: 0,
        priority: 1.0,
        maxBitrate: 2000000.0,
        minQuality: 0,
        framerateBias: 0.5,
        resolutionScale: 1.0,
        framerateScale: 1.0,
        active: true,
        dependencyEncodingId: undefined,
        encodingId: undefined
      };
    };

    // Create ICE gatherer, ICE transport and DTLS transport.
    window.RTCPeerConnection.prototype._createIceAndDtlsTransports =
        function(mid, sdpMLineIndex) {
      var self = this;
      var iceGatherer = new RTCIceGatherer(self.iceOptions);
      var iceTransport = new RTCIceTransport(iceGatherer);
      iceGatherer.onlocalcandidate = function(evt) {
        var event = {};
        event.candidate = {sdpMid: mid, sdpMLineIndex: sdpMLineIndex};

        var cand = evt.candidate;
        var isEndOfCandidates = !(cand && Object.keys(cand).length > 0);
        if (isEndOfCandidates) {
          event.candidate.candidate =
              'candidate:1 1 udp 1 0.0.0.0 9 typ endOfCandidates';
        } else {
          // RTCIceCandidate doesn't have a component, needs to be added
          cand.component = iceTransport.component === 'RTCP' ? 2 : 1;
          event.candidate.candidate = self._toCandidateSDP(cand);
        }
        if (self.onicecandidate !== null) {
          if (self.localDescription && self.localDescription.type === '') {
            self._iceCandidates.push(event);
          } else {
            self.onicecandidate(event);
          }
        }
      };
      iceTransport.onicestatechange = function() {
        /*
        console.log(self._peerConnectionId,
            'ICE state change', iceTransport.state);
        */
        self._updateIceConnectionState(iceTransport.state);
      };

      var dtlsTransport = new RTCDtlsTransport(iceTransport);
      dtlsTransport.ondtlsstatechange = function() {
        /*
        console.log(self._peerConnectionId, sdpMLineIndex,
            'dtls state change', dtlsTransport.state);
        */
      };
      dtlsTransport.onerror = function(error) {
        console.error('dtls error', error);
      };
      return {
        iceGatherer: iceGatherer,
        iceTransport: iceTransport,
        dtlsTransport: dtlsTransport
      };
    };

    window.RTCPeerConnection.prototype.setLocalDescription =
        function(description) {
      var self = this;
      if (description.type === 'offer') {
        if (!description.ortc) {
          // FIXME: throw?
        } else {
          this.mLines = description.ortc;
        }
      } else if (description.type === 'answer') {
        var sections = self.remoteDescription.sdp.split('\r\nm=');
        var sessionpart = sections.shift();
        sections.forEach(function(section, sdpMLineIndex) {
          section = 'm=' + section;

          var iceGatherer = self.mLines[sdpMLineIndex].iceGatherer;
          var iceTransport = self.mLines[sdpMLineIndex].iceTransport;
          var dtlsTransport = self.mLines[sdpMLineIndex].dtlsTransport;
          var rtpSender = self.mLines[sdpMLineIndex].rtpSender;
          var localCapabilities =
              self.mLines[sdpMLineIndex].localCapabilities;
          var remoteCapabilities =
              self.mLines[sdpMLineIndex].remoteCapabilities;
          var sendSSRC = self.mLines[sdpMLineIndex].sendSSRC;
          var recvSSRC = self.mLines[sdpMLineIndex].recvSSRC;

          var remoteIceParameters = self._getIceParameters(section,
              sessionpart);
          iceTransport.start(iceGatherer, remoteIceParameters, 'controlled');

          var remoteDtlsParameters = self._getDtlsParameters(section,
              sessionpart);
          dtlsTransport.start(remoteDtlsParameters);

          if (rtpSender) {
            // calculate intersection of capabilities
            var params = self._getCommonCapabilities(localCapabilities,
                remoteCapabilities);
            params.muxId = sendSSRC;
            params.encodings = [self._getEncodingParameters(sendSSRC)];
            params.rtcp = {
              cname: self._cname,
              reducedSize: false,
              ssrc: recvSSRC,
              mux: true
            };
            rtpSender.send(params);
          }
        });
      }

      this.localDescription = description;
      switch (description.type) {
      case 'offer':
        this._updateSignalingState('have-local-offer');
        break;
      case 'answer':
        this._updateSignalingState('stable');
        break;
      }

      // FIXME: need to _reliably_ execute after args[1] or promise
      window.setTimeout(function() {
        // FIXME: need to apply ice candidates in a way which is async but in-order
        self._iceCandidates.forEach(function(event) {
          if (self.onicecandidate !== null) {
            self.onicecandidate(event);
          }
        });
        self._iceCandidates = [];
      }, 50);
      if (arguments.length > 1 && typeof arguments[1] === 'function') {
        window.setTimeout(arguments[1], 0);
      }
      return new Promise(function(resolve) {
        resolve();
      });
    };

    window.RTCPeerConnection.prototype.setRemoteDescription =
        function(description) {
      // FIXME: for type=offer this creates state. which should not
      //  happen before SLD with type=answer but... we need the stream
      //  here for onaddstream.
      var self = this;
      var sections = description.sdp.split('\r\nm=');
      var sessionpart = sections.shift();
      var stream = new MediaStream();
      sections.forEach(function(section, sdpMLineIndex) {
        section = 'm=' + section;
        var lines = section.split('\r\n');
        var mline = lines[0].substr(2).split(' ');
        var kind = mline[0];
        var line;

        var iceGatherer;
        var iceTransport;
        var dtlsTransport;
        var rtpSender;
        var rtpReceiver;
        var sendSSRC;
        var recvSSRC;

        var mid = lines.filter(function(line) {
          return line.indexOf('a=mid:') === 0;
        })[0].substr(6);

        var cname;

        var remoteCapabilities;
        var params;

        if (description.type === 'offer') {
          var transports = self._createIceAndDtlsTransports(mid, sdpMLineIndex);

          var localCapabilities = RTCRtpReceiver.getCapabilities(kind);
          // determine remote caps from SDP
          remoteCapabilities = self._getRemoteCapabilities(section);

          line = lines.filter(function(line) {
            return line.indexOf('a=ssrc:') === 0 &&
                line.split(' ')[1].indexOf('cname:') === 0;
          });
          sendSSRC = (2 * sdpMLineIndex + 2) * 1001;
          if (line) { // FIXME: alot of assumptions here
            recvSSRC = line[0].split(' ')[0].split(':')[1];
            cname = line[0].split(' ')[1].split(':')[1];
          }
          rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);

          // calculate intersection so no unknown caps get passed into the RTPReciver
          params = self._getCommonCapabilities(localCapabilities,
              remoteCapabilities);

          params.muxId = recvSSRC;
          params.encodings = [self._getEncodingParameters(recvSSRC)];
          params.rtcp = {
            cname: cname,
            reducedSize: false,
            ssrc: sendSSRC,
            mux: true
          };
          rtpReceiver.receive(params);
          // FIXME: not correct when there are multiple streams but that is
          // not currently supported.
          stream.addTrack(rtpReceiver.track);

          // FIXME: honor a=sendrecv
          if (self.localStreams.length > 0 &&
              self.localStreams[0].getTracks().length >= sdpMLineIndex) {
            // FIXME: actually more complicated, needs to match types etc
            var localtrack = self.localStreams[0].getTracks()[sdpMLineIndex];
            rtpSender = new RTCRtpSender(localtrack, transports.dtlsTransport);
          }

          self.mLines[sdpMLineIndex] = {
            iceGatherer: transports.iceGatherer,
            iceTransport: transports.iceTransport,
            dtlsTransport: transports.dtlsTransport,
            localCapabilities: localCapabilities,
            remoteCapabilities: remoteCapabilities,
            rtpSender: rtpSender,
            rtpReceiver: rtpReceiver,
            kind: kind,
            mid: mid,
            sendSSRC: sendSSRC,
            recvSSRC: recvSSRC
          };
        } else {
          iceGatherer = self.mLines[sdpMLineIndex].iceGatherer;
          iceTransport = self.mLines[sdpMLineIndex].iceTransport;
          dtlsTransport = self.mLines[sdpMLineIndex].dtlsTransport;
          rtpSender = self.mLines[sdpMLineIndex].rtpSender;
          rtpReceiver = self.mLines[sdpMLineIndex].rtpReceiver;
          sendSSRC = self.mLines[sdpMLineIndex].sendSSRC;
          recvSSRC = self.mLines[sdpMLineIndex].recvSSRC;
        }

        var remoteIceParameters = self._getIceParameters(section, sessionpart);
        var remoteDtlsParameters = self._getDtlsParameters(section,
            sessionpart);

        // for answers we start ice and dtls here, otherwise this is done in SLD
        if (description.type === 'answer') {
          iceTransport.start(iceGatherer, remoteIceParameters, 'controlling');
          dtlsTransport.start(remoteDtlsParameters);

          // determine remote caps from SDP
          remoteCapabilities = self._getRemoteCapabilities(section);
          // FIXME: store remote caps?

          if (rtpSender) {
            params = remoteCapabilities;
            params.muxId = sendSSRC;
            params.encodings = [self._getEncodingParameters(sendSSRC)];
            params.rtcp = {
              cname: self._cname,
              reducedSize: false,
              ssrc: recvSSRC,
              mux: true
            };
            rtpSender.send(params);
          }

          // FIXME: only if a=sendrecv
          var bidi = lines.filter(function(line) {
            return line.indexOf('a=ssrc:') === 0;
          }).length > 0;
          if (rtpReceiver && bidi) {
            line = lines.filter(function(line) {
              return line.indexOf('a=ssrc:') === 0 &&
                  line.split(' ')[1].indexOf('cname:') === 0;
            });
            if (line) { // FIXME: alot of assumptions here
              recvSSRC = line[0].split(' ')[0].split(':')[1];
              cname = line[0].split(' ')[1].split(':')[1];
            }
            params = remoteCapabilities;
            params.muxId = recvSSRC;
            params.encodings = [self._getEncodingParameters(recvSSRC)];
            params.rtcp = {
              cname: cname,
              reducedSize: false,
              ssrc: sendSSRC,
              mux: true
            };
            rtpReceiver.receive(params, kind);
            stream.addTrack(rtpReceiver.track);
            self.mLines[sdpMLineIndex].recvSSRC = recvSSRC;
          }
        }
      });

      this.remoteDescription = description;
      switch (description.type) {
      case 'offer':
        this._updateSignalingState('have-remote-offer');
        break;
      case 'answer':
        this._updateSignalingState('stable');
        break;
      }
      window.setTimeout(function() {
        if (self.onaddstream !== null && stream.getTracks().length) {
          self.remoteStreams.push(stream);
          window.setTimeout(function() {
            self.onaddstream({stream: stream});
          }, 0);
        }
      }, 0);
      if (arguments.length > 1 && typeof arguments[1] === 'function') {
        window.setTimeout(arguments[1], 0);
      }
      return new Promise(function(resolve) {
        resolve();
      });
    };

    window.RTCPeerConnection.prototype.close = function() {
      this.mLines.forEach(function(mLine) {
        /* not yet
        if (mLine.iceGatherer) {
          mLine.iceGatherer.close();
        }
        */
        if (mLine.iceTransport) {
          mLine.iceTransport.stop();
        }
        if (mLine.dtlsTransport) {
          mLine.dtlsTransport.stop();
        }
        if (mLine.rtpSender) {
          mLine.rtpSender.stop();
        }
        if (mLine.rtpReceiver) {
          mLine.rtpReceiver.stop();
        }
      });
      // FIXME: clean up tracks, local streams, remote streams, etc
      this._updateSignalingState('closed');
      this._updateIceConnectionState('closed');
    };

    // Update the signaling state.
    window.RTCPeerConnection.prototype._updateSignalingState =
        function(newState) {
      this.signalingState = newState;
      if (this.onsignalingstatechange !== null) {
        this.onsignalingstatechange();
      }
    };

    // Update the ICE connection state.
    // FIXME: should be called 'updateConnectionState', also be called for
    //  DTLS changes and implement
    //  https://lists.w3.org/Archives/Public/public-webrtc/2015Sep/0033.html
    window.RTCPeerConnection.prototype._updateIceConnectionState =
        function(newState) {
      var self = this;
      if (this.iceConnectionState !== newState) {
        var agreement = self.mLines.every(function(mLine) {
          return mLine.iceTransport.state === newState;
        });
        if (agreement) {
          self.iceConnectionState = newState;
          if (this.oniceconnectionstatechange !== null) {
            this.oniceconnectionstatechange();
          }
        }
      }
    };

    window.RTCPeerConnection.prototype.createOffer = function() {
      var self = this;
      var offerOptions;
      if (arguments.length === 1 && typeof arguments[0] !== 'function') {
        offerOptions = arguments[0];
      } else if (arguments.length === 3) {
        offerOptions = arguments[2];
      }

      var tracks = [];
      var numAudioTracks = 0;
      var numVideoTracks = 0;
      // Default to sendrecv.
      if (this.localStreams.length) {
        numAudioTracks = this.localStreams[0].getAudioTracks().length;
        numVideoTracks = this.localStreams[0].getAudioTracks().length;
      }
      // Determine number of audio and video tracks we need to send/recv.
      if (offerOptions) {
        // Deal with Chrome legacy constraints...
        if (offerOptions.mandatory) {
          if (offerOptions.mandatory.OfferToReceiveAudio) {
            numAudioTracks = 1;
          } else if (offerOptions.mandatory.OfferToReceiveAudio === false) {
            numAudioTracks = 0;
          }
          if (offerOptions.mandatory.OfferToReceiveVideo) {
            numVideoTracks = 1;
          } else if (offerOptions.mandatory.OfferToReceiveVideo === false) {
            numVideoTracks = 0;
          }
        } else {
          if (offerOptions.offerToReceiveAudio !== undefined) {
            numAudioTracks = offerOptions.offerToReceiveAudio;
          }
          if (offerOptions.offerToReceiveVideo !== undefined) {
            numVideoTracks = offerOptions.offerToReceiveVideo;
          }
        }
      }
      if (this.localStreams.length) {
        // Push local streams.
        this.localStreams[0].getTracks().forEach(function(track) {
          tracks.push({
            kind: track.kind,
            track: track,
            wantReceive: track.kind === 'audio' ?
                numAudioTracks > 0 : numVideoTracks > 0
          });
          if (track.kind === 'audio') {
            numAudioTracks--;
          } else if (track.kind === 'video') {
            numVideoTracks--;
          }
        });
      }
      // Create M-lines for recvonly streams.
      while (numAudioTracks > 0 || numVideoTracks > 0) {
        if (numAudioTracks > 0) {
          tracks.push({
            kind: 'audio',
            wantReceive: true
          });
          numAudioTracks--;
        }
        if (numVideoTracks > 0) {
          tracks.push({
            kind: 'video',
            wantReceive: true
          });
          numVideoTracks--;
        }
      }

      var sdp = 'v=0\r\n' +
          'o=thisisadapterortc 8169639915646943137 2 IN IP4 127.0.0.1\r\n' +
          's=-\r\n' +
          't=0 0\r\n';
      var mLines = [];
      tracks.forEach(function(mline, sdpMLineIndex) {
        // For each track, create an ice gatherer, ice transport, dtls transport,
        // potentially rtpsender and rtpreceiver.
        var track = mline.track;
        var kind = mline.kind;
        var mid = Math.random().toString(36).substr(2, 10);

        var transports = self._createIceAndDtlsTransports(mid, sdpMLineIndex);

        var localCapabilities = RTCRtpSender.getCapabilities(kind);
        var rtpSender;
        // generate an ssrc now, to be used later in rtpSender.send
        var sendSSRC = (2 * sdpMLineIndex + 1) * 1001; //Math.floor(Math.random()*4294967295);
        var recvSSRC; // don't know yet
        if (track) {
          rtpSender = new RTCRtpSender(track, transports.dtlsTransport);
        }

        var rtpReceiver;
        if (mline.wantReceive) {
          rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);
        }

        mLines[sdpMLineIndex] = {
          iceGatherer: transports.iceGatherer,
          iceTransport: transports.iceTransport,
          dtlsTransport: transports.dtlsTransport,
          localCapabilities: localCapabilities,
          remoteCapabilities: null,
          rtpSender: rtpSender,
          rtpReceiver: rtpReceiver,
          kind: kind,
          mid: mid,
          sendSSRC: sendSSRC,
          recvSSRC: recvSSRC
        };

        // Map things to SDP.
        // Build the mline.
        sdp += 'm=' + kind + ' 9 UDP/TLS/RTP/SAVPF ';
        sdp += localCapabilities.codecs.map(function(codec) {
          return codec.preferredPayloadType;
        }).join(' ') + '\r\n';

        sdp += 'c=IN IP4 0.0.0.0\r\n';
        sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

        // Map ICE parameters (ufrag, pwd) to SDP.
        sdp += self._iceParametersToSDP(
            transports.iceGatherer.getLocalParameters());

        // Map DTLS parameters to SDP.
        sdp += self._dtlsParametersToSDP(
            transports.dtlsTransport.getLocalParameters(), 'actpass');

        sdp += 'a=mid:' + mid + '\r\n';

        if (rtpSender && rtpReceiver) {
          sdp += 'a=sendrecv\r\n';
        } else if (rtpSender) {
          sdp += 'a=sendonly\r\n';
        } else if (rtpReceiver) {
          sdp += 'a=recvonly\r\n';
        } else {
          sdp += 'a=inactive\r\n';
        }
        sdp += 'a=rtcp-mux\r\n';

        // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
        sdp += self._capabilitiesToSDP(localCapabilities);

        if (track) {
          sdp += 'a=msid:' + self.localStreams[0].id + ' ' + track.id + '\r\n';
          sdp += 'a=ssrc:' + sendSSRC + ' ' + 'msid:' +
              self.localStreams[0].id + ' ' + track.id + '\r\n';
        }
        sdp += 'a=ssrc:' + sendSSRC + ' cname:' + self._cname + '\r\n';
      });

      var desc = new RTCSessionDescription({
        type: 'offer',
        sdp: sdp,
        ortc: mLines
      });
      if (arguments.length && typeof arguments[0] === 'function') {
        window.setTimeout(arguments[0], 0, desc);
      }
      return new Promise(function(resolve) {
        resolve(desc);
      });
    };

    window.RTCPeerConnection.prototype.createAnswer = function() {
      var self = this;
      var answerOptions;
      if (arguments.length === 1 && typeof arguments[0] !== 'function') {
        answerOptions = arguments[0];
      } else if (arguments.length === 3) {
        answerOptions = arguments[2];
      }

      var sdp = 'v=0\r\n' +
          'o=thisisadapterortc 8169639915646943137 2 IN IP4 127.0.0.1\r\n' +
          's=-\r\n' +
          't=0 0\r\n';
      this.mLines.forEach(function(mLine/*, sdpMLineIndex*/) {
        var iceGatherer = mLine.iceGatherer;
        //var iceTransport = mLine.iceTransport;
        var dtlsTransport = mLine.dtlsTransport;
        var localCapabilities = mLine.localCapabilities;
        var remoteCapabilities = mLine.remoteCapabilities;
        var rtpSender = mLine.rtpSender;
        var rtpReceiver = mLine.rtpReceiver;
        var kind = mLine.kind;
        var sendSSRC = mLine.sendSSRC;
        //var recvSSRC = mLine.recvSSRC;

        // Calculate intersection of capabilities.
        var commonCapabilities = self._getCommonCapabilities(localCapabilities,
            remoteCapabilities);

        // Map things to SDP.
        // Build the mline.
        sdp += 'm=' + kind + ' 9 UDP/TLS/RTP/SAVPF ';
        sdp += commonCapabilities.codecs.map(function(codec) {
          return codec.payloadType;
        }).join(' ') + '\r\n';

        sdp += 'c=IN IP4 0.0.0.0\r\n';
        sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

        // Map ICE parameters (ufrag, pwd) to SDP.
        sdp += self._iceParametersToSDP(iceGatherer.getLocalParameters());

        // Map DTLS parameters to SDP.
        sdp += self._dtlsParametersToSDP(dtlsTransport.getLocalParameters(),
            'active');

        sdp += 'a=mid:' + mLine.mid + '\r\n';

        if (rtpSender && rtpReceiver) {
          sdp += 'a=sendrecv\r\n';
        } else if (rtpReceiver) {
          sdp += 'a=sendonly\r\n';
        } else if (rtpSender) {
          sdp += 'a=sendonly\r\n';
        } else {
          sdp += 'a=inactive\r\n';
        }
        sdp += 'a=rtcp-mux\r\n';

        // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
        sdp += self._capabilitiesToSDP(commonCapabilities);

        if (rtpSender) {
          // add a=ssrc lines from RTPSender
          sdp += 'a=msid:' + self.localStreams[0].id + ' ' +
              rtpSender.track.id + '\r\n';
          sdp += 'a=ssrc:' + sendSSRC + ' ' + 'msid:' +
              self.localStreams[0].id + ' ' + rtpSender.track.id + '\r\n';
        }
        sdp += 'a=ssrc:' + sendSSRC + ' cname:' + self._cname + '\r\n';
      });

      var desc = new RTCSessionDescription({
        type: 'answer',
        sdp: sdp
        // ortc: tracks -- state is created in SRD already
      });
      if (arguments.length && typeof arguments[0] === 'function') {
        window.setTimeout(arguments[0], 0, desc);
      }
      return new Promise(function(resolve) {
        resolve(desc);
      });
    };

    window.RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
      // TODO: lookup by mid
      var mLine = this.mLines[candidate.sdpMLineIndex];
      if (mLine) {
        var cand = Object.keys(candidate.candidate).length > 0 ?
            this._toCandidateJSON(candidate.candidate) : {};
        // dirty hack to make simplewebrtc work.
        // FIXME: need another dirty hack to avoid adding candidates after this
        if (cand.type === 'endOfCandidates') {
          cand = {};
        }
        // dirty hack to make chrome work.
        if (cand.protocol === 'tcp' && cand.port === 0) {
          cand = {};
        }
        mLine.iceTransport.addRemoteCandidate(cand);
      }
      if (arguments.length > 1 && typeof arguments[1] === 'function') {
        window.setTimeout(arguments[1], 0);
      }
      return new Promise(function(resolve) {
        resolve();
      });
    };

    window.RTCPeerConnection.prototype.getStats = function() {
      var promises = [];
      this.mLines.forEach(function(mLine) {
        ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
            'dtlsTransport'].forEach(function(thing) {
          if (mLine[thing]) {
            promises.push(mLine[thing].getStats());
          }
        });
      });
      var cb = arguments.length > 1 && typeof arguments[1] === 'function' &&
          arguments[1];
      return new Promise(function(resolve) {
        var results = {};
        Promise.all(promises).then(function(res) {
          res.forEach(function(result) {
            Object.keys(result).forEach(function(id) {
              results[id] = result[id];
            });
          });
          if (cb) {
            window.setTimeout(cb, 0, results);
          }
          resolve(results);
        });
      });
    };
  }
} else {
  webrtcUtils.log('Browser does not appear to be WebRTC-capable');
}

// Returns the result of getUserMedia as a Promise.
function requestUserMedia(constraints) {
  return new Promise(function(resolve, reject) {
    getUserMedia(constraints, resolve, reject);
  });
}

var webrtcTesting = {};
try {
  Object.defineProperty(webrtcTesting, 'version', {
    set: function(version) {
      webrtcDetectedVersion = version;
    }
  });
} catch (e) {}

if (typeof module !== 'undefined') {
  var RTCPeerConnection;
  if (typeof window !== 'undefined') {
    RTCPeerConnection = window.RTCPeerConnection;
  }
  module.exports = {
    RTCPeerConnection: RTCPeerConnection,
    getUserMedia: getUserMedia,
    attachMediaStream: attachMediaStream,
    reattachMediaStream: reattachMediaStream,
    webrtcDetectedBrowser: webrtcDetectedBrowser,
    webrtcDetectedVersion: webrtcDetectedVersion,
    webrtcMinimumVersion: webrtcMinimumVersion,
    webrtcTesting: webrtcTesting,
    webrtcUtils: webrtcUtils
    //requestUserMedia: not exposed on purpose.
    //trace: not exposed on purpose.
  };
} else if ((typeof require === 'function') && (typeof define === 'function')) {
  // Expose objects and functions when RequireJS is doing the loading.
  define([], function() {
    return {
      RTCPeerConnection: window.RTCPeerConnection,
      getUserMedia: getUserMedia,
      attachMediaStream: attachMediaStream,
      reattachMediaStream: reattachMediaStream,
      webrtcDetectedBrowser: webrtcDetectedBrowser,
      webrtcDetectedVersion: webrtcDetectedVersion,
      webrtcMinimumVersion: webrtcMinimumVersion,
      webrtcTesting: webrtcTesting,
      webrtcUtils: webrtcUtils
      //requestUserMedia: not exposed on purpose.
      //trace: not exposed on purpose.
    };
  });
}
