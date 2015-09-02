/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
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
  webrtcDetectedVersion =
    parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

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
  window.RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  window.RTCIceCandidate = mozRTCIceCandidate;

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
      return orgEnumerateDevices().catch(function(e) {
        if (e.name === 'NotFoundError') {
          return [];
        }
        throw e;
      });
    };
  }
} else if (navigator.webkitGetUserMedia && !!window.chrome) {
  webrtcUtils.log('This appears to be Chrome');

  webrtcDetectedBrowser = 'chrome';

  // the detected chrome version.
  webrtcDetectedVersion =
    parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);

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

  webrtcDetectedVersion =
    parseInt(navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)[2], 10);

  // the minimum version still supported by adapter.
  webrtcMinimumVersion = 12;
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
Object.defineProperty(webrtcTesting, 'version', {
  set: function(version) {
    webrtcDetectedVersion = version;
  }
});

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
    webrtcTesting: webrtcTesting
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
      webrtcTesting: webrtcTesting
      //requestUserMedia: not exposed on purpose.
      //trace: not exposed on purpose.
    };
  });
}
