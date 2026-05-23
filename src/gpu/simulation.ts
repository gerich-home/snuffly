import { SPH_COMPUTE } from './shaders';

export interface SpringData {
  i: number;
  j: number;
  restLength: number;
}

export interface RigidBodyData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  halfW: number;
  halfH: number;
  shapeType: number;
}

export class SPHSimulation {
  device: GPUDevice;
  numParticles: number;
  smoothingRadius = 0.07;
  restDensity = 3.0;
  stiffness = 80.0;
  nearStiffness = 30.0;
  viscosity = 0.2;
  springStiffness = 0.5;
  wallDamping = 0.4;
  maxVelocity = 3.0;
  gravityX = 0;
  gravityY = -1.5;
  dt = 0.005;
  boundaryMinX = 0.02;
  boundaryMinY = 0.02;
  boundaryMaxX = 0.98;
  boundaryMaxY = 0.98;

  impulseX = 0;
  impulseY = 0;
  impulseRadius = 0;
  impulseStrX = 0;
  impulseStrY = 0;
  impulseActive = 0;

  controlDirX = 0;
  controlDirY = 0;
  controlStrength = 0;

  private maxSprings = 2000;
  private maxRigidBodies = 16;

  private particleBuffer!: GPUBuffer;
  private springBuffer!: GPUBuffer;
  private rigidBodyBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private readbackBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;
  private pipelineDensity!: GPUComputePipeline;
  private pipelineIntegrate!: GPUComputePipeline;
  private particleBufferSize: number;
  private uniformBufferSize = 128;
  private springBufferSize: number;
  private rigidBodyBufferSize: number;
  private springs: SpringData[] = [];
  private rigidBodies: RigidBodyData[] = [];

  constructor(device: GPUDevice, numParticles: number) {
    this.device = device;
    this.numParticles = numParticles;
    this.particleBufferSize = numParticles * 24;
    this.springBufferSize = this.maxSprings * 16;
    this.rigidBodyBufferSize = this.maxRigidBodies * 32;
  }

  async init() {
    this.createBuffers();
    this.createPipelines();
    this.initReadback();
  }

  private createBuffers() {
    this.particleBuffer = this.device.createBuffer({
      size: this.particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });

    this.springBuffer = this.device.createBuffer({
      size: this.springBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.rigidBodyBuffer = this.device.createBuffer({
      size: this.rigidBodyBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.uniformBuffer = this.device.createBuffer({
      size: this.uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.readbackBuffer = this.device.createBuffer({
      size: this.particleBufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
  }

  private createPipelines() {
    const shaderModule = this.device.createShaderModule({ code: SPH_COMPUTE });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
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
        { binding: 2, resource: { buffer: this.springBuffer } },
        { binding: 3, resource: { buffer: this.rigidBodyBuffer } },
      ],
    });
  }

  private initReadback() {
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.particleBuffer, 0, this.readbackBuffer, 0, this.particleBufferSize);
    this.device.queue.submit([encoder.finish()]);
  }

  uploadParticles(data: Float32Array) {
    this.device.queue.writeBuffer(this.particleBuffer, 0, data);
  }

  uploadSprings(springs: SpringData[]) {
    this.springs = springs;
    const data = new Float32Array(this.maxSprings * 4);
    for (let i = 0; i < springs.length; i++) {
      const o = i * 4;
      data[o + 0] = springs[i].i;
      data[o + 1] = springs[i].j;
      data[o + 2] = springs[i].restLength;
    }
    this.device.queue.writeBuffer(this.springBuffer, 0, data);
  }

  setRigidBodies(bodies: RigidBodyData[]) {
    this.rigidBodies = bodies;
    const data = new Float32Array(this.maxRigidBodies * 8);
    for (let i = 0; i < bodies.length; i++) {
      const o = i * 8;
      data[o + 0] = bodies[i].x;
      data[o + 1] = bodies[i].y;
      data[o + 2] = bodies[i].vx;
      data[o + 3] = bodies[i].vy;
      data[o + 4] = bodies[i].halfW;
      data[o + 5] = bodies[i].halfH;
      data[o + 6] = 0; // angle
      data[o + 7] = bodies[i].shapeType;
    }
    this.device.queue.writeBuffer(this.rigidBodyBuffer, 0, data);
  }

  addRigidBody(body: RigidBodyData) {
    this.rigidBodies.push(body);
    this.updateRigidBodyBuffer();
  }

  private updateRigidBodyBuffer() {
    this.setRigidBodies(this.rigidBodies);
  }

  updateUniforms() {
    const buf = new ArrayBuffer(this.uniformBufferSize);
    const u32 = new Uint32Array(buf);
    const f32 = new Float32Array(buf);

    u32[0] = this.numParticles;
    u32[1] = this.springs.length;
    u32[2] = this.rigidBodies.length;
    f32[3] = this.dt;
    f32[4] = this.smoothingRadius;
    f32[5] = this.restDensity;
    f32[6] = this.stiffness;
    f32[7] = this.nearStiffness;
    f32[8] = this.viscosity;
    f32[9] = this.springStiffness;
    f32[10] = this.gravityX;
    f32[11] = this.gravityY;
    f32[12] = this.wallDamping;
    f32[14] = this.boundaryMinX;
    f32[15] = this.boundaryMinY;
    f32[16] = this.boundaryMaxX;
    f32[17] = this.boundaryMaxY;
    f32[18] = this.maxVelocity;
    f32[20] = this.impulseX;
    f32[21] = this.impulseY;
    f32[22] = this.impulseRadius;
    f32[24] = this.impulseStrX;
    f32[25] = this.impulseStrY;
    u32[26] = this.impulseActive;
    f32[28] = this.controlDirX;
    f32[29] = this.controlDirY;
    f32[30] = this.controlStrength;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, buf);
  }

  setGravity(x: number, y: number) {
    this.gravityX = x;
    this.gravityY = y;
    this.updateUniforms();
  }

  applyImpulse(cx: number, cy: number, radius: number, sx: number, sy: number) {
    this.impulseX = cx;
    this.impulseY = cy;
    this.impulseRadius = radius;
    this.impulseStrX = sx;
    this.impulseStrY = sy;
    this.impulseActive = 1;
    this.updateUniforms();
  }

  setControl(dirX: number, dirY: number, strength: number) {
    this.controlDirX = dirX;
    this.controlDirY = dirY;
    this.controlStrength = strength;
    this.updateUniforms();
  }

  clearControl() {
    this.controlDirX = 0;
    this.controlDirY = 0;
    this.controlStrength = 0;
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

    // Copy particles to readback buffer (for CPU next frame)
    encoder.copyBufferToBuffer(this.particleBuffer, 0, this.readbackBuffer, 0, this.particleBufferSize);

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

  async readParticles(): Promise<Float32Array> {
    await this.readbackBuffer.mapAsync(GPUMapMode.READ);
    const data = new Float32Array(this.readbackBuffer.getMappedRange().slice(0));
    this.readbackBuffer.unmap();
    return data;
  }

  getParticleBuffer() {
    return this.particleBuffer;
  }
}
