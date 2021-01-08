/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

import {peer} from './peer.js';

const politeIframe = document.getElementById('polite');
const impoliteIframe = document.getElementById('impolite');
let counter = 0;

/**
 * @param {Window} target
 * @param {string} cmd
 */
export async function run(target, cmd) {
  const id = `result${counter++}`;
  target.postMessage({run: {cmd, id}}, '*');
  return new Promise(resolve => void window.addEventListener('message', function listen({data}) {
    if (!(id in data)) return;
    window.removeEventListener('message', listen);
    resolve(data[id]);
  }));
}

/**
 * @param {number} r1 Video 1 Red channel level [0-1]
 * @param {number} g1 Video 1 Green channel level [0-1]
 * @param {number} b1 Video 1 Blue channel level [0-1]
 * @param {number} r2 Video 2 Red channel level [0-1]
 * @param {number} g2 Video 2 Green channel level [0-1]
 * @param {number} b2 Video 2 Blue channel level [0-1]
 */
export function startLocalVideo(r1, g1, b1, r2, g2, b2) {
  const whiteNoise = (width, height, r, g, b) => {
    const canvas = Object.assign(document.createElement('canvas'), {width, height});
    const ctx = canvas.getContext('2d');
    ctx.fillRect(0, 0, width, height);
    const p = ctx.getImageData(0, 0, width, height);
    const draw = () => {
      for (let i = 0; i < p.data.length; i++) {
        const color = Math.random() * 255;
        p.data[i++] = color * r;
        p.data[i++] = color * g;
        p.data[i++] = color * b;
      }
      ctx.putImageData(p, 0, 0);
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    return canvas.captureStream();
  };
  const localVideo1 = document.getElementById('localVideo1');
  localVideo1.srcObject = whiteNoise(32, 32, r1, g1, b1);
  localVideo1.play();
  const localVideo2 = document.getElementById('localVideo2');
  localVideo2.srcObject = whiteNoise(32, 32, r2, g2, b2);
  localVideo2.play();
}

/**
 * @param {HTMLIFrameElement} el
 * @param {boolean} polite
 * @param {number} r1 Video 1 Red channel level [0-1]
 * @param {number} g1 Video 1 Green channel level [0-1]
 * @param {number} b1 Video 1 Blue channel level [0-1]
 * @param {number} r2 Video 2 Red channel level [0-1]
 * @param {number} g2 Video 2 Green channel level [0-1]
 * @param {number} b2 Video 2 Blue channel level [0-1]
 */
async function setupIframe(el, polite, r1, g1, b1, r2, g2, b2) {
  el.srcdoc = `<!DOCTYPE html>
      <html>
      <body>
      <h3 style="font-family: 'Roboto', sans-serif; font-weight: 400;">${polite ? 'Polite' : 'Impolite'} Peer's iframe</h3>
      <div id="buttons">
        <button onclick="(${startLocalVideo.toString()})(${r1},${g1},${b1},${r2},${g2},${b2});" id="${polite ? 'politeStart' : 'impoliteStart'}">Start</button>
        <button onclick="window.parent.run(window, 'swapTransceivers');">Swap Sending Track</button>
      </div>
      <p id="videos">
        <video id="localVideo1" autoplay></video>
        <video id="localVideo2" autoplay></video>
        <video id="remoteVideo" autoplay></video>
      </p>
      </body>
      <script>
        (${peer.toString()})(window.parent.document.getElementById("${polite ? 'impolite' : 'polite'}").contentWindow, ${polite});
      </script>
      <html>`;
  await new Promise(resolve => el.onload = resolve);
}

export async function swapOnBoth(politeFirst) { // eslint-disable-line no-unused-vars
  if (politeFirst) {
    run(politeIframe.contentWindow, 'swapTransceivers');
    run(impoliteIframe.contentWindow, 'swapTransceivers');
  } else {
    run(impoliteIframe.contentWindow, 'swapTransceivers');
    run(politeIframe.contentWindow, 'swapTransceivers');
  }
}

async function setupIframes() {
  await setupIframe(politeIframe, true, 0, 1, 0, 0, 1, 1);
  await setupIframe(impoliteIframe, false, 1, 0, 0, 1, 0, 1);
}

window.run = run;
window.swapOnBoth = swapOnBoth;
window.peer = peer;
export {peer};

setupIframes();
