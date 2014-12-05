/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* Adapted from mrdoob's stats.js (MIT License) */

/* More information about these options at jshint.com/docs/options */
/* exported VideoStats */

'use strict';

var VideoStats = function () {

  var startTime = Date.now(), prevTime = startTime;
  var fps = 0, fpsMin = Infinity, fpsMax = 0, fpsShow = 30;
  var frames = 0, prevFrames = 0;
  var video, timer;

  var container = document.createElement('div');
  container.id = 'stats';
  container.style.cssText =
      'position:absolute;width:80px;opacity:0.9;cursor:pointer';

  var fpsDiv = document.createElement( 'div' );
  fpsDiv.id = 'fps';
  fpsDiv.style.cssText =
      'padding:0 0 3px 3px;text-align:left;background-color:#002';
  container.appendChild(fpsDiv);

  var fpsText = document.createElement('div');
  fpsText.id = 'fpsText';
  fpsText.style.cssText =
      'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
  fpsText.innerHTML = '---';
  fpsDiv.appendChild(fpsText);

  var fpsGraph = document.createElement('div');
  fpsGraph.id = 'fpsGraph';
  fpsGraph.style.cssText =
      'position:relative;width:74px;height:30px;background-color:#0ff';
  fpsDiv.appendChild(fpsGraph);

  while (fpsGraph.children.length < 74) {
    var bar = document.createElement('span');
    bar.style.cssText =
        'width:1px;height:30px;float:left;background-color:#113';
    fpsGraph.appendChild(bar);
  }

  var updateGraph = function(dom, value) {
    var child = dom.appendChild(dom.firstChild);
    child.style.height = value + 'px';
  };

  return {
    domElement: container,

    start: function(video) {
      this.video = video;
      prevTime = Date.now();
      frames = prevFrames = video.webkitDecodedFrameCount;
      var self = this;
      timer = setInterval(function() {
        self.update();
      }, 1000);
    },

    stop: function() {
      clearInterval(timer);
      frames = prevFrames = 0;
    },

    update: function() {
      var time = Date.now();
      frames = this.video.webkitDecodedFrameCount;
      if (time >= prevTime + 1000) {
        fps = Math.round(((frames - prevFrames) * 1000 ) /
            (time - prevTime));
        fpsMin = Math.min(fpsMin, fps);
        fpsMax = Math.max(fpsMax, fps);

        fpsText.textContent = this.video.videoHeight + 'p' + fps +
            ' (' + fpsMin + '-' + fpsMax + ')';
        updateGraph(fpsGraph, Math.min(30, 30 - (fps / fpsShow) * 30 ));

        prevTime = time;
        prevFrames = frames;
      }
      startTime = time;
    }
  };
};
