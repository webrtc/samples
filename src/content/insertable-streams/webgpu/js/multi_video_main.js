
'use strict';

const wgslShaders = {
  vertex: `
struct VertexInput {
  [[location(0)]] position : vec3<f32>;
  [[location(1)]] uv : vec2<f32>;
};

struct VertexOutput {
  [[builtin(position)]] Position : vec4<f32>;
  [[location(0)]] fragUV : vec2<f32>;
};

[[stage(vertex)]]
fn main(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;
    output.Position = vec4<f32>(input.position, 1.0);
    output.fragUV = vec2<f32>(-0.5,-0.0) + input.uv;
    return output;
}
`,

  fragment: `
[[binding(0), group(0)]] var mySampler: sampler;
[[binding(1), group(0)]] var myTexture: texture_2d<f32>;

[[stage(fragment)]]
fn main([[location(0)]] fragUV : vec2<f32>) -> [[location(0)]] vec4<f32> {
  return textureSample(myTexture, mySampler, fragUV);
}
`,
};

class WebGPUTransform { // eslint-disable-line no-unused-vars
  constructor() {
    this.canvas_ = null;
    this.context_ = null;
    this.device_ = null;
    this.renderPipeline_ = null;
    this.sampler_ = null;
    this.videoTexture_ = null;
    this.vertexBuffer_ = null;
  }

  async init(inputCanvas) {
    console.log('[WebGPUTransform] Initializing WebGPU.');
    this.canvas_ = inputCanvas;
    let errorElement;
    if (!this.canvas_) {
      this.canvas_ = document.createElement('canvas');
      document.getElementById('outputVideo').append(this.canvas_);
      this.canvas_.width = 960;
      this.canvas_.height = 540;
      errorElement = document.getElementById('errorMsg');
    }

    const canvas = this.canvas_;
    const context = canvas.getContext('webgpu');
    if (!context) {
      const errorMessage = 'Your browser does not support the WebGPU API.' +
                ' Please see the note at the bottom of the page.';
      if (errorElement) errorElement.innerText = errorMessage;
      return errorMessage;
    }
    this.context_ = context;
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    this.device_ = device;
    if (!this.device_) {
      console.log('[WebGPUTransform] requestDevice failed.');
      return;
    }
    const swapChainFormat = 'bgra8unorm';

    const rectVerts = new Float32Array([
      1.0, 1.0, 0.0, 1.0, 0.0,
      1.0, -1.0, 0.0, 1.0, 1.0,
      -1.0, -1.0, 0.0, 0.0, 1.0,
      1.0, 1.0, 0.0, 1.0, 0.0,
      -1.0, -1.0, 0.0, 0.0, 1.0,
      -1.0, 1.0, 0.0, 0.0, 0.0,
    ]);
    // Creates a GPU buffer.
    const vertexBuffer = device.createBuffer({
      size: rectVerts.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    // Copies rectVerts to vertexBuffer
    new Float32Array(vertexBuffer.getMappedRange()).set(rectVerts);
    vertexBuffer.unmap();
    this.vertexBuffer_ = vertexBuffer;

    context.configure({
      device,
      format: swapChainFormat
    });

    this.renderPipeline_ = device.createRenderPipeline({
      vertex: {
        module: device.createShaderModule({
          code: wgslShaders.vertex,
        }),
        entryPoint: 'main',
        buffers: [
          {
            arrayStride: 20,
            attributes: [
              {
                // position
                shaderLocation: 0,
                offset: 0,
                format: 'float32x3',
              },
              {
                // uv
                shaderLocation: 1,
                offset: 12,
                format: 'float32x2',
              },
            ],
          },
        ],
      },
      fragment: {
        module: device.createShaderModule({
          code: wgslShaders.fragment,
        }),
        entryPoint: 'main',
        targets: [
          {
            format: swapChainFormat,
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.videoTexture_ = device.createTexture({
      size: [480 * 2, 270 * 2],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.sampler_ = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      addressModeW: 'repeat',
      magFilter: 'linear',
      minFilter: 'linear',
    });
  }

  async copyOnTexture(device, videoTexture, frame, xcorr, ycorr) {
    if (!frame) {
      return;
    }
    // Using GPUExternalTexture(when it's implemented for Breakout Box frames) will
    // avoid making extra copies through ImageBitmap.
    const videoBitmap = await createImageBitmap(frame, {resizeWidth: 480, resizeHeight: 270});
    device.queue.copyExternalImageToTexture(
        {source: videoBitmap, origin: {x: 0, y: 0}},
        {texture: videoTexture, origin: {x: xcorr, y: ycorr}},
        {
          // the width of the image being copied
          width: videoBitmap.width,
          height: videoBitmap.height,
        }
    );
    videoBitmap.close();
    frame.close();
  }

  async renderOnScreen(videoSource, gumSource) {
    const device = this.device_;
    const videoTexture = this.videoTexture_;
    if (!device) {
      console.log('[WebGPUTransform] device is undefined or null.');
      return false;
    }

    const videoPromise = videoSource.read().then(({value}) => {
      this.copyOnTexture(device, videoTexture, value, 0, 270);
    });
    const gumPromise = gumSource.read().then(({value}) => {
      this.copyOnTexture(device, videoTexture, value, 480, 0);
    });
    await Promise.all([videoPromise, gumPromise]);

    if (!this.device_) {
      console.log('Check if destroy has been called asynchronously.');
      return false;
    }

    const uniformBindGroup = device.createBindGroup({
      layout: this.renderPipeline_.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: this.sampler_,
        },
        {
          binding: 1,
          resource: videoTexture.createView(),
        },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = this.context_.getCurrentTexture().createView();

    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          loadValue: {r: 0.0, g: 0.0, b: 0.0, a: 1.0},
          storeOp: 'store',
        },
      ],
    };
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.renderPipeline_);
    passEncoder.setVertexBuffer(0, this.vertexBuffer_);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.endPass();
    device.queue.submit([commandEncoder.finish()]);
    return true;
  }


  async transform(videoStream, gumStream) {
    const videoSource = videoStream.getReader();
    const gumSource = gumStream.getReader();
    while (true) {
      const rendered = await this.renderOnScreen(videoSource, gumSource);
      if (!rendered) {
        break;
      }
    }
    videoSource.cancel();
    gumSource.cancel();
  }

  destroy() {
    if (this.device_) {
      // Currently being implemented.
      // await this.device_.destroy();
      this.device_ = null;
      this.vertexBuffer_.destroy();
      this.videoTexture_.destroy();
      if (this.canvas_.parentNode) {
        this.canvas_.parentNode.removeChild(this.canvas_);
      }
      console.log('[WebGPUTransform] Context destroyed.',);
    }
  }
}
