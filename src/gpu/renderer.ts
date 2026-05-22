import { METABALL_VERTEX, METABALL_FRAGMENT } from './shaders';

export class MetaballRenderer {
  format: GPUTextureFormat;
  numParticles = 0;
  smoothingRadius = 0.06;
  threshold = 0.65;
  aspectRatio = 1;
  resX = 1;
  resY = 1;

  private device: GPUDevice;
  private uniformBuffer!: GPUBuffer;
  private uniformBufferSize = 24;
  pipeline!: GPURenderPipeline;
  bindGroup!: GPUBindGroup;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
  }

  async init() {
    this.uniformBuffer = this.device.createBuffer({
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
  }>) {
    if (params.numParticles !== undefined) this.numParticles = params.numParticles;
    if (params.smoothingRadius !== undefined) this.smoothingRadius = params.smoothingRadius;
    if (params.threshold !== undefined) this.threshold = params.threshold;
    if (params.aspectRatio !== undefined) this.aspectRatio = params.aspectRatio;
    if (params.resX !== undefined) this.resX = params.resX;
    if (params.resY !== undefined) this.resY = params.resY;
    this.updateUniforms();
  }

  render(context: GPUCanvasContext) {
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
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }
}
