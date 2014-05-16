// This file contains the data & functions necessary to achieve stereoscopic
// rendering of remote video.

// Vertex & fragment shaders for sampling a texture consisting of two
// side-by-side video frames [A|B], one half at a time.  |u_side| is 0 for the
// left half and 1 for the right half.
var SIDE_BY_SIDE_VERTEX_SHADER = [
    'attribute vec2 a_texCoord;',
    'uniform float u_side;',
    'varying vec2 v_texCoord;',
    'void main() {',
    '  v_texCoord = vec2((a_texCoord.x + u_side) * 0.5, 1.0 - a_texCoord.y);',
    '  gl_Position = vec4(2.0 * a_texCoord - 1.0, 0.0, 1.0);',
    '}'].join('\n');
var SIDE_BY_SIDE_FRAGMENT_SHADER = [
    'precision mediump float;',
    'uniform sampler2D s_texture;',
    'varying vec2 v_texCoord;',
    'void main() {',
    '  gl_FragColor = texture2D(s_texture, v_texCoord);',
    '}'].join('\n');

// Setup for renderStereoscopicFrame() to do its thing.
function setupStereoscopic(video, canvas) {
  canvas.style.display = 'block';
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  video.style.display = 'none';
  var gl = canvas.getContext('webgl');
  var vrRenderer = new vr.StereoRenderer(gl,
      {alpha: false, depth: false, stencil: false});

  var vrVertexPosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vrVertexPosBuffer);
  var vertices = [  // Texture coordinates (U,V)
      0, 0,  // Top left.
      0, 1,  // Bottom left.
      1, 0,  // Top right.
      1, 1];  // Bottom right.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  glProgram = new vr.Program(gl, 'AppRTCGL',
      SIDE_BY_SIDE_VERTEX_SHADER,
      SIDE_BY_SIDE_FRAGMENT_SHADER,
      ['a_texCoord'], ['s_texture', 'u_side']);
  glProgram.beginLinking();
  glProgram.endLinking();
  glProgram.use();
  var a_texCoord = glProgram.attributes['a_texCoord'];
  gl.enableVertexAttribArray(a_texCoord);
  gl.bindBuffer(gl.ARRAY_BUFFER, vrVertexPosBuffer);
  gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);
  var s_texture = glProgram.uniforms['s_texture'];
  gl.uniform1i(s_texture, 0);
  glTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, glTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  var stereoscopicParams = { 'gl': gl,
                             'glProgram': glProgram,
                             'glTexture': glTexture,
                             'vrRenderer': vrRenderer,
                             'vrVertexPosBuffer': vrVertexPosBuffer,
                             'video': video };
  renderStereoscopicFrame(stereoscopicParams);
}

// Copy video frame into canvas after applying lens corrections.
function renderStereoscopicFrame(stereoscopicParams) {
  var gl = stereoscopicParams['gl'];
  var vrRenderer = stereoscopicParams['vrRenderer'];
  var vrState = new vr.State();
  vrRenderer.render(vrState, function(eye) {
        stereoscopicParams['glProgram'].use();
        gl.bindTexture(gl.TEXTURE_2D, stereoscopicParams['glTexture']);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
            stereoscopicParams['video']);
        gl.uniform1f(glProgram.uniforms['u_side'],
            eye === vrRenderer.getParams().getEyes()[0] ? 0 : 1);
        var a_texCoord = glProgram.attributes['a_texCoord'];
        gl.bindBuffer(gl.ARRAY_BUFFER, stereoscopicParams['vrVertexPosBuffer']);
        gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (eye == vrRenderer.getParams().getEyes()[1])
          requestAnimationFrame(function() {
                renderStereoscopicFrame(stereoscopicParams);
              });
      });
}
