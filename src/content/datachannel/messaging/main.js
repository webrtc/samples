/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';
import {LitElement, html} from 'https://unpkg.com/@polymer/lit-element?module';

class MessagingSample extends LitElement {
  constructor() {
    super();
    this._localConnection = this._remoteConnection = this._localChannel = this._remoteChannel = null;
  }

  disconnect(e) {
    this._root.querySelector('#disconnectButton').disabled = true;
    this._localConnection.close();
    this._remoteConnection.close();
  }

  async connect(e) {
    try {
      this._root.querySelector('#connectButton').disabled = true;
      const dataChannelParams = {ordered: true};
      let lpc = this._localConnection = new RTCPeerConnection();
      lpc.addEventListener('icecandidate', (e) => this._onIceCandidate(e, this._remoteConnection));
      let rpc = this._remoteConnection = new RTCPeerConnection();
      rpc.addEventListener('icecandidate', (e) => this._onIceCandidate(e, this._localConnection));

      let lc = this._localChannel = this._localConnection
        .createDataChannel('messaging-channel', dataChannelParams);
      lc.binaryType = 'arraybuffer';
      lc.addEventListener('open', (e) => this._localChannelOpen(e));
      lc.addEventListener('close', (e) => this._channelClosed(e));
      lc.addEventListener('message', (e) => this._onLocalMessageReceived(e));

      rpc.addEventListener('datachannel', (e) => this._onRemoteDataChannel(e));

      const localOffer = await lpc.createOffer();
      console.log(`Got local offer ${JSON.stringify(localOffer)}`);
      lpc.setLocalDescription(localOffer);
      rpc.setRemoteDescription(localOffer);
      const remoteOffer = await rpc.createAnswer();
      console.log(`Got remote answer ${JSON.stringify(remoteOffer)}`);
      rpc.setLocalDescription(remoteOffer);
      lpc.setRemoteDescription(remoteOffer);
    } catch (e) {
      console.log(e);
    }
  }

  async _onIceCandidate(e, connection) {
    try {
      console.log(`onIceCandidate: ${JSON.stringify(e)}`);
      // eslint-disable-next-line no-unused-vars
      const result = await connection.addIceCandidate(e.candidate);
      console.log('addIceCandidate successful!');
    } catch (e) {
      console.log(`error on addIceCandidate: ${JSON.stringify(e)}`);
    }
  }

  _localChannelOpen(event) {
    console.log(`Local channel open: ${JSON.stringify(event)}`);
    this._root.querySelector('#sendLocal').disabled = false;
    this._root.querySelector('#sendRemote').disabled = false;
    this._root.querySelector('#disconnectButton').disabled = false;
  }

  _channelClosed(event) {
    console.log(`Channel closed: ${JSON.stringify(event)}`);
    this._root.querySelector('#sendLocal').disabled = true;
    this._root.querySelector('#sendRemote').disabled = true;
    this._root.querySelector('#connectButton').disabled = false;
  }

  _onLocalMessageReceived(event) {
    console.log(`Remote message received by local: ${event.data}`);
    this._root.querySelector('#localIncoming').value += event.data + '\n';
  }

  _onRemoteDataChannel(event) {
    console.log(`onRemoteDataChannel: ${JSON.stringify(event)}`);
    this._remoteChannel = event.channel;
    this._remoteChannel.binaryType = 'arraybuffer';
    this._remoteChannel.addEventListener('message', (e) => this._onRemoteMessageReceived(e));
    this._remoteChannel.addEventListener('close', (e) => this._channelClosed(e));
  }

  _onRemoteMessageReceived(event) {
    console.log(`Local message received by remote: ${event.data}`);
    this._root.querySelector('#remoteIncoming').value += event.data + '\n';
  }

  _render() {
    return html`
    <section>
        <style>
        @import "../../../css/main.css";
        @import "main.css";
        </style>
        <div>
            <button id="connectButton">Connect</button>
            <button disabled id="disconnectButton">Disconnect</button>
        </div>

        <div class="messageBox">
            <label for="localOutgoing">Local outgoing message:</label>
            <textarea class="message" id="localOutgoing" 
                      placeholder="Local outgoing message goes here."></textarea>
            <button disabled id="sendLocal">Send message from local</button>
        </div>
        <div class="messageBox">
            <label for="localIncoming">Local incoming messages:</label>
            <textarea class="message" id="localIncoming" disabled 
                      placeholder="Local incoming messages arrive here."></textarea>
        </div>

        <div class="messageBox">
            <label for="remoteOutgoing">Remote outgoing message:</label>
            <textarea class="message" id="remoteOutgoing" 
                      placeholder="Remote outgoing message goes here."></textarea>
            <button disabled id="sendRemote">Send message from remote</button>
        </div>
        <div class="messageBox">
            <label for="remoteIncoming">Remote incoming messages:</label>
            <textarea class="message" id="remoteIncoming" disabled
                      placeholder="Remote incoming messages arrive here."></textarea>
        </div>

    </section>`;
  }

  _firstRendered() {
    this._root.querySelector('#connectButton').addEventListener('click', (e) => this.connect(e));
    this._root.querySelector('#disconnectButton').addEventListener('click', (e) => this.disconnect(e));
    this._root.querySelector('#sendLocal').addEventListener('click', (e) => this._sendLocalMessage(e));
    this._root.querySelector('#sendRemote').addEventListener('click', (e) => this._sendRemoteMessage(e));
  }

  // noinspection JSUnusedLocalSymbols
  _sendLocalMessage(e) {
    const message = this._root.querySelector('#localOutgoing').value;
    if (message === '') {
      console.log('Not sending empty message!');
      return;
    }
    console.log(`Sending local message: ${message}`);
    this._localChannel.send(message);
    this._root.querySelector('#localOutgoing').value = '';
  }

  // noinspection JSUnusedLocalSymbols
  _sendRemoteMessage(e) {
    const message = this._root.querySelector('#remoteOutgoing').value;
    if (message === '') {
      console.log('Not sending empty message!');
      return;
    }
    console.log(`Sending remote message: ${message}`);
    this._remoteChannel.send(message);
    this._root.querySelector('#remoteOutgoing').value = '';
  }
}

customElements.define('messaging-sample', MessagingSample);