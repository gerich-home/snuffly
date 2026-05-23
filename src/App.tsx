import './App.css';
import { useCallback, useEffect, useRef } from 'react';
import { SPHSimulation, SpringData } from './gpu/simulation';
import { MetaballRenderer } from './gpu/renderer';

const NUM_PARTICLES = 100;
const MAX_SPRINGS_PER_PARTICLE = 20;
const width = window.innerWidth;
const height = window.innerHeight;
const isMobile = width * height < 800 * 800;

const VIEW_SCALE = 4;
const SMOOTHING_RADIUS = 0.07 * VIEW_SCALE;
const SPACING = SMOOTHING_RADIUS * 0.5;
const CONTROL_POWER = 0.5;
const SPIN_POWER = 0.3;
const SHAKE_THRESHOLD = 15;

declare var GravitySensor: {
  new(opts?: { frequency: number }): {
    x: number; y: number; z: number;
    addEventListener(t: 'reading', fn: () => void): void;
    removeEventListener(t: 'reading', fn: () => void): void;
    start(): void; stop(): void;
  };
};

type ParticleState = 'sticky' | 'elastic' | 'fluid';

function buildInitialSprings(positions: Float32Array): SpringData[] {
  const cols = Math.ceil(Math.sqrt(NUM_PARTICLES * 0.6));
  const rows = Math.ceil(NUM_PARTICLES / cols);
  const springs: SpringData[] = [];
  const perParticle = new Uint8Array(NUM_PARTICLES);

  for (let i = 0; i < NUM_PARTICLES; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const tryAdd = (j: number) => {
      if (j >= NUM_PARTICLES) return;
      if (perParticle[i] >= MAX_SPRINGS_PER_PARTICLE) return;
      if (perParticle[j] >= MAX_SPRINGS_PER_PARTICLE) return;
      const dx = positions[i * 6] - positions[j * 6];
      const dy = positions[i * 6 + 1] - positions[j * 6 + 1];
      const restLen = Math.sqrt(dx * dx + dy * dy);
      if (restLen < 0.001) return;
      springs.push({ i, j, restLength: restLen });
      perParticle[i]++;
      perParticle[j]++;
    };

    if (col + 1 < cols) tryAdd(i + 1);
    if (row + 1 < rows) tryAdd(i + cols);
    if (col + 1 < cols && row + 1 < rows) tryAdd(i + cols + 1);
    if (col > 0 && row + 1 < rows) tryAdd(i + cols - 1);
  }

  return springs;
}

function findNeighbors(positions: Float32Array, radius: number) {
  const n = NUM_PARTICLES;
  const r2 = radius * radius;
  const neighbors: { j: number; dist: number }[][] = Array.from({ length: n }, () => []);
  const minDistSq = 0.001 * 0.001;
  for (let i = 0; i < n; i++) {
    const ix = positions[i * 6];
    const iy = positions[i * 6 + 1];
    for (let j = i + 1; j < n; j++) {
      const dx = ix - positions[j * 6];
      const dy = iy - positions[j * 6 + 1];
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > minDistSq) {
        const d = Math.sqrt(d2);
        neighbors[i].push({ j, dist: d });
        neighbors[j].push({ j: i, dist: d });
      }
    }
  }
  return neighbors;
}

function findSpringPairs(positions: Float32Array, state: ParticleState): SpringData[] {
  if (state === 'fluid') return [];

  const connectRadius = SMOOTHING_RADIUS;
  const breakRadius = connectRadius * 1.5;
  const breakR2 = breakRadius * breakRadius;
  const neighbors = findNeighbors(positions, connectRadius);
  const springs: SpringData[] = [];
  const perParticle = new Uint8Array(NUM_PARTICLES);

  for (let i = 0; i < NUM_PARTICLES; i++) {
    for (const n of neighbors[i]) {
      if (n.j <= i) continue;
      if (perParticle[i] >= MAX_SPRINGS_PER_PARTICLE) continue;
      if (perParticle[n.j] >= MAX_SPRINGS_PER_PARTICLE) continue;

      const dx = positions[i * 6] - positions[n.j * 6];
      const dy = positions[i * 6 + 1] - positions[n.j * 6 + 1];
      const d2 = dx * dx + dy * dy;
      if (d2 > breakR2) continue;

      springs.push({ i: i, j: n.j, restLength: n.dist });
      perParticle[i]++;
      perParticle[n.j]++;
    }
  }

  return springs;
}

function App() {
  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const spinsRef = useRef<'none' | 'left' | 'right'>('none');
  const touchRef = useRef(false);
  const stateRef = useRef<ParticleState>('sticky');
  const simRef = useRef<SPHSimulation | null>(null);
  const rendererRef = useRef<MetaballRenderer | null>(null);
  const contextRef = useRef<GPUCanvasContext | null>(null);
  const deviceRef = useRef<GPUDevice | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initialSpringsRef = useRef<SpringData[]>([]);

  // Sensor state
  const gxRef = useRef(0);
  const gyRef = useRef(0);
  const shakeRef = useRef(0);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });

  const keyMap: Record<string, (v: boolean) => void> = {
    'ArrowLeft': (v) => { spinsRef.current = v ? 'left' : (spinsRef.current === 'left' ? 'none' : spinsRef.current); },
    'ArrowRight': (v) => { spinsRef.current = v ? 'right' : (spinsRef.current === 'right' ? 'none' : spinsRef.current); },
    'KeyW': (v) => { keysRef.current.up = v; },
    'KeyA': (v) => { keysRef.current.left = v; },
    'KeyS': (v) => { keysRef.current.down = v; },
    'KeyD': (v) => { keysRef.current.right = v; },
    'KeyQ': (v) => { if (v) stateRef.current = 'sticky'; },
    'KeyE': (v) => { if (v) stateRef.current = 'elastic'; },
    'KeyF': (v) => { if (v) stateRef.current = 'fluid'; },
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { const f = keyMap[e.code]; if (f) f(true); };
    const onUp = (e: KeyboardEvent) => { const f = keyMap[e.code]; if (f) f(false); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  useEffect(() => {
    const onStart = () => { touchRef.current = true; };
    const onEnd = () => { touchRef.current = false; };
    window.addEventListener('touchstart', onStart, false);
    window.addEventListener('touchend', onEnd, false);
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd); };
  }, []);

  // Device orientation (tilt)
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) gxRef.current = e.gamma;
      if (e.beta !== null) gyRef.current = e.beta;
    };
    window.addEventListener('deviceorientation', onOrientation);

    // Also try GravitySensor (newer API)
    if (typeof GravitySensor !== 'undefined' && GravitySensor) {
      try {
        const s = new GravitySensor({ frequency: 60 });
        const fn = () => { gxRef.current = s.x * 90; gyRef.current = s.y * 90; };
        s.addEventListener('reading', fn);
        s.start();
      } catch {}
    }

    return () => { window.removeEventListener('deviceorientation', onOrientation); };
  }, []);

  // Device motion (shake)
  useEffect(() => {
    const onMotion = (e: DeviceMotionEvent) => {
      if (!e.accelerationIncludingGravity) return;
      const ax = e.accelerationIncludingGravity.x || 0;
      const ay = e.accelerationIncludingGravity.y || 0;
      const az = e.accelerationIncludingGravity.z || 0;
      const last = lastAccelRef.current;
      const delta = Math.abs(ax - last.x) + Math.abs(ay - last.y) + Math.abs(az - last.z);
      lastAccelRef.current = { x: ax, y: ay, z: az };
      if (delta > SHAKE_THRESHOLD) {
        shakeRef.current = 1;
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => { window.removeEventListener('devicemotion', onMotion); };
  }, []);

  const canvasCallback = useCallback(async (canvas: HTMLCanvasElement | null) => {
    if (!canvas || canvasRef.current === canvas) return;
    canvasRef.current = canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (!navigator.gpu) { console.error('WebGPU not available'); return; }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return;
    const device = await adapter.requestDevice();
    deviceRef.current = device;

    const context = canvas.getContext('webgpu');
    if (!context) return;
    contextRef.current = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    const sim = new SPHSimulation(device, NUM_PARTICLES);
    sim.smoothingRadius = SMOOTHING_RADIUS;
    sim.gravityY = -6.0;
    sim.boundaryMinX = 0.08;
    sim.boundaryMinY = 0.08;
    sim.boundaryMaxX = 3.92;
    sim.boundaryMaxY = 3.92;
    await sim.init();
    sim.updateUniforms();
    simRef.current = sim;

    // Initialize particles in [0, 4] space, centered at (2, 2)
    const data = new Float32Array(NUM_PARTICLES * 6);
    const cols = Math.ceil(Math.sqrt(NUM_PARTICLES * 0.6));
    const rows = Math.ceil(NUM_PARTICLES / cols);
    const gridW = (cols - 1) * SPACING;
    const gridH = (rows - 1) * SPACING;
    const startX = 2 - gridW / 2;
    const startY = 2 - gridH / 2;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const o = i * 6;
      data[o] = startX + col * SPACING + (row % 2) * SPACING * 0.5;
      data[o + 1] = startY + row * SPACING;
    }
    sim.uploadParticles(data);

    const renderer = new MetaballRenderer(device, format);
    await renderer.init();
    renderer.setParams({
      numParticles: NUM_PARTICLES,
      smoothingRadius: SMOOTHING_RADIUS,
      threshold: 0.4,
      aspectRatio: canvas.width / canvas.height,
      resX: canvas.width,
      resY: canvas.height,
      viewScale: VIEW_SCALE,
    });
    renderer.createBindGroup(sim.getParticleBuffer());
    rendererRef.current = renderer;
  }, []);

  useEffect(() => {
    let running = true;

    async function frame() {
      if (!running) return;
      const s = simRef.current;
      const r = rendererRef.current;
      const c = contextRef.current;
      if (!s || !r || !c) { requestAnimationFrame(frame); return; }

      const keys = keysRef.current;
      const state = stateRef.current;
      const spin = touchRef.current ? 'left' : spinsRef.current;
      const gravScale = 0.5 / (9.8 * 1);

      let positions: Float32Array;
      try {
        positions = await s.readParticles();
      } catch {
        requestAnimationFrame(frame);
        return;
      }

      // Dynamic spring management
      const dynamicSprings = findSpringPairs(positions, state);
      if (state === 'fluid') {
        s.uploadSprings([]);
      } else {
        s.springStiffness = state === 'elastic' ? 0.1 : 0.3;
        s.uploadSprings(dynamicSprings);
      }

      // Build spring line vertices (divided by viewScale for rendering)
      const springVerts = new Float32Array(dynamicSprings.length * 4);
      for (let i = 0; i < dynamicSprings.length; i++) {
        const o = i * 4;
        const sp = dynamicSprings[i];
        springVerts[o] = positions[sp.i * 6] / VIEW_SCALE;
        springVerts[o + 1] = positions[sp.i * 6 + 1] / VIEW_SCALE;
        springVerts[o + 2] = positions[sp.j * 6] / VIEW_SCALE;
        springVerts[o + 3] = positions[sp.j * 6 + 1] / VIEW_SCALE;
      }
      r.uploadSpringVertices(springVerts);

      // Apply user control
      let ctrlX = 0, ctrlY = 0;
      if (keys.left) ctrlX -= 1;
      if (keys.right) ctrlX += 1;
      if (keys.up) ctrlY += 1;
      if (keys.down) ctrlY -= 1;

      // Apply spin force
      if (spin !== 'none') {
        const spinDir = spin === 'left' ? 1 : -1;
        let cx = 0, cy = 0;
        for (let i = 0; i < NUM_PARTICLES; i++) {
          cx += positions[i * 6];
          cy += positions[i * 6 + 1];
        }
        cx /= NUM_PARTICLES;
        cy /= NUM_PARTICLES;
        const spinStr = SPIN_POWER * 2 * VIEW_SCALE;
        for (let i = 0; i < NUM_PARTICLES; i++) {
          const dx = positions[i * 6] - cx;
          const dy = positions[i * 6 + 1] - cy;
          s.applyImpulse(cx + dx * 0.01, cy + dy * 0.01, 0.001, -dy * spinStr * spinDir, dx * spinStr * spinDir);
        }
      }

      if (ctrlX !== 0 || ctrlY !== 0) {
        const len = Math.sqrt(ctrlX * ctrlX + ctrlY * ctrlY);
        if (len > 0) { ctrlX /= len; ctrlY /= len; }
        s.setControl(ctrlX, ctrlY, CONTROL_POWER * VIEW_SCALE);
      } else {
        s.clearControl();
      }

      // Gravity from orientation sensor
      const gx = gxRef.current;
      const gy = gyRef.current;
      if (gx !== 0 || gy !== 0) {
        const tiltX = -gx * gravScale * 0.5 * VIEW_SCALE;
        const tiltY = gy * gravScale * 0.5 * VIEW_SCALE;
        s.setGravity(tiltX, tiltY - 6.0);
      }

      // Shake detection → impulse
      if (shakeRef.current) {
        const cx = 2, cy = 2;
        const radius = 1.0 * VIEW_SCALE;
        s.applyImpulse(cx, cy, radius, 4, -4);
        shakeRef.current = 0;
      }

      s.updateUniforms();
      s.step();
      r.render(c, dynamicSprings.length);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return () => { running = false; };
  }, []);

  return (
    <>
      <canvas ref={canvasCallback} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: 8, left: 8, color: '#888',
        font: '12px monospace', pointerEvents: 'none', opacity: 0.8,
      }}>
        {isMobile ? 'Tilt to move. Shake for impulse.' : 'WASD - move | Arrows - spin | Q/E/F - state'}
      </div>
    </>
  );
}

export default App;
