/*
 *  Copyright (c) 2023 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/* global MediaStreamTrackGenerator, EncodedVideoChunk */
if (typeof MediaStreamTrackGenerator === 'undefined') {
  alert(
      'Your browser does not support the experimental MediaStreamTrack API ' +
      'for Insertable Streams of Media. See the note at the bottom of the ' +
      'page.');
}

// Reader for the IVF file format as described by
// https://wiki.multimedia.cx/index.php/Duck_IVF
class IVF {
  constructor(file) {
    this.blob = file;
    this.offset = 0;
  }

  async readHeader() {
    if (this.offset !== 0) {
      console.error('readHeader called not at start of file.');
      return;
    }
    this.offset = 32;

    const header = await this.blob.slice(0, 32).arrayBuffer();
    const view = new DataView(header);
    const decoder = new TextDecoder('ascii');
    return {
      codec: decoder.decode(header.slice(8, 12)),
      width: view.getUint16(12, true),
      height: view.getUint16(14, true),
      fpsDenominator: view.getUint32(16, true),
      fpsNumerator: view.getUint32(20, true),
    };
  }

  async readFrame() {
    if (this.offset == this.blob.size) {
      return; // done.
    } else if (this.offset === 0) {
      console.error('readFrame called without reading header.');
      return;
    }
    const header = await this.blob.slice(this.offset, this.offset + 12).arrayBuffer();
    const view = new DataView(header);
    const frameLength = view.getUint32(0, true);
    const timestamp = view.getBigUint64(4, true);
    const currentOffset = this.offset;
    this.offset += 12 + frameLength;
    return {
      timestamp,
      data: new Uint8Array(await this.blob.slice(currentOffset + 12, currentOffset + 12 + frameLength).arrayBuffer()),
    };
  }
}

// Translate between IVF fourcc codec names and WebCodec named.
const IVF2WebCodecs = {
  VP80: 'vp8',
  VP90: 'vp09.00.10.08',
  H264: 'avc1.42E01F',
  AV01: 'av01.0.08M.08.0.110.09', // AV1 Main Profile, level 4.0, Main tier, 8-bit content, non-monochrome, with 4:2:0 chroma subsampling
};

const input = document.getElementById('input');
const localVideo = document.getElementById('localVideo');
const metadata = document.getElementById('metadata');
input.onchange = async (event) => {
  event.target.disabled = true;
  const file = event.target.files[0];
  const ivf = new IVF(file);
  const generator = new MediaStreamTrackGenerator('video');
  const writer = generator.writable.getWriter();
  localVideo.srcObject = new MediaStream([generator]);

  const header = await ivf.readHeader();
  if (header) {
    metadata.innerText = 'File metadata: ' + JSON.stringify(header, null, ' ');
  } else {
    metadata.innerText = 'Failed to load IVF file.';
    return;
  }

  const decoder = new VideoDecoder({
    output: async (frame) => {
      await writer.write(frame);
      frame.close();
      const nextFrame = await ivf.readFrame();
      if (nextFrame) {

        decoder.decode(new EncodedVideoChunk({
          timestamp: Number(nextFrame.timestamp - firstFrame.timestamp) * 1000,
          type: 'delta',
          data: nextFrame.data,
        }));
      } else {
        decoder.flush();
      }
    },
    error: e => console.error(e.message, e),
  });
  VideoDecoder.isConfigSupported({codec: IVF2WebCodecs[header.codec], codedWidth: header.width, codedHeight: header.height})
  .then(config => console.log(config))
  decoder.configure({
    codec: IVF2WebCodecs[header.codec],
    codedWidth: header.width,
    codedHeight: header.height,
  });
  const firstFrame = await ivf.readFrame();
  decoder.decode(new EncodedVideoChunk({
    timestamp: 0,
    type: 'key',
    data: firstFrame.data,
  }));
};
