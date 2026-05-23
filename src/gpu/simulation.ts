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
  restDensity = 1;
  stiffness = 0.02;
  nearStiffness = 2;
  viscosityA = 0.5;
  viscosityB = 0.01;
  springStiffness = 0.02;
  springConnectRadius = 0.03;
  springBreakRadius = 0.05;
  springStretchThreshold = 0.5;
  springCompressThreshold = 0.2;
  springStretchSpeed = 0.1;
  springCompressSpeed = 3;
  maxCollisionVelocity = 2;
  maxSpringLength = 0.05;
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

  private particleStride = 28;
  private maxRigidBodies = 16;

  private particleBuffer!: GPUBuffer;
  private restLengthsBuffer!: GPUBuffer;
  private rigidBodyBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private bindGroup!: GPUBindGroup;
  private pipelineDensity!: GPUComputePipeline;
  private pipelineIntegrate!: GPUComputePipeline;
  private particleBufferSize: number;
  private uniformBufferSize = 144;
  private rigidBodyBufferSize: number;

  constructor(device: GPUDevice, numParticles: number) {
    this.device = device;
    this.numParticles = numParticles;
    this.particleBufferSize = numParticles * this.particleStride;
    this.rigidBodyBufferSize = this.maxRigidBodies * 32;
  }

  async init() {
    this.createBuffers();
    this.createPipelines();
  }

  private createBuffers() {
    this.particleBuffer = this.device.createBuffer({
      size: this.particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.restLengthsBuffer = this.device.createBuffer({
      size: this.numParticles * this.numParticles * 4,
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
  }

  private createPipelines() {
    const shaderModule = this.device.createShaderModule({ code: SPH_COMPUTE });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
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
        { binding: 2, resource: { buffer: this.restLengthsBuffer } },
        { binding: 3, resource: { buffer: this.rigidBodyBuffer } },
      ],
    });
  }

  uploadParticles(data: Float32Array) {
    this.device.queue.writeBuffer(this.particleBuffer, 0, data);
  }

  uploadRestLengths(data: Float32Array) {
    this.device.queue.writeBuffer(this.restLengthsBuffer, 0, data);
  }

  initRestLengthsFromSprings(springs: SpringData[]) {
    const data = new Float32Array(this.numParticles * this.numParticles);
    for (const sp of springs) {
      data[sp.i * this.numParticles + sp.j] = sp.restLength;
      data[sp.j * this.numParticles + sp.i] = sp.restLength;
    }
    this.device.queue.writeBuffer(this.restLengthsBuffer, 0, data);
  }

  setRigidBodies(bodies: RigidBodyData[]) {
    const data = new Float32Array(this.maxRigidBodies * 8);
    for (let i = 0; i < bodies.length; i++) {
      const o = i * 8;
      data[o + 0] = bodies[i].x;
      data[o + 1] = bodies[i].y;
      data[o + 2] = bodies[i].vx;
      data[o + 3] = bodies[i].vy;
      data[o + 4] = bodies[i].halfW;
      data[o + 5] = bodies[i].halfH;
      data[o + 6] = 0;
      data[o + 7] = bodies[i].shapeType;
    }
    this.device.queue.writeBuffer(this.rigidBodyBuffer, 0, data);
  }

  updateUniforms() {
    const buf = new ArrayBuffer(this.uniformBufferSize);
    const u32 = new Uint32Array(buf);
    const f32 = new Float32Array(buf);

    u32[0] = this.numParticles;
    u32[1] = this.device === null ? 0 : 0;
    u32[2] = this.impulseActive;
    u32[3] = this.numParticles * this.numParticles;
    f32[4] = this.dt;
    f32[5] = this.smoothingRadius;
    f32[6] = this.restDensity;
    f32[7] = this.stiffness;
    f32[8] = this.nearStiffness;
    f32[9] = this.viscosityA;
    f32[10] = this.viscosityB;
    f32[11] = this.springStiffness;
    f32[12] = this.wallDamping;
    f32[13] = this.maxVelocity;
    f32[14] = this.impulseRadius;
    f32[15] = this.controlStrength;
    f32[16] = this.springConnectRadius;
    f32[17] = this.springBreakRadius;
    f32[18] = this.springStretchThreshold;
    f32[19] = this.springCompressThreshold;
    f32[20] = this.springStretchSpeed;
    f32[21] = this.springCompressSpeed;
    f32[22] = this.maxCollisionVelocity;
    f32[23] = this.maxSpringLength;
    f32[24] = this.gravityX;
    f32[25] = this.gravityY;
    f32[26] = this.boundaryMinX;
    f32[27] = this.boundaryMinY;
    f32[28] = this.boundaryMaxX;
    f32[29] = this.boundaryMaxY;
    f32[30] = this.impulseX;
    f32[31] = this.impulseY;
    f32[32] = this.impulseStrX;
    f32[33] = this.impulseStrY;
    f32[34] = this.controlDirX;
    f32[35] = this.controlDirY;

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
