/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Establishes a Peer Connection with `other` using the Perfect Negotiation pattern.
 * @param {Window} other
 * @param {boolean} polite
 * @param {function(Error): void} fail
 * @return {RTCPeerConnection} Peer Connection
 */
function peer(other, polite, fail = undefined) { // eslint-disable-line no-unused-vars
  if (!fail) fail = e => void send(window.parent, {error: `${e.name}: ${e.message}`});
  const send = (target, msg) => void target.postMessage(JSON.parse(JSON.stringify(msg)), '*');
  const log = str => void console.log(`[${polite ? 'POLITE' : 'IMPOLITE'}] ${str}`);
  const assert_equals = !window.assert_equals ?
      (a, b, msg) => a === b || void fail(new Error(`${msg} expected ${b} but got ${a}`)) :
      window.assert_equals;
  const pc = new RTCPeerConnection();
  const localVideo1 = document.getElementById('localVideo1');
  const localVideo2 = document.getElementById('localVideo2');
  const remoteVideo = document.getElementById('remoteVideo');
  const transceiversForSending = [];
  const commands = {
    async swapTransceivers() {
      log('swapTransceivers');
      const stream1 = localVideo1.srcObject;
      const stream2 = localVideo2.srcObject;
      if (transceiversForSending.length == 0) {
        // This is the first time swapTransceivers is called.
        // Add the initial transceivers, which are remembered for future swaps.
        transceiversForSending.push(
            pc.addTransceiver(stream1.getTracks()[0], {streams: [stream1], direction: 'sendonly'}));
        transceiversForSending.push(
            pc.addTransceiver('video', {streams: [stream2], direction: 'inactive'}));
        return;
      }
      // We have sent before. Swap which transceiver is the sending one.
      if (transceiversForSending[0].direction == 'sendonly') {
        transceiversForSending[0].direction = 'inactive';
        transceiversForSending[0].sender.replaceTrack(null);
        transceiversForSending[1].direction = 'sendonly';
        transceiversForSending[1].sender.replaceTrack(stream2.getTracks()[0]);
      } else {
        transceiversForSending[1].direction = 'inactive';
        transceiversForSending[1].sender.replaceTrack(null);
        transceiversForSending[0].direction = 'sendonly';
        transceiversForSending[0].sender.replaceTrack(stream1.getTracks()[0]);
      }
    },
  };
  try {
    pc.ontrack = e => {
      log('ontrack');
      remoteVideo.srcObject = new MediaStream();
      remoteVideo.srcObject.addTrack(e.track);
    };
    pc.onicecandidate = ({candidate}) => void send(other, {candidate});
    let makingOffer = false;
    let ignoreOffer = false;
    let srdAnswerPending = false;
    pc.onnegotiationneeded = async () => {
      try {
        log('SLD due to negotiationneeded');
        assert_equals(pc.signalingState, 'stable', 'negotiationneeded always fires in stable state');
        assert_equals(makingOffer, false, 'negotiationneeded not already in progress');
        makingOffer = true;
        await pc.setLocalDescription();
        assert_equals(pc.signalingState, 'have-local-offer', 'negotiationneeded not racing with onmessage');
        assert_equals(pc.localDescription.type, 'offer', 'negotiationneeded SLD worked');
        send(other, {description: pc.localDescription});
      } catch (e) {
        fail(e);
      } finally {
        makingOffer = false;
      }
    };
    window.onmessage = async ({data: {description, candidate, run}}) => {
      try {
        if (description) {
          // If we have a setRemoteDescription() answer operation pending, then
          // we will be "stable" by the time the next setRemoteDescription() is
          // executed, so we count this being stable when deciding whether to
          // ignore the offer.
          const isStable =
              pc.signalingState == 'stable' ||
              (pc.signalingState == 'have-local-offer' && srdAnswerPending);
          ignoreOffer =
              description.type == 'offer' && !polite && (makingOffer || !isStable);
          if (ignoreOffer) {
            log('glare - ignoring offer');
            return;
          }
          srdAnswerPending = description.type == 'answer';
          log(`SRD(${description.type})`);
          await pc.setRemoteDescription(description);
          srdAnswerPending = false;
          if (description.type == 'offer') {
            assert_equals(pc.signalingState, 'have-remote-offer', 'Remote offer');
            assert_equals(pc.remoteDescription.type, 'offer', 'SRD worked');
            log('SLD to get back to stable');
            await pc.setLocalDescription();
            assert_equals(pc.signalingState, 'stable', 'onmessage not racing with negotiationneeded');
            assert_equals(pc.localDescription.type, 'answer', 'onmessage SLD worked');
            send(other, {description: pc.localDescription});
          } else {
            assert_equals(pc.remoteDescription.type, 'answer', 'Answer was set');
            assert_equals(pc.signalingState, 'stable', 'answered');
            pc.dispatchEvent(new Event('negotiated'));
          }
        } else if (candidate) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (e) {
            if (!ignoreOffer) throw e;
          }
        } else if (run) {
          send(window.parent, {[run.id]: await commands[run.cmd]() || 0});
        }
      } catch (e) {
        fail(e);
      }
    };
  } catch (e) {
    fail(e);
  }
  return pc;
}

export {peer};
