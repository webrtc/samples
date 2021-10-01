'use strict';

let device;
let context;
let vertexBuffer;
let renderPipeline;
let videoTexture;
let sampler;

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

async function renderOnScreen(videoFrame, gumFrame) {
    if (device === null || device === undefined) {
        console.log('[WebGPUWorker] device is undefined or null.')
        if (videoFrame) videoFrame.close();
        if (gumFrame) gumFrame.close();
        return;
    }
    let videoBitmap, gumBitmap;
    if (videoFrame) {
        videoBitmap = await createImageBitmap(videoFrame, { resizeWidth: 480, resizeHeight: 270 });
        device.queue.copyExternalImageToTexture(
            { source: videoBitmap, origin: { x: 0, y: 0 } },
            { texture: videoTexture, origin: { x: 0, y: 270 } },
            {
                // the width of the image being copied
                width: videoBitmap.width,
                height: videoBitmap.height,
            }
        );
        videoBitmap.close();
        videoFrame.close();
    }
    if (gumFrame) {
        gumBitmap = await createImageBitmap(gumFrame, { resizeWidth: 480, resizeHeight: 270 });
        device.queue.copyExternalImageToTexture(
            { source: gumBitmap, origin: { x: 0, y: 0 } },
            { texture: videoTexture, origin: { x: 480, y: 0 } },
            {
                width: gumBitmap.width,
                height: gumBitmap.height,
            }
        );
        gumBitmap.close();
        gumFrame.close();
    }
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
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.draw(6, 1, 0, 0);
    passEncoder.endPass();
    device.queue.submit([commandEncoder.finish()]);
}

onmessage = async (event) => {
    const { operation } = event.data;
    if (operation === 'init') {
        const { canvas } = event.data;
        context = canvas.getContext('webgpu');
        if (context === null || context === undefined) {
            const errorMessage = 'Your browser does not support the WebGPU API.' +
                ' Please see the note at the bottom of the page.';
            postMessage({ error: errorMessage });
            return;
        }
        const adapter = await navigator.gpu.requestAdapter();
        device = await adapter.requestDevice();
        if (device === null || device === undefined) {
            console.log('[WebGPUWorker] requestDevice failed.')
            return;
        }
        const swapChainFormat = 'bgra8unorm';

        const rectVerts = new Float32Array([
            1.0, 1.0, 0.0, 1.0, 0.0,
            -1.0, -1.0, 0.0, 0.0, 1.0,
            -1.0, 1.0, 0.0, 0.0, 0.0,
            1.0, 1.0, 0.0, 1.0, 0.0,
            1.0, -1.0, 0.0, 1.0, 1.0,
            -1.0, -1.0, 0.0, 0.0, 1.0,
        ]);

        // Creates a GPU buffer.
        vertexBuffer = device.createBuffer({
            size: rectVerts.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });

        // Copies rectVerts to vertexBuffer
        new Float32Array(vertexBuffer.getMappedRange()).set(rectVerts);
        vertexBuffer.unmap();
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

        sampler = device.createSampler({
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            addressModeW: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
        });

        postMessage({ result: 'Done' });
    }
    else if (operation === 'transform') {
        const { videoStream, gumStream } = event.data;
        const videoSource = videoStream.getReader();
        const gumSource = gumStream.getReader();
        if (videoSource === undefined || videoSource === null) {
            console.log('[WebGPUWorker] videoSource is undefined or null.')
            return;
        }
        if (gumSource === undefined || gumSource === null) {
            console.log('[WebGPUWorker] gumSource is undefined or null.')
            return;
        }

        while (true) {
            let { value: videoFrame } = await videoSource.read();
            let { value: gumFrame } = await gumSource.read();
            renderOnScreen(videoFrame, gumFrame);
        }
    }
    else if (operation === 'destroy') {
        // Not yet in canary
        // await device_.destroy();
        if (device) {
            vertexBuffer.destroy();
            device = null;
        }
        postMessage('Destroyed');
    }
};