/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';
/* exported arrayAverage, arrayMax, arrayMin */

  // array<function> returns the average (down to nearest int), max and min of
  // an int array.
function arrayAverage(array) {
  var cnt, tot, i;
  cnt = array.length;
  tot = i = 0;
  while (i < cnt) {
    tot += array[i++];
  }
  return Math.floor(tot / cnt);
}

function arrayMax(array) {
  return Math.max.apply(Math, array);
}

function arrayMin(array) {
  return Math.min.apply(Math, array);
}
