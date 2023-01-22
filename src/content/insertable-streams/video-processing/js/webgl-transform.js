/*
 *  Copyright (c) 2020 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

/**
 * Applies a warp effect using WebGL.
 * @implements {FrameTransform} in pipeline.js
 */
class WebGLTransform { // eslint-disable-line no-unused-vars
  constructor() {
    // All fields are initialized in init()
    /** @private {?OffscreenCanvas} canvas used to create the WebGL context */
    this.canvas_ = null;
    /** @private {?WebGLRenderingContext} */
    this.gl_ = null;
    /** @private {?WebGLUniformLocation} location of inSampler */
    this.sampler_ = null;
    /** @private {?WebGLProgram} */
    this.program_ = null;
    /** @private {?WebGLTexture} input texture */
    this.texture_ = null;
    /** @private {string} */
    this.debugPath_ = 'debug.pipeline.frameTransform_';
  }
  /** @override */
  async init() {
    console.log('[WebGLTransform] Initializing WebGL.');
    this.canvas_ = new OffscreenCanvas(1, 1);
    const gl = /** @type {?WebGLRenderingContext} */ (
      this.canvas_.getContext('webgl'));
    if (!gl) {
      alert(
          'Failed to create WebGL context. Check that WebGL is supported ' +
          'by your browser and hardware.');
      return;
    }
    this.gl_ = gl;
    const vertexShader = this.loadShader_(gl.VERTEX_SHADER, `
      precision mediump float;
      attribute vec3 g_Position;
      attribute vec2 g_TexCoord;
      varying vec2 texCoord;
      void main() {
        gl_Position = vec4(g_Position, 1.0);
        texCoord = g_TexCoord;
      }`);
    const fragmentShader = this.loadShader_(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 texCoord;
      uniform sampler2D inSampler;
      void main(void) {
        float boundary = distance(texCoord, vec2(0.5)) - 0.2;
        if (boundary < 0.0) {
          gl_FragColor = texture2D(inSampler, texCoord);
        } else {
          // Rotate the position
          float angle = 2.0 * boundary;
          vec2 rotation = vec2(sin(angle), cos(angle));
          vec2 fromCenter = texCoord - vec2(0.5);
          vec2 rotatedPosition = vec2(
            fromCenter.x * rotation.y + fromCenter.y * rotation.x,
            fromCenter.y * rotation.y - fromCenter.x * rotation.x) + vec2(0.5);
          gl_FragColor = texture2D(inSampler, rotatedPosition);
        }
      }`);
    if (!vertexShader || !fragmentShader) return;
    // Create the program object
    const programObject = gl.createProgram();
    gl.attachShader(programObject, vertexShader);
    gl.attachShader(programObject, fragmentShader);
    // Link the program
    gl.linkProgram(programObject);
    // Check the link status
    const linked = gl.getProgramParameter(programObject, gl.LINK_STATUS);
    if (!linked) {
      const infoLog = gl.getProgramInfoLog(programObject);
      gl.deleteProgram(programObject);
      throw new Error(`Error linking program:\n${infoLog}`);
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    this.sampler_ = gl.getUniformLocation(programObject, 'inSampler');
    this.program_ = programObject;
    // Bind attributes
    const vertices = [1.0, -1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
    // Pass-through.
    const txtcoords = [1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0];
    // Mirror horizonally.
    // const txtcoords = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
    this.attributeSetFloats_('g_Position', 2, vertices);
    this.attributeSetFloats_('g_TexCoord', 2, txtcoords);
    // Initialize input texture
    this.texture_ = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture_);
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log(
        '[WebGLTransform] WebGL initialized.', `${this.debugPath_}.canvas_ =`,
        this.canvas_, `${this.debugPath_}.gl_ =`, this.gl_);
  }

  /**
   * Creates and compiles a WebGLShader from the provided source code.
   * @param {number} type either VERTEX_SHADER or FRAGMENT_SHADER
   * @param {string} shaderSrc
   * @return {!WebGLShader}
   * @private
   */
  loadShader_(type, shaderSrc) {
    const gl = this.gl_;
    const shader = gl.createShader(type);
    // Load the shader source
    gl.shaderSource(shader, shaderSrc);
    // Compile the shader
    gl.compileShader(shader);
    // Check the compile status
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const infoLog = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Error compiling shader:\n${infoLog}`);
    }
    return shader;
  }

  /**
   * Sets a floating point shader attribute to the values in arr.
   * @param {string} attrName the name of the shader attribute to set
   * @param {number} vsize the number of components of the shader attribute's
   *   type
   * @param {!Array<number>} arr the values to set
   * @private
   */
  attributeSetFloats_(attrName, vsize, arr) {
    const gl = this.gl_;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(this.program_, attrName);
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, vsize, gl.FLOAT, false, 0, 0);
  }

  /** @override */
  async transform(frame, controller) {
    const gl = this.gl_;
    if (!gl || !this.canvas_) {
      frame.close();
      return;
    }
    const width = frame.displayWidth;
    const height = frame.displayHeight;
    if (this.canvas_.width !== width || this.canvas_.height !== height) {
      this.canvas_.width = width;
      this.canvas_.height = height;
      gl.viewport(0, 0, width, height);
    }
    const timestamp = frame.timestamp;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture_);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
    frame.close();
    gl.useProgram(this.program_);
    gl.uniform1i(this.sampler_, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindTexture(gl.TEXTURE_2D, null);
    // alpha: 'discard' is needed in order to send frames to a PeerConnection.
    controller.enqueue(new VideoFrame(this.canvas_, {timestamp, alpha: 'discard'}));
  }

  /** @override */
  destroy() {
    if (this.gl_) {
      console.log('[WebGLTransform] Forcing WebGL context to be lost.');
      /** @type {!WEBGL_lose_context} */ (
        this.gl_.getExtension('WEBGL_lose_context'))
          .loseContext();
    }
  }
}
