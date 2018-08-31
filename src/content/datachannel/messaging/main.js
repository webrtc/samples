/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint no-unused-expressions: 0 */

'use strict';
import {LitElement, html} from 'https://unpkg.com/@polymer/lit-element?module';

class MessagingSample extends LitElement {
  constructor() {
    super();
    this.connected = false;
  }

  disconnect() {
    this._localConnection.close();
    this._remoteConnection.close();
  }

  async connect() {
    try {
      const dataChannelParams = {ordered: true};
      this._localConnection = new RTCPeerConnection();
      this._localConnection.addEventListener('icecandidate', async e => {
        console.log('local connection ICE candidate: ', e.candidate);
        await this._remoteConnection.addIceCandidate(e.candidate);
      });
      this._remoteConnection = new RTCPeerConnection();
      this._remoteConnection.addEventListener('icecandidate', async e => {
        console.log('remote connection ICE candidate: ', e.candidate);
        await this._localConnection.addIceCandidate(e.candidate);
      });

      this._localChannel = this._localConnection
        .createDataChannel('messaging-channel', dataChannelParams);
      this._localChannel.binaryType = 'arraybuffer';
      this._localChannel.addEventListener('open', () => {
        console.log('Local channel open!');
        this.connected = true;
      });
      this._localChannel.addEventListener('close', () => {
        console.log('Local channel closed!');
        this.connected = false;
      });
      this._localChannel.addEventListener('message', e => this._onLocalMessageReceived(e));

      this._remoteConnection.addEventListener('datachannel', e => this._onRemoteDataChannel(e));

      const initLocalOffer = async() => {
        const localOffer = await this._localConnection.createOffer();
        console.log(`Got local offer ${JSON.stringify(localOffer)}`);
        const localDesc = this._localConnection.setLocalDescription(localOffer);
        const remoteDesc = this._remoteConnection.setRemoteDescription(localOffer);
        return Promise.all([localDesc, remoteDesc]);
      };

      const initRemoteAnswer = async() => {
        const remoteAnswer = await this._remoteConnection.createAnswer();
        console.log(`Got remote answer ${JSON.stringify(remoteAnswer)}`);
        const localDesc = this._remoteConnection.setLocalDescription(remoteAnswer);
        const remoteDesc = this._localConnection.setRemoteDescription(remoteAnswer);
        return Promise.all([localDesc, remoteDesc]);
      };

      await initLocalOffer();
      await initRemoteAnswer();
    } catch (e) {
      console.log(e);
    }
  }

  _onLocalMessageReceived(event) {
    console.log(`Remote message received by local: ${event.data}`);
    this.localMessages += event.data + '\n';
  }

  _onRemoteDataChannel(event) {
    console.log(`onRemoteDataChannel: ${JSON.stringify(event)}`);
    this._remoteChannel = event.channel;
    this._remoteChannel.binaryType = 'arraybuffer';
    this._remoteChannel.addEventListener('message', e => this._onRemoteMessageReceived(e));
    this._remoteChannel.addEventListener('close', () => {
      console.log('Remote channel closed!');
      this.connected = false;
    });
  }

  _onRemoteMessageReceived(event) {
    console.log(`Local message received by remote: ${event.data}`);
    this.remoteMessages += event.data + '\n';
  }

  static get properties() {
    return {
      connected: Boolean,
      localMessages: String,
      remoteMessages: String
    };
  }

  _render({connected, localMessages, remoteMessages}) {
    return html`<section>
  <style>
  @import "../../../css/main.css";
  @import "main.css";
  </style>
  <div>
      <button disabled="${connected}" on-click="${() => this.connect()}">Connect</button>
      <button disabled="${!connected}" on-click="${() => this.disconnect()}">Disconnect</button>
  </div>

  <div class="messageBox">
      <label for="localOutgoing">Local outgoing message:</label>
      <textarea class="message" id="localOutgoing" 
                placeholder="Local outgoing message goes here."></textarea>
      <button disabled="${!connected}" on-click="${() => this._sendMessage(this.localOutgoing, this._localChannel)} 
      id="sendLocal">Send message from local</button>
  </div>
  <div class="messageBox">
      <label for="localIncoming">Local incoming messages:</label>
      <textarea class="message" id="localIncoming" disabled 
                placeholder="Local incoming messages arrive here.">${localMessages}</textarea>
  </div>

  <div class="messageBox">
      <label for="remoteOutgoing">Remote outgoing message:</label>
      <textarea class="message" id="remoteOutgoing" 
                placeholder="Remote outgoing message goes here."></textarea>
      <button disabled="${!connected}" on-click="${() => this._sendMessage(this.remoteOutgoing, this._remoteChannel)}" 
      id="sendRemote">Send message from remote</button>
  </div>
  <div class="messageBox">
      <label for="remoteIncoming">Remote incoming messages:</label>
      <textarea class="message" id="remoteIncoming" disabled
                placeholder="Remote incoming messages arrive here.">${remoteMessages}</textarea>
  </div>
</section>`;
  }

  get remoteOutgoing() {
    return this.shadowRoot.querySelector('#remoteOutgoing');
  }

  get localOutgoing() {
    return this.shadowRoot.querySelector('#localOutgoing');
  }

  _sendMessage(textarea, channel) {
    const value = textarea.value;
    if (value === '') {
      console.log('Not sending empty message!');
      return;
    }
    console.log('Sending remote message: ', value);
    channel.send(value);
    textarea.value = '';
  }
}

customElements.define('messaging-sample', MessagingSample);
