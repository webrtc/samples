/*
 * Copyright (c) 2009 The Chromium Authors. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *    * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *    * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var gl = null;
var g_width = 0;
var g_height = 0;
var g_bumpTexture = null;
var g_envTexture = null;
var g_programObject = null;
var g_vbo = null;
var g_elementVbo = null;
var g_normalsOffset = 0;
var g_tangentsOffset = 0;
var g_binormalsOffset = 0;
var g_texCoordsOffset = 0;
var g_numElements = 0;

// Uniform variables
var g_worldLoc = 0;
var g_worldInverseTransposeLoc = 0;
var g_worldViewProjLoc = 0;
var g_viewInverseLoc = 0;
var g_normalSamplerLoc = 0;
var g_envSamplerLoc = 0;

var g_pendingTextureLoads = 0;

// The "model" matrix is the "world" matrix in Standard Annotations
// and Semantics
var model = new Matrix4x4();
var view = new Matrix4x4();
var projection = new Matrix4x4();

var controller = null;

function main() {
    var c = document.querySelector("canvas");

    //c = WebGLDebugUtils.makeLostContextSimulatingCanvas(c);
    // tell the simulator when to lose context.
    //c.loseContextInNCalls(15);

    c.addEventListener('webglcontextlost', handleContextLost, false);
    c.addEventListener('webglcontextrestored', handleContextRestored, false);

	var ratio = window.devicePixelRatio ? window.devicePixelRatio : 1;
    // original is 480 x 270
	c.width = 240 * ratio;
	c.height = 180 * ratio;
    gl = WebGLUtils.setupWebGL(c);
    if (!gl)
        return;
    g_width = c.width;
    g_height = c.height;
    controller = new CameraController(c);
    // Try the following (and uncomment the "pointer-events: none;" in
    // the index.html) to try the more precise hit detection
    //  controller = new CameraController(document.getElementById("body"), c, gl);
    controller.onchange = function(xRot, yRot) {
        draw();
    };
    init();
}

function log(msg) {
    if (window.console && window.console.log) {
        console.log(msg);
    }
}

function handleContextLost(e) {
    log("handle context lost");
    e.preventDefault();
    clearLoadingImages();
}

function handleContextRestored() {
    log("handle context restored");
    init();
}


function output(str) {
    document.body.appendChild(document.createTextNode(str));
    document.body.appendChild(document.createElement("br"));
}

function checkGLError() {
    var error = gl.getError();
    if (error != gl.NO_ERROR && error != gl.CONTEXT_LOST_WEBGL) {
        var str = "GL Error: " + error;
        output(str);
        throw str;
    }
}

function init() {
    gl.enable(gl.DEPTH_TEST);
    // Can use this to make the background opaque
    // gl.clearColor(0.3, 0.2, 0.2, 1.);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    initTeapot();
    initShaders();
    g_bumpTexture = loadTexture("/samples/src/js/third_party/webgl_teapot/images/bump.jpg");
    g_envTexture = loadCubeMap("/samples/src/js/third_party/webgl_teapot/images/skybox", "jpg");
    draw();
}

function initTeapot() {
    g_vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo);
    gl.bufferData(gl.ARRAY_BUFFER,
                  teapotPositions.byteLength +
                  teapotNormals.byteLength +
                  teapotTangents.byteLength +
                  teapotBinormals.byteLength +
                  teapotTexCoords.byteLength,
                  gl.STATIC_DRAW);
    g_normalsOffset = teapotPositions.byteLength;
    g_tangentsOffset = g_normalsOffset + teapotNormals.byteLength;
    g_binormalsOffset = g_tangentsOffset + teapotTangents.byteLength;
    g_texCoordsOffset = g_binormalsOffset + teapotBinormals.byteLength;
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, teapotPositions);
    gl.bufferSubData(gl.ARRAY_BUFFER, g_normalsOffset, teapotNormals);
    gl.bufferSubData(gl.ARRAY_BUFFER, g_tangentsOffset, teapotTangents);
    gl.bufferSubData(gl.ARRAY_BUFFER, g_binormalsOffset, teapotBinormals);
    gl.bufferSubData(gl.ARRAY_BUFFER, g_texCoordsOffset, teapotTexCoords);

    g_elementVbo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_elementVbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, teapotIndices, gl.STATIC_DRAW);
    g_numElements = teapotIndices.length;
}

var bumpReflectVertexSource = [
    "attribute vec3 g_Position;",
    "attribute vec3 g_TexCoord0;",
    "attribute vec3 g_Tangent;",
    "attribute vec3 g_Binormal;",
    "attribute vec3 g_Normal;",
    "",
    "uniform mat4 world;",
    "uniform mat4 worldInverseTranspose;",
    "uniform mat4 worldViewProj;",
    "uniform mat4 viewInverse;",
    "",
    "varying vec2 texCoord;",
    "varying vec3 worldEyeVec;",
    "varying vec3 worldNormal;",
    "varying vec3 worldTangent;",
    "varying vec3 worldBinorm;",
    "",
    "void main() {",
    "  gl_Position = worldViewProj * vec4(g_Position.xyz, 1.);",
    "  texCoord.xy = g_TexCoord0.xy;",
    "  worldNormal = (worldInverseTranspose * vec4(g_Normal, 1.)).xyz;",
    "  worldTangent = (worldInverseTranspose * vec4(g_Tangent, 1.)).xyz;",
    "  worldBinorm = (worldInverseTranspose * vec4(g_Binormal, 1.)).xyz;",
    "  vec3 worldPos = (world * vec4(g_Position, 1.)).xyz;",
    "  worldEyeVec = normalize(worldPos - viewInverse[3].xyz);",
    "}"
    ].join("\n");

var bumpReflectFragmentSource = [
    "precision mediump float;\n",
    "const float bumpHeight = 0.2;",
    "",
    "uniform sampler2D normalSampler;",
    "uniform samplerCube envSampler;",
    "",
    "varying vec2 texCoord;",
    "varying vec3 worldEyeVec;",
    "varying vec3 worldNormal;",
    "varying vec3 worldTangent;",
    "varying vec3 worldBinorm;",
    "",
    "void main() {",
    "  vec2 bump = (texture2D(normalSampler, texCoord.xy).xy * 2.0 - 1.0) * bumpHeight;",
    "  vec3 normal = normalize(worldNormal);",
    "  vec3 tangent = normalize(worldTangent);",
    "  vec3 binormal = normalize(worldBinorm);",
    "  vec3 nb = normal + bump.x * tangent + bump.y * binormal;",
    "  nb = normalize(nb);",
    "  vec3 worldEye = normalize(worldEyeVec);",
    "  vec3 lookup = reflect(worldEye, nb);",
    "  vec4 color = textureCube(envSampler, lookup);",
    "  gl_FragColor = color;",
    "}"
    ].join("\n");

function loadShader(type, shaderSrc) {
    var shader = gl.createShader(type);
    // Load the shader source
    gl.shaderSource(shader, shaderSrc);
    // Compile the shader
    gl.compileShader(shader);
    // Check the compile status
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) &&
        !gl.isContextLost()) {
        var infoLog = gl.getShaderInfoLog(shader);
        output("Error compiling shader:\n" + infoLog);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaders() {
    var vertexShader = loadShader(gl.VERTEX_SHADER, bumpReflectVertexSource);
    var fragmentShader = loadShader(gl.FRAGMENT_SHADER, bumpReflectFragmentSource);
    // Create the program object
    var programObject = gl.createProgram();
    gl.attachShader(programObject, vertexShader);
    gl.attachShader(programObject, fragmentShader);
    // Bind attributes
    gl.bindAttribLocation(programObject, 0, "g_Position");
    gl.bindAttribLocation(programObject, 1, "g_TexCoord0");
    gl.bindAttribLocation(programObject, 2, "g_Tangent");
    gl.bindAttribLocation(programObject, 3, "g_Binormal");
    gl.bindAttribLocation(programObject, 4, "g_Normal");
    // Link the program
    gl.linkProgram(programObject);
    // Check the link status
    var linked = gl.getProgramParameter(programObject, gl.LINK_STATUS);
    if (!linked && !gl.isContextLost()) {
        var infoLog = gl.getProgramInfoLog(programObject);
        output("Error linking program:\n" + infoLog);
        gl.deleteProgram(programObject);
        return;
    }
    g_programObject = programObject;
    // Look up uniform locations
    g_worldLoc = gl.getUniformLocation(g_programObject, "world");
    g_worldInverseTransposeLoc = gl.getUniformLocation(g_programObject, "worldInverseTranspose");
    g_worldViewProjLoc = gl.getUniformLocation(g_programObject, "worldViewProj");
    g_viewInverseLoc = gl.getUniformLocation(g_programObject, "viewInverse");
    g_normalSamplerLoc = gl.getUniformLocation(g_programObject, "normalSampler");
    g_envSamplerLoc = gl.getUniformLocation(g_programObject, "envSampler");
    checkGLError();
}

function draw() {
    // Note: the viewport is automatically set up to cover the entire Canvas.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    checkGLError();

    // For now, don't render if we have incomplete textures, just to
    // avoid accidentally incurring OpenGL errors -- although we should
    // be fully able to load textures in in the background
    if (g_pendingTextureLoads > 0) {
        return;
    }

    // Set up the model, view and projection matrices
    projection.loadIdentity();
    projection.perspective(45, g_width / g_height, 10, 500);
    view.loadIdentity();
    view.translate(0, -10, -100.0);

    // Add in camera controller's rotation
    model.loadIdentity();
    model.rotate(controller.xRot, 1, 0, 0);
    model.rotate(controller.yRot, 0, 1, 0);

    // Correct for initial placement and orientation of model
    model.translate(0, -10, 0);
    model.rotate(90, 1, 0, 0);

    gl.useProgram(g_programObject);

    // Compute necessary matrices
    var mvp = new Matrix4x4();
    mvp.multiply(model);
    mvp.multiply(view);
    mvp.multiply(projection);
    var worldInverseTranspose = model.inverse();
    worldInverseTranspose.transpose();
    var viewInverse = view.inverse();

    // Set up uniforms
    gl.uniformMatrix4fv(g_worldLoc, gl.FALSE, new Float32Array(model.elements));
    gl.uniformMatrix4fv(g_worldInverseTransposeLoc, gl.FALSE, new Float32Array(worldInverseTranspose.elements));
    gl.uniformMatrix4fv(g_worldViewProjLoc, gl.FALSE, new Float32Array(mvp.elements));
    gl.uniformMatrix4fv(g_viewInverseLoc, gl.FALSE, new Float32Array(viewInverse.elements));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_bumpTexture);
    gl.uniform1i(g_normalSamplerLoc, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, g_envTexture);
    gl.uniform1i(g_envSamplerLoc, 1);
    checkGLError();

    // Bind and set up vertex streams
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, g_texCoordsOffset);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, g_tangentsOffset);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, g_binormalsOffset);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 0, g_normalsOffset);
    gl.enableVertexAttribArray(4);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_elementVbo);
    checkGLError();
    gl.drawElements(gl.TRIANGLES, g_numElements, gl.UNSIGNED_SHORT, 0);
}

// Array of images curently loading
var g_loadingImages = [];

// Clears all the images currently loading.
// This is used to handle context lost events.
function clearLoadingImages() {
    for (var ii = 0; ii < g_loadingImages.length; ++ii) {
        g_loadingImages[ii].onload = undefined;
    }
    g_loadingImages = [];
}

function loadTexture(src) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    ++g_pendingTextureLoads;
    var image = new Image();
    g_loadingImages.push(image);
    image.onload = function() {
        g_loadingImages.splice(g_loadingImages.indexOf(image), 1);
        --g_pendingTextureLoads;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        checkGLError();
        draw();
    };
    image.src = src;
    return texture;
}

function loadCubeMap(base, suffix) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    checkGLError();
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    checkGLError();
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    checkGLError();
    // FIXME: TEXTURE_WRAP_R doesn't exist in OpenGL ES?!
    //  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    //  checkGLError();
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    checkGLError();
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    checkGLError();
    var faces = [["posx", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
                 ["negx", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
                 ["posy", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
                 ["negy", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
                 ["posz", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
                 ["negz", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];
    for (var i = 0; i < faces.length; i++) {
        var url = base + "-" + faces[i][0] + "." + suffix;
        var face = faces[i][1];
        ++g_pendingTextureLoads;
        var image = new Image();
        g_loadingImages.push(image);
        // Javascript has function, not block, scope.
        // See "JavaScript: The Good Parts", Chapter 4, "Functions",
        // section "Scope".
        image.onload = function(texture, face, image, url) {
            return function() {
                g_loadingImages.splice(g_loadingImages.indexOf(image), 1);
                --g_pendingTextureLoads;
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(
                   face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                checkGLError();
                draw();
            }
        }(texture, face, image, url);
        console.log(url);
        image.src = url;
    }
    return texture;
}
