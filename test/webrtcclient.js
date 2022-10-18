/*
 *  Copyright (c) 2022 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
// Disable no-undef since this file is a mix of code executed
// in JS and the browser.
/* eslint no-undef: 0 */
class MediaStream {
  constructor(tracks = []) {
    this.tracks = tracks;
    this.id = 0;
  }

  getTracks() {
    return this.tracks;
  }

  getAudioTracks() {
    return this.getTracks().filter(t => t.kind === 'audio');
  }

  getVideoTracks() {
    return this.getTracks().filter(t => t.kind === 'video');
  }
}

class MediaDevices {
  constructor(driver) {
    this.driver = driver;
  }

  getUserMedia(constraints) {
    return this.driver.executeAsyncScript((constraints) => {
      const callback = arguments[arguments.length - 1];
      if (!window.localStreams) {
        window.localStreams = {};
      }

      return navigator.mediaDevices.getUserMedia(constraints)
          .then((stream) => {
            window.localStreams[stream.id] = stream;
            callback({id: stream.id, tracks: stream.getTracks().map((t) => {
              return {id: t.id, kind: t.kind};
            })});
          }, (e) => callback(e));
    }, constraints || {audio: true, video: true})
        .then((streamObj) => {
          const stream = new MediaStream(streamObj.tracks);
          stream.id = streamObj.id;
          return stream;
        });
  }
}

class PeerConnection {
  constructor(driver) {
    this.driver = driver;
  }

  create(rtcConfiguration) {
    return this.driver.executeScript(rtcConfiguration => {
      window.pc = new RTCPeerConnection(rtcConfiguration);
    }, rtcConfiguration);
  }

  addTrack(track, stream) {
    return this.driver.executeScript((track, stream) => {
      stream = localStreams[stream.id];
      track = stream.getTracks().find(t => t.id === track.id);
      pc.addTrack(track, stream);
    }, track, stream);
  }

  createOffer(offerOptions) {
    return this.driver.executeAsyncScript((offerOptions) => {
      const callback = arguments[arguments.length - 1];

      pc.createOffer(offerOptions)
          .then(callback, callback);
    }, offerOptions);
  }
  createAnswer() {
    return this.driver.executeAsyncScript(() => {
      const callback = arguments[arguments.length - 1];

      pc.createAnswer()
          .then(callback, callback);
    });
  }

  // resolves with non-trickle description including candidates.
  setLocalDescription(desc) {
    return this.driver.executeAsyncScript((desc) => {
      const callback = arguments[arguments.length - 1];

      pc.onicecandidate = (event) => {
        console.log('candidate', event.candidate);
        if (!event.candidate) {
          pc.onicecandidate = null;
          callback(pc.localDescription);
        }
      };
      pc.setLocalDescription(desc)
          .catch(callback);
    }, desc);
  }

  // TODO: this implicitly creates video elements, is that deseriable?
  setRemoteDescription(desc) {
    return this.driver.executeAsyncScript(function(desc) {
      const callback = arguments[arguments.length - 1];

      pc.ontrack = function(event) {
        const id = event.streams[0].id;
        if (document.getElementById('video-' + id)) {
          return;
        }
        const video = document.createElement('video');
        video.id = 'video-' + id;
        video.autoplay = true;
        video.srcObject = event.streams[0];
        document.body.appendChild(video);
      };
      pc.setRemoteDescription(new RTCSessionDescription(desc))
          .then(callback, callback);
    }, desc);
  }
}

module.exports = {
  PeerConnection,
  MediaDevices,
  MediaStream,
};

