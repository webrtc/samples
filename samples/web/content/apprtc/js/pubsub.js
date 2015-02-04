/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

var apprtc = apprtc || {};

(function() {

var Log = apprtc.Log;

/*
 * Simple implementation of a topic-based publish/subscribe pattern.
 */
var Pubsub = function() {
  this.topics = {};
};

// Subscribe to the topic with a function that takes a single dictionary
// argument as its paramter.
Pubsub.prototype.subscribe = function(topic, fn) {
  if (!topic || !fn) {
    Log.error('Missing topic or fn!');
    return;
  }
  var subscriptions = this.topics[topic];
  if (!subscriptions) {
    subscriptions = this.topics[topic] = [];
  }
  if (subscriptions.indexOf(fn) === -1) {
    subscriptions.push(fn);
  } else {
    Log.warn('Already subscribed to topic.');
  }
};

// Subscribe to all topic pair keyvals in the given dictionary.
Pubsub.prototype.subscribeAll = function(subscriptions) {
  for (var topic in subscriptions) {
    this.subscribe(topic, subscriptions[topic]);
  }
};

// Unsubscribe function from the topic.
Pubsub.prototype.unsubscribe = function(topic, fn) {
  var subscriptions = this.topics[topic];
  if (subscriptions) {
    var i = subscriptions.indexOf(fn);
    if (i !== -1) {
      subscriptions.splice(i, 1);
    }
    if (subscriptions.length === 0) {
      delete this.topics[topic];
    }
  }
};

// Unsubscribe all topic pair keyvals in the given dictionary.
Pubsub.prototype.unsubscribeAll = function(subscriptions) {
  for (var topic in subscriptions) {
    this.unsubscribe(topic, subscriptions[topic]);
  }
};

// Publish to the given topic with args dictionary. Calls the subscribed
// function using args.
Pubsub.prototype.publish = function(topic, args) {
  if (!topic) {
    Log.error('Missing topic!');
    return;
  }
  var subscriptions = this.topics[topic];
  // Bail if nothing subscribed.
  if (!subscriptions || subscriptions.length === 0) {
    return;
  }
  subscriptions.forEach(function(fn) {
    // Execute the function.
    fn(args || {});
  });
};

// Clears all subscriptions.
Pubsub.prototype.clear = function() {
  this.topics = {};
};

// Create an instance for use in apprtc.
apprtc.pubsub = new Pubsub();

})();
