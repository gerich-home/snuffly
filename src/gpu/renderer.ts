import { METABALL_VERTEX, METABALL_FRAGMENT, SPRING_VERTEX, SPRING_FRAGMENT } from './shaders';

export class MetaballRenderer {
  format: GPUTextureFormat;
  numParticles = 0;
  smoothingRadius = 0.06;
  threshold = 0.65;
  aspectRatio = 1;
  resX = 1;
  resY = 1;
  cameraCenterX = 0.5;
  cameraCenterY = 0.5;
  cameraZoom = 1;

  private device: GPUDevice;
  private uniformBuffer!: GPUBuffer;
  private uniformBufferSize = 40;
  pipeline!: GPURenderPipeline;
  bindGroup!: GPUBindGroup;

  private maxSprings = 2000;
  private springVertexBuffer!: GPUBuffer;
  private springPipeline!: GPURenderPipeline;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
  }

  async init() {
    this.uniformBuffer = this.device.createBuffer({
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.springVertexBuffer = this.device.createBuffer({
      size: this.maxSprings * 16,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const vertexModule = this.device.createShaderModule({ code: METABALL_VERTEX });
    const fragmentModule = this.device.createShaderModule({ code: METABALL_FRAGMENT });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: vertexModule, entryPoint: 'main' },
      fragment: {
        module: fragmentModule,
        entryPoint: 'main',
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.springPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.device.createShaderModule({ code: SPRING_VERTEX }),
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
        }],
      },
      fragment: {
        module: this.device.createShaderModule({ code: SPRING_FRAGMENT }),
        targets: [{ format: this.format }],
      },
      primitive: { topology: 'line-list' },
    });
  }

  private updateUniforms() {
    const buf = new ArrayBuffer(this.uniformBufferSize);
    const u32 = new Uint32Array(buf);
    const f32 = new Float32Array(buf);
    u32[0] = this.numParticles;
    f32[1] = this.smoothingRadius;
    f32[2] = this.threshold;
    f32[3] = this.aspectRatio;
    f32[4] = this.resX;
    f32[5] = this.resY;
    f32[6] = this.cameraCenterX;
    f32[7] = this.cameraCenterY;
    f32[8] = this.cameraZoom;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, buf);
  }

  createBindGroup(particleBuffer: GPUBuffer) {
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  setParams(params: Partial<{
    numParticles: number;
    smoothingRadius: number;
    threshold: number;
    aspectRatio: number;
    resX: number;
    resY: number;
    cameraCenterX: number;
    cameraCenterY: number;
    cameraZoom: number;
  }>) {
    if (params.numParticles !== undefined) this.numParticles = params.numParticles;
    if (params.smoothingRadius !== undefined) this.smoothingRadius = params.smoothingRadius;
    if (params.threshold !== undefined) this.threshold = params.threshold;
    if (params.aspectRatio !== undefined) this.aspectRatio = params.aspectRatio;
    if (params.resX !== undefined) this.resX = params.resX;
    if (params.resY !== undefined) this.resY = params.resY;
    if (params.cameraCenterX !== undefined) this.cameraCenterX = params.cameraCenterX;
    if (params.cameraCenterY !== undefined) this.cameraCenterY = params.cameraCenterY;
    if (params.cameraZoom !== undefined) this.cameraZoom = params.cameraZoom;
    this.updateUniforms();
  }

  uploadSpringVertices(data: Float32Array) {
    this.device.queue.writeBuffer(this.springVertexBuffer, 0, data);
  }

  render(context: GPUCanvasContext, numSpringsToDraw: number = 0) {
    if (!this.bindGroup) return;

    const texture = context.getCurrentTexture();
    const view = texture.createView();

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view,
        clearValue: { r: 0.04, g: 0.04, b: 0.06, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);

    if (numSpringsToDraw > 0) {
      pass.setPipeline(this.springPipeline);
      pass.setVertexBuffer(0, this.springVertexBuffer);
      pass.draw(numSpringsToDraw * 2);
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
