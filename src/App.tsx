import './App.css';
import { useCallback, useEffect, useRef } from 'react';
import { SPHSimulation, SpringData } from './gpu/simulation';
import { MetaballRenderer } from './gpu/renderer';

const NUM_PARTICLES = 100;
const MAX_SPRINGS_PER_PARTICLE = 15;
const width = window.innerWidth;
const height = window.innerHeight;
const isMobile = width * height < 800 * 800;

const SMOOTHING_RADIUS = 0.07;
const CONTROL_POWER = 0.5;
const SPIN_POWER = 0.3;

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

function App() {
  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const spinsRef = useRef<'none' | 'left' | 'right'>('none');
  const touchRef = useRef(false);
  const gxRef = useRef(0);
  const gyRef = useRef(0);
  const stateRef = useRef<ParticleState>('sticky');
  const simRef = useRef<SPHSimulation | null>(null);
  const rendererRef = useRef<MetaballRenderer | null>(null);
  const contextRef = useRef<GPUCanvasContext | null>(null);
  const deviceRef = useRef<GPUDevice | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initialSpringsRef = useRef<SpringData[]>([]);

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

  useEffect(() => {
    if (typeof GravitySensor !== 'undefined' && GravitySensor) {
      try {
        const s = new GravitySensor({ frequency: 60 });
        const fn = () => { gxRef.current = s.x; gyRef.current = s.y; };
        s.addEventListener('reading', fn);
        s.start();
        return () => { s.stop(); s.removeEventListener('reading', fn); };
      } catch {}
    }
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
    await sim.init();
    sim.updateUniforms();
    simRef.current = sim;

    // Initialize particles in a dense centered blob
    const data = new Float32Array(NUM_PARTICLES * 6);
    const cols = Math.ceil(Math.sqrt(NUM_PARTICLES * 0.6));
    const spacing = SMOOTHING_RADIUS * 0.5;
    const rows = Math.ceil(NUM_PARTICLES / cols);
    const gridW = (cols - 1) * spacing;
    const gridH = (rows - 1) * spacing;
    const startX = 0.5 - gridW / 2;
    const startY = 0.5 - gridH / 2;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const o = i * 6;
      data[o] = startX + col * spacing + (row % 2) * spacing * 0.5;
      data[o + 1] = startY + row * spacing;
    }
    sim.uploadParticles(data);

    // Create fixed spring topology (grid mesh)
    const springs = buildInitialSprings(data);
    initialSpringsRef.current = springs;
    sim.springStiffness = 0.4;
    sim.uploadSprings(springs);

    // Set up containment (invisible walls)
    sim.setRigidBodies([
      { x: 0.5, y: -0.5, vx: 0, vy: 0, halfW: 0.6, halfH: 0.5, shapeType: 0 },
      { x: 0.5, y: 1.5, vx: 0, vy: 0, halfW: 0.6, halfH: 0.5, shapeType: 0 },
      { x: -0.5, y: 0.5, vx: 0, vy: 0, halfW: 0.5, halfH: 0.6, shapeType: 0 },
      { x: 1.5, y: 0.5, vx: 0, vy: 0, halfW: 0.5, halfH: 0.6, shapeType: 0 },
    ]);

    const renderer = new MetaballRenderer(device, format);
    await renderer.init();
    renderer.setParams({
      numParticles: NUM_PARTICLES,
      smoothingRadius: SMOOTHING_RADIUS,
      threshold: 0.7,
      aspectRatio: canvas.width / canvas.height,
      resX: canvas.width,
      resY: canvas.height,
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

      // Upload springs for physics (fixed topology, initial rest lengths)
      const springs = initialSpringsRef.current;
      if (state === 'fluid') {
        s.uploadSprings([]);
      } else {
        s.springStiffness = state === 'elastic' ? 0.15 : 0.3;
        s.uploadSprings(springs);
      }

      // Build spring line vertices for rendering
      const springVerts = new Float32Array(springs.length * 4);
      for (let i = 0; i < springs.length; i++) {
        const o = i * 4;
        const sp = springs[i];
        springVerts[o] = positions[sp.i * 6];
        springVerts[o + 1] = positions[sp.i * 6 + 1];
        springVerts[o + 2] = positions[sp.j * 6];
        springVerts[o + 3] = positions[sp.j * 6 + 1];
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
        const spinStr = SPIN_POWER * 2;
        for (let i = 0; i < NUM_PARTICLES; i++) {
          const dx = positions[i * 6] - cx;
          const dy = positions[i * 6 + 1] - cy;
          s.applyImpulse(cx + dx * 0.01, cy + dy * 0.01, 0.001, -dy * spinStr * spinDir, dx * spinStr * spinDir);
        }
      }

      if (ctrlX !== 0 || ctrlY !== 0) {
        const len = Math.sqrt(ctrlX * ctrlX + ctrlY * ctrlY);
        if (len > 0) { ctrlX /= len; ctrlY /= len; }
        s.setControl(ctrlX, ctrlY, CONTROL_POWER);
      } else {
        s.clearControl();
      }

      // Gravity from orientation sensor
      const gx = gxRef.current;
      const gy = gyRef.current;
      if (gx !== 0 || gy !== 0) {
        s.setGravity(-gx * gravScale * 0.5, gy * gravScale * 0.5 - 1.0);
      }

      s.updateUniforms();
      s.step();
      r.render(c, springs.length);
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
