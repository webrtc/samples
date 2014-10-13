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


/* This is an implementation of the algorithm for calculating the Structural
 * SIMilarity (SSIM) index between two images. Please refer to the article [1]
 * and/or the Wikipedia article [2]. In particular this JS code is weakly
 * inspired by the associated public domain Matlab implementation in [3].
 *
 * [1] Z. Wang, A. C. Bovik, H. R. Sheikh, and E. P. Simoncelli, "Image quality
 * assessment: From error measurement to structural similarity",
 * IEEE Transactions on Image Processing, vol. 13, no. 1, Jan. 2004.
 * [2] http://en.wikipedia.org/wiki/Structural_similarity
 * [3] http://www.cns.nyu.edu/~lcv/ssim/ssim_index.m
 */

function Ssim() {
};

Ssim.prototype = {

  // Implementation of Eq.2, a simple average of a vector and Eq.4., except the
  // square root. The latter is actually an unbiased estimate of the variance,
  // not the exact variance.
  statistics: function(a) {
    var accu = 0;
    for (var i = 0; i < a.length; ++i)
      accu += a[i];
    var mean_a = accu / (a.length - 1);
    var diff = 0;
    for (var i = 1; i < a.length; ++i) {
      diff = a[i - 1] - mean_a;
      accu += a[i] + (diff * diff);
    }
    return {mean : mean_a, variance : accu / a.length};
  },

  // Implementation of Eq.11., cov(Y, Z) = E((Y - uY), (Z - uZ)).
  covariance: function(a, b, mean_a, mean_b) {
    var accu = 0;
    for (var i = 0; i < a.length; i += 1)
      accu += (a[i] - mean_a) * (b[i] - mean_b);
    return accu / a.length;
  },

  calculate: function(x, y) {
    if (x.length !== y.length) {
      return 0;
    }

    // Values of the constants come from the Matlab code referred before.
    var K1 = 0.01;
    var K2 = 0.03;
    var L = 255;
    var C1 = (K1 * L) * (K1 * L);
    var C2 = (K2 * L) * (K2 * L);
    var C3 = C2 / 2;

    var stats_x = this.statistics(x);
    var mu_x = stats_x.mean;
    var sigma_x2 = stats_x.variance;
    var sigma_x = Math.sqrt(sigma_x2);
    var stats_y = this.statistics(y);
    var mu_y = stats_y.mean;
    var sigma_y2 = stats_y.variance;
    var sigma_y = Math.sqrt(sigma_y2);
    var sigma_xy = this.covariance(x, y, mu_x, mu_y);

    // Implementation of Eq.6.
    var luminance = (2 * mu_x * mu_y + C1) /
        ((mu_x * mu_x) + (mu_y * mu_y) + C1);
    // Implementation of Eq.10.
    var structure = (sigma_xy + C3) / (sigma_x * sigma_y + C3);
    // Implementation of Eq.9.
    var contrast = (2 * sigma_x * sigma_y + C2) / (sigma_x2 + sigma_y2 + C2);

    // Implementation of Eq.12.
    return luminance * contrast * structure;
  }
};
