/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true, eqeqeq: true, forin: false, globalstrict: true, quotmark: single, undef: true, unused: strict */

'use strict';

// Global WebAudio context that can be shared by all tests.
// There is a very finite number of WebAudio contexts.
var audioContext = new AudioContext();
var output = document.getElementById('output');
var bugButton = document.getElementById('bug-button');
var audioSelect = document.querySelector('select#audioSource');
var videoSelect = document.querySelector('select#videoSource');
var PREFIX_RUN    = '[ RUN    ]';
var PREFIX_OK     = '[     OK ]';
var PREFIX_FAILED = '[ FAILED ]';
var testSuites = [];
var nextTestIndex;
var successes;
var failures;

var writer = {
  output:"",
  log:function(){
    var args = Array.prototype.slice.call(arguments);
    output.innerHTML += "<span class='log'>" + args.join(" ") + "</span>\n";
    output.scrollTop = output.scrollHeight;
    writer.output += args.join(" ");
  },
  error:function(){
    var args = Array.prototype.slice.call(arguments);
    output.innerHTML += "<span class='err'>" + args.join(" ") + "</span>\n";
    output.scrollTop = output.scrollHeight;
    writer.output += args.join(" ");
  },
  info:function(){
    var args = Array.prototype.slice.call(arguments);
    output.innerHTML += "<span class='inf'>" + args.join(" ") + "</span>\n";
    output.scrollTop = output.scrollHeight;
    writer.output += args.join(" ");
  },
  warn:function(){
    var args = Array.prototype.slice.call(arguments);
    output.innerHTML += "<span class='wrn'>" + args.join(" ") + "</span>\n";
    output.scrollTop = output.scrollHeight;
    writer.output += args.join(" ");
  }
}


WebRTCTest.complete(function(){
  bugButton.disabled = false;
});


function doGetUserMedia(constraints, onSuccess) {
  // Call into getUserMedia via the polyfill (adapter.js).
  var successFunc = function(stream) {
    trace('User has granted access to local media.');
    onSuccess(stream);
  }
  var failFunc = function(error) {
    var errorMessage = 'Failed to get access to local media. Error name was ' +
      error.name;
    return reportFatal(errorMessage);
  }
  try {
    // Append the constraints with the getSource constraints.
    appendSourceId(audioSelect.value, 'audio', constraints);
    appendSourceId(videoSelect.value, 'video', constraints);

    getUserMedia(constraints, successFunc, failFunc);
    trace('Requested access to local media with constraints:\n' +
        '  \'' + JSON.stringify(constraints) + '\'');
  } catch (e) {
    return reportFatal('getUserMedia failed with exception: ' + e.message);
  }
}

function appendSourceId(id, type, constraints) {
  if (constraints[type] == null)
    return;

  if (constraints[type] == true)
    constraints[type] = { optional: [{sourceId: id}] };
  else if (constraints[type].optional == null)
    constraints[type].optional = [{sourceId: id}];
  else
    constraints[type].optional.push( {sourceId: id} );
}

function gotSources(sourceInfos) {
  for (var i = 0; i != sourceInfos.length; ++i) {
    var sourceInfo = sourceInfos[i];
    var option = document.createElement('option');
    option.value = sourceInfo.id;
    appendOption(sourceInfo, option);
  }
}

function appendOption(sourceInfo, option) {
  if (sourceInfo.kind === 'audio') {
    option.text = sourceInfo.label || 'microphone ' + (audioSelect.length + 1);
    audioSelect.appendChild(option);
  } else if (sourceInfo.kind === 'video') {
    option.text = sourceInfo.label || 'camera ' + (videoSelect.length + 1);
    videoSelect.appendChild(option);
  } else {
    console.log('Some other kind of source');
  }
}

if (typeof MediaStreamTrack === 'undefined') {
  reportFatal('This browser does not support MediaStreamTrack.\n Try Chrome Canary.');
} else {
  MediaStreamTrack.getSources(gotSources);
}

function selectText(el) {
  if (document.selection) {
    var range = document.body.cateTextRange();
    range.moveToElementText(el);
    range.select();
  } else if (window.getSelection) {
    var range = document.createRange();
    range.selectNode(el);
    window.getSelection().addRange(range);
  }
}
