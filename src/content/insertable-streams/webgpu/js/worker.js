'use strict';

let device;
let context;
let verticesBuffer;
let renderPipeline;
let videoTexture;

const wgslShadersWorkers = {
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
    output.fragUV = vec2<f32>(-0.0,-0.0) + input.uv;
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

onmessage = async (event) => {
    const { operation } = event.data;
    if (operation == 'init') {
        const { canvas } = event.data;
        context = canvas.getContext('webgpu');
        const adapter = await navigator.gpu.requestAdapter();
        device = await adapter.requestDevice();
        if (device == null) return;
        const swapChainFormat = 'bgra8unorm';

        // prettier-ignore
        const rectVerts = new Float32Array([
            1.0, 1.0, 0.0, 1.0, 0.0,
            -1.0, -1.0, 0.0, 0.0, 1.0,
            -1.0, 1.0, 0.0, 0.0, 0.0,
            1.0, 1.0, 0.0, 1.0, 0.0,
            1.0, -1.0, 0.0, 1.0, 1.0,
            -1.0, -1.0, 0.0, 0.0, 1.0,
        ]);

        //Creates a GPU buffer.
        verticesBuffer = device.createBuffer({
            size: rectVerts.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });

        // Copies rectVerts to verticesBuffer
        new Float32Array(verticesBuffer.getMappedRange()).set(rectVerts);
        verticesBuffer.unmap();
        context.configure({
            device,
            format: swapChainFormat
        })

        renderPipeline = device.createRenderPipeline({
            vertex: {
                module: device.createShaderModule({
                    code: wgslShadersWorkers.vertex,
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
                    code: wgslShadersWorkers.fragment,
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

        videoTexture = device.createTexture({
            size: {
                width: 960,
                height: 540,
                depthOrArrayLayers: 1,
            }, arrayLayerCount: 1,
            mipLevelCount: 1,
            sampleCount: 1,
            dimension: '2d',
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

    }
    else if (operation == 'transform') {
        const { frame, number } = event.data;
        if (device == null) {
            frame.close();
            return;
        }
        const sampler = device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            addressModeW: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
        });
        const videoFrame = await createImageBitmap(frame, { resizeWidth: 960, resizeHeight: 540 });
        device.queue.copyExternalImageToTexture(
            { source: videoFrame },
            {
                texture: videoTexture,
            },
            [960, 540]
        );

        frame.close();
        videoFrame.close();

        const uniformBindGroup = device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
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
        const textureView = context.getCurrentTexture().createView();

        const renderPassDescriptor = {
            colorAttachments: [
                {
                    view: textureView,
                    loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    storeOp: 'store',
                },
            ],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.draw(6, 1, 0, 0);
        passEncoder.endPass();
        device.queue.submit([commandEncoder.finish()]);
    }
    else if (operation == 'destroy') {
        // Not yet in canary
        // await this.device_.destroy();
        if(verticesBuffer) verticesBuffer.destroy();
        device = null;
    }
};