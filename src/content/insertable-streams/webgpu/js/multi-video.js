
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

class WebGPUTransform {
    constructor() {
        this.canvas_ = null;
        this.context_ = null;
        this.device_ = null;
        this.renderPipeline_ = null;
        this.videoTexture_ = null;
        this.verticesBuffer_ = null;
    }

    async init() {
        console.log('[WebGPUTransform] Initializing WebGPU.');

        if (!this.canvas_) {
            this.canvas_ = document.createElement('canvas');
            document.getElementById('outputVideo').append(this.canvas_);
            this.canvas_.width = 5000;
            this.canvas_.height = 2500;
        }

        const canvas = this.canvas_;
        const context = canvas.getContext('webgpu');
        this.context_ = context;
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        this.device_ = device;
        if (this.device_ === null) return;
        const swapChainFormat = 'bgra8unorm';

        // prettier-ignore
        const rectVerts = new Float32Array([
            1.0, 1.0, 0.0, 1.0, 0.0,
            1.0, -1.0, 0.0, 1.0, 1.0,
            -1.0, -1.0, 0.0, 0.0, 1.0,
            1.0, 1.0, 0.0, 1.0, 0.0,
            -1.0, -1.0, 0.0, 0.0, 1.0,
            -1.0, 1.0, 0.0, 0.0, 0.0,
        ]);
        //Creates a GPU buffer.
        const verticesBuffer = device.createBuffer({
            size: rectVerts.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        // Copies rectVerts to verticesBuffer
        new Float32Array(verticesBuffer.getMappedRange()).set(rectVerts);
        verticesBuffer.unmap();
        this.verticesBuffer_ = verticesBuffer;

        this.context_.configure({
            device,
            format: swapChainFormat
        })

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
            size: {
                width: 480 * 2,
                height: 270 * 2,
                depthOrArrayLayers: 1,
            },
            arrayLayerCount: 1,
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: '2d',
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

    }

    async transform(frame, frame2) {
        const device = this.device_;
        if (device == null) {
            console.log("Device is null");
            if (frame) frame.close();
            if (frame2) frame2.close();
            return;
        }
        // const canvas = this.canvas_;
        const sampler = device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            addressModeW: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
        });
        const videoTexture = this.videoTexture_;
        let videoFrame, videoFrame2;
        if (frame) {
            videoFrame = await createImageBitmap(frame, { resizeWidth: 480, resizeHeight: 270 });
            device.queue.copyExternalImageToTexture(
                { source: videoFrame, origin: { x: 0, y: 0 } },
                { texture: videoTexture, origin: { x: 0, y: 270 } },
                {
                    // the width of the image being copied
                    width: videoFrame.width,
                    height: videoFrame.height,
                }
            );
            videoFrame.close();
            frame.close();
        }
        if (frame2) {
            videoFrame2 = await createImageBitmap(frame2, { resizeWidth: 480, resizeHeight: 270 });
            device.queue.copyExternalImageToTexture(
                { source: videoFrame2, origin: { x: 0, y: 0 } },
                { texture: videoTexture, origin: { x: 480, y: 0 } },
                {
                    width: videoFrame2.width,
                    height: videoFrame2.height,
                }
            );
            videoFrame2.close();
            frame2.close();
        }
        // const renderPipeline = this.renderPipeline_;
        const uniformBindGroup = device.createBindGroup({
            layout: this.renderPipeline_.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: sampler,
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
                    loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    storeOp: 'store',
                },
            ],
        };
        // const verticesBuffer = this.verticesBuffer_;
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.renderPipeline_);
        passEncoder.setVertexBuffer(0, this.verticesBuffer_);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.draw(6, 1, 0, 0);
        passEncoder.endPass();
        device.queue.submit([commandEncoder.finish()]);
    }

    /** @override */
    async destroy() {
        if (this.device_) {
            // Not yet in canary
            // await this.device_.destroy();
            this.verticesBuffer_.destroy();
            this.device_ = null;
            if (this.canvas_.parentNode) {
                this.canvas_.parentNode.removeChild(this.canvas_);
            }
            console.log('[WebGPUTransform] WebGPU context is lost.',);

        }
    }
}