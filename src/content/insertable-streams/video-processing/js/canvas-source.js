/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const TEXT_SOURCE =
    'https://raw.githubusercontent.com/w3c/mediacapture-insertable-streams/main/explainer.md';
const CANVAS_ASPECT_RATIO = 16 / 9;

/**
 * @param {number} x
 * @return {number} x rounded to the nearest even integer
 */
function roundToEven(x) {
  return 2 * Math.round(x / 2);
}

/**
 * Draws text on a Canvas.
 * @implements {MediaStreamSource} in pipeline.js
 */
class CanvasSource { // eslint-disable-line no-unused-vars
  constructor() {
    /** @private {boolean} */
    this.visibility_ = false;
    /**
     * @private {?HTMLCanvasElement} canvas element providing the MediaStream.
     */
    this.canvas_ = null;
    /**
     * @private {?CanvasRenderingContext2D} the 2D context used to draw the
     *     animation.
     */
    this.ctx_ = null;
    /**
     * @private {?MediaStream} the MediaStream from captureStream.
     */
    this.stream_ = null;
    /**
     * @private {?CanvasCaptureMediaStreamTrack} the capture track from
     *     canvas_, obtained from stream_. We manually request new animation
     *     frames on this track.
     */
    this.captureTrack_ = null;
    /** @private {number} requestAnimationFrame handle */
    this.requestAnimationFrameHandle_ = 0;
    /** @private {!Array<string>} text to render */
    this.text_ = ['WebRTC samples'];
    /** @private {string} */
    this.debugPath_ = '<unknown>';
    fetch(TEXT_SOURCE)
        .then(response => {
          if (response.ok) {
            return response.text();
          }
          throw new Error(`Request completed with status ${response.status}.`);
        })
        .then(text => {
          this.text_ = text.trim().split('\n');
        })
        .catch((e) => {
          console.log(`[CanvasSource] The request to retrieve ${
            TEXT_SOURCE} encountered an error: ${e}.`);
        });
  }
  /** @override */
  setDebugPath(path) {
    this.debugPath_ = path;
  }
  /** @override */
  setVisibility(visible) {
    this.visibility_ = visible;
    if (this.canvas_) {
      this.updateCanvasVisibility();
    }
  }
  /** @private */
  updateCanvasVisibility() {
    if (this.canvas_.parentNode && !this.visibility_) {
      this.canvas_.parentNode.removeChild(this.canvas_);
    } else if (!this.canvas_.parentNode && this.visibility_) {
      console.log('[CanvasSource] Adding source canvas to page.');
      const outputVideoContainer =
          document.getElementById('outputVideoContainer');
      outputVideoContainer.parentNode.insertBefore(
          this.canvas_, outputVideoContainer);
    }
  }
  /** @private */
  requestAnimationFrame() {
    this.requestAnimationFrameHandle_ =
        requestAnimationFrame(now => this.animate(now));
  }
  /**
   * @private
   * @param {number} now current animation timestamp
   */
  animate(now) {
    this.requestAnimationFrame();
    const ctx = this.ctx_;
    if (!this.canvas_ || !ctx || !this.captureTrack_) {
      return;
    }

    // Resize canvas based on displayed size; or if not visible, based on the
    // output video size.
    // VideoFrame prefers to have dimensions that are even numbers.
    if (this.visibility_) {
      this.canvas_.width = roundToEven(this.canvas_.clientWidth);
    } else {
      const outputVideoContainer =
          document.getElementById('outputVideoContainer');
      const outputVideo = outputVideoContainer.firstElementChild;
      if (outputVideo) {
        this.canvas_.width = roundToEven(outputVideo.clientWidth);
      }
    }
    this.canvas_.height = roundToEven(this.canvas_.width / CANVAS_ASPECT_RATIO);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.canvas_.width, this.canvas_.height);

    const linesShown = 20;
    const millisecondsPerLine = 1000;
    const linesIncludingExtraBlank = this.text_.length + linesShown;
    const totalAnimationLength = linesIncludingExtraBlank * millisecondsPerLine;
    const currentFrame = now % totalAnimationLength;
    const firstLineIdx = Math.floor(
        linesIncludingExtraBlank * (currentFrame / totalAnimationLength) -
        linesShown);
    const lineFraction = (now % millisecondsPerLine) / millisecondsPerLine;

    const border = 20;
    const fontSize = (this.canvas_.height - 2 * border) / (linesShown + 1);
    ctx.font = `${fontSize}px sansserif`;

    const textWidth = this.canvas_.width - 2 * border;

    // first line
    if (firstLineIdx >= 0) {
      const fade = Math.floor(256 * lineFraction);
      ctx.fillStyle = `rgb(${fade},${fade},${fade})`;
      const position = (2 - lineFraction) * fontSize;
      ctx.fillText(this.text_[firstLineIdx], border, position, textWidth);
    }

    // middle lines
    for (let line = 2; line <= linesShown - 1; line++) {
      const lineIdx = firstLineIdx + line - 1;
      if (lineIdx >= 0 && lineIdx < this.text_.length) {
        ctx.fillStyle = 'black';
        const position = (line + 1 - lineFraction) * fontSize;
        ctx.fillText(this.text_[lineIdx], border, position, textWidth);
      }
    }

    // last line
    const lastLineIdx = firstLineIdx + linesShown - 1;
    if (lastLineIdx >= 0 && lastLineIdx < this.text_.length) {
      const fade = Math.floor(256 * (1 - lineFraction));
      ctx.fillStyle = `rgb(${fade},${fade},${fade})`;
      const position = (linesShown + 1 - lineFraction) * fontSize;
      ctx.fillText(this.text_[lastLineIdx], border, position, textWidth);
    }

    this.captureTrack_.requestFrame();
  }
  /** @override */
  async getMediaStream() {
    if (this.stream_) return this.stream_;

    console.log('[CanvasSource] Initializing 2D context for source animation.');
    this.canvas_ =
      /** @type {!HTMLCanvasElement} */ (document.createElement('canvas'));
    this.canvas_.classList.add('video', 'sourceVideo');
    // Generally video frames do not have an alpha channel. Even if the browser
    // supports it, there may be a performance cost, so we disable alpha.
    this.ctx_ = /** @type {?CanvasRenderingContext2D} */ (
      this.canvas_.getContext('2d', {alpha: false}));
    if (!this.ctx_) {
      throw new Error('Unable to create CanvasRenderingContext2D');
    }
    this.updateCanvasVisibility();
    this.stream_ = this.canvas_.captureStream(0);
    this.captureTrack_ = /** @type {!CanvasCaptureMediaStreamTrack} */ (
      this.stream_.getTracks()[0]);
    this.requestAnimationFrame();
    console.log(
        '[CanvasSource] Initialized canvas, context, and capture stream.',
        `${this.debugPath_}.canvas_ =`, this.canvas_,
        `${this.debugPath_}.ctx_ =`, this.ctx_, `${this.debugPath_}.stream_ =`,
        this.stream_, `${this.debugPath_}.captureTrack_ =`, this.captureTrack_);

    return this.stream_;
  }
  /** @override */
  destroy() {
    console.log('[CanvasSource] Stopping source animation');
    if (this.requestAnimationFrameHandle_) {
      cancelAnimationFrame(this.requestAnimationFrameHandle_);
    }
    if (this.canvas_) {
      if (this.canvas_.parentNode) {
        this.canvas_.parentNode.removeChild(this.canvas_);
      }
    }
  }
}
