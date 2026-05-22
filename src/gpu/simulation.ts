import { SPH_COMPUTE } from './shaders';

export class SPHSimulation {
  device: GPUDevice;
  numParticles: number;
  smoothingRadius = 0.06;
  restDensity = 2.0;
  stiffness = 50.0;
  nearStiffness = 20.0;
  viscosity = 0.3;
  wallDamping = 0.5;
  maxVelocity = 4.0;
  gravityX = 0;
  gravityY = -2.0;
  dt = 0.004;
  boundaryMinX = 0.02;
  boundaryMinY = 0.02;
  boundaryMaxX = 0.98;
  boundaryMaxY = 0.98;

  private impulseX = 0;
  private impulseY = 0;
  private impulseRadius = 0;
  private impulseStrX = 0;
  private impulseStrY = 0;
  private impulseActive = 0;

  private particleBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;
  private pipelineDensity!: GPUComputePipeline;
  private pipelineIntegrate!: GPUComputePipeline;
  private particleBufferSize: number;
  private uniformBufferSize = 112;

  constructor(device: GPUDevice, numParticles: number) {
    this.device = device;
    this.numParticles = numParticles;
    this.particleBufferSize = numParticles * 24;
  }

  async init() {
    this.createBuffers();
    this.createPipelines();
    this.initializeParticles();
    this.updateUniforms();
  }

  private createBuffers() {
    this.particleBuffer = this.device.createBuffer({
      size: this.particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.uniformBuffer = this.device.createBuffer({
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private createPipelines() {
    const shaderModule = this.device.createShaderModule({ code: SPH_COMPUTE });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    this.pipelineDensity = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module: shaderModule, entryPoint: 'computeDensityAndPressure' },
    });

    this.pipelineIntegrate = this.device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module: shaderModule, entryPoint: 'computeForcesAndIntegrate' },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  initializeParticles() {
    const data = new Float32Array(this.numParticles * 6);
    const cols = Math.ceil(Math.sqrt(this.numParticles * 0.5));
    const spacing = this.smoothingRadius * 0.4;

    for (let i = 0; i < this.numParticles; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offset = i * 6;
      data[offset + 0] = 0.3 + col * spacing + (row % 2) * spacing * 0.5;
      data[offset + 1] = 0.45 + row * spacing;
    }

    this.device.queue.writeBuffer(this.particleBuffer, 0, data);
  }

  setInitialPositions(positions: Float32Array) {
    const data = new Float32Array(this.numParticles * 6);
    for (let i = 0; i < this.numParticles; i++) {
      const o = i * 6;
      data[o + 0] = positions[i * 2];
      data[o + 1] = positions[i * 2 + 1];
    }
    this.device.queue.writeBuffer(this.particleBuffer, 0, data);
  }

  updateUniforms() {
    const buf = new ArrayBuffer(this.uniformBufferSize);
    const u32 = new Uint32Array(buf);
    const f32 = new Float32Array(buf);

    u32[0] = this.numParticles;
    f32[1] = this.dt;
    f32[2] = this.smoothingRadius;
    f32[3] = this.restDensity;
    f32[4] = this.stiffness;
    f32[5] = this.nearStiffness;
    f32[6] = this.viscosity;
    f32[8] = this.gravityX;
    f32[9] = this.gravityY;
    f32[10] = this.wallDamping;
    f32[12] = this.boundaryMinX;
    f32[13] = this.boundaryMinY;
    f32[14] = this.boundaryMaxX;
    f32[15] = this.boundaryMaxY;
    f32[16] = this.maxVelocity;
    f32[18] = this.impulseX;
    f32[19] = this.impulseY;
    f32[20] = this.impulseRadius;
    f32[22] = this.impulseStrX;
    f32[23] = this.impulseStrY;
    u32[24] = this.impulseActive;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, buf);
  }

  setGravity(x: number, y: number) {
    this.gravityX = x;
    this.gravityY = y;
    this.updateUniforms();
  }

  applyImpulse(cx: number, cy: number, radius: number, strengthX: number, strengthY: number) {
    this.impulseX = cx;
    this.impulseY = cy;
    this.impulseRadius = radius;
    this.impulseStrX = strengthX;
    this.impulseStrY = strengthY;
    this.impulseActive = 1;
    this.updateUniforms();
  }

  private clearImpulse() {
    if (this.impulseActive) {
      this.impulseActive = 0;
      this.updateUniforms();
    }
  }

  step() {
    const wg = Math.ceil(this.numParticles / 128);
    const encoder = this.device.createCommandEncoder();

    const p1 = encoder.beginComputePass();
    p1.setPipeline(this.pipelineDensity);
    p1.setBindGroup(0, this.bindGroup);
    p1.dispatchWorkgroups(wg);
    p1.end();

    const p2 = encoder.beginComputePass();
    p2.setPipeline(this.pipelineIntegrate);
    p2.setBindGroup(0, this.bindGroup);
    p2.dispatchWorkgroups(wg);
    p2.end();

    this.device.queue.submit([encoder.finish()]);
    this.clearImpulse();
  }

  getParticleBuffer() {
    return this.particleBuffer;
  }
}
