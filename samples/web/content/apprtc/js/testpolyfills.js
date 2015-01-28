/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

'use strict';

Function.prototype.bind = Function.prototype.bind || function(thisp) {
  var fn = this;
  return function() {
    return fn.apply(thisp, arguments);
  };
};

if (!window.performance) {
  window.performance = function() {};
  window.performance.now = function() { return 0; };
}

window.RTCSessionDescription = window.RTCSessionDescription || function(input) {
  this.type = input.type;
  this.sdp = input.sdp;
};

window.RTCIceCandidate = window.RTCIceCandidate || function(candidate) {
  this.sdpMLineIndex = candidate.sdpMLineIndex;
  this.candidate = candidate.candidate;
};

var PROMISE_STATE = {
  PENDING: 0,
  FULLFILLED: 1,
  REJECTED: 2
};

var MyPromise = function(executor) {
  this.state_ = PROMISE_STATE.PENDING;
  this.resolveCallback_ = null;
  this.rejectCallback_ = null;

  this.value_ = null;
  this.reason_ = null;
  executor(this.onResolve_.bind(this), this.onReject_.bind(this));
};

MyPromise.all = function(promises) {
  var values = new Array(promises.length);
  return new MyPromise(function(values, resolve, reject) {
    function onResolve(values, index, value) {
      values[index] = value || null;

      for (var i = 0; i < values.length; ++i) {
        if (values[i] === undefined) {
          return;
        }
      }
      resolve(values);
    }
    for (var i = 0; i < promises.length; ++i) {
      promises[i].then(onResolve.bind(null, values, i), reject);
    }
  }.bind(null, values));
};

MyPromise.resolve = function(value) {
  return new MyPromise(function(resolve) {
    resolve(value);
  });
};

MyPromise.prototype.then = function(onResolve, onReject) {
  switch (this.state_) {
  case PROMISE_STATE.PENDING:
    this.resolveCallback_ = onResolve;
    this.rejectCallback_ = onReject;
    break;
  case PROMISE_STATE.FULLFILLED:
    onResolve(this.value_);
    break;
  case PROMISE_STATE.REJECTED:
    if (onReject) {
      onReject(this.reason_);
    }
    break;
  }
  return this;
};

MyPromise.prototype.catch = function(onReject) {
  switch (this.state_) {
  case PROMISE_STATE.PENDING:
    this.rejectCallback_ = onReject;
    break;
  case PROMISE_STATE.FULLFILLED:
    break;
  case PROMISE_STATE.REJECTED:
    onReject(this.reason_);
    break;
  }
  return this;
};

MyPromise.prototype.onResolve_ = function(value) {
  if (this.state_ !== PROMISE_STATE.PENDING) {
    return;
  }
  this.state_ = PROMISE_STATE.FULLFILLED;
  if (this.resolveCallback_) {
    this.resolveCallback_(value);
  } else {
    this.value_ = value;
  }
};

MyPromise.prototype.onReject_ = function(reason) {
  if (this.state_ !== PROMISE_STATE.PENDING) {
    return;
  }
  this.state_ = PROMISE_STATE.REJECTED;
  if (this.rejectCallback_) {
    this.rejectCallback_(reason);
  } else {
    this.reason_ = reason;
  }
};

window.Promise = window.Promise || MyPromise;

// Provide a shim for phantomjs, where chrome is not defined.
var myChrome = {
  app: {
    runtime: {
      onLaunched: {
        addListener: function(callback) {
          console.log(
              'chrome.app.runtime.onLaunched.addListener called:' +
               JSON.stringify(callback));
        }
      }
    },
    window: {
      create: function(fileName, callback) {
        console.log(
            'chrome.window.create called: ' +
            fileName + ', ' + JSON.stringify(callback));
      }
    }
  }
};

window.chrome = window.chrome || myChrome;
