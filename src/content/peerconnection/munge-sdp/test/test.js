/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint-env node */

'use strict';
export default {
  'Checking element state during manual signalling': (browser) => {
    const path = '/src/content/peerconnection/munge-sdp/index.html';
    const url = 'file://' + process.cwd() + path;

    browser.url(url).waitForElementVisible('#getMedia', 1000, 'Check that the getMedia button is visible');
    browser.expect.element('#createPeerConnection').to.not.be.enabled.before(1000);
    browser.expect.element('#createOffer').to.not.be.enabled.before(1000);
    browser.expect.element('#setOffer').to.not.be.enabled.before(1000);
    browser.expect.element('#createAnswer').to.not.be.enabled.before(1000);
    browser.expect.element('#setAnswer').to.not.be.enabled.before(1000);
    browser.expect.element('#hangup').to.not.be.enabled.before(1000);
    browser.click('#getMedia');
    browser.waitForMediaPlaybackReady('div#local video', 5000);
    browser.expect.element('#createPeerConnection').to.be.enabled.before(1000);
    browser.click('#createPeerConnection');
    browser.expect.element('#createOffer').to.be.enabled.before(1000);
    browser.expect.element('#setOffer').to.be.enabled.before(1000);
    browser.expect.element('#createAnswer').to.be.enabled.before(1000);
    browser.expect.element('#setAnswer').to.be.enabled.before(1000);
    browser.expect.element('#hangup').to.be.enabled.before(1000);
    browser
        .click('#createOffer')
        .click('#setOffer')
        .click('#createAnswer')
        .click('#setAnswer');
    browser.waitForMediaPlaybackReady('div#remote video', 5000);
    browser.click('#hangup');
    browser.expect.element('#createPeerConnection').to.not.be.enabled.before(1000);
    browser.expect.element('#createOffer').to.not.be.enabled.before(1000);
    browser.expect.element('#setOffer').to.not.be.enabled.before(1000);
    browser.expect.element('#createAnswer').to.not.be.enabled.before(1000);
    browser.expect.element('#setAnswer').to.not.be.enabled.before(1000);
    browser.expect.element('#hangup').to.not.be.enabled.before(1000);
    browser.end();
  }
};
