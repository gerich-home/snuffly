import './App.css';
import { useCallback, useEffect, useRef } from 'react';
import { SPHSimulation, SpringData } from './gpu/simulation';
import { MetaballRenderer } from './gpu/renderer';

const NUM_PARTICLES = 100;
const width = window.innerWidth;
const height = window.innerHeight;
const isMobile = width * height < 800 * 800;

const CAMERA_ZOOM = 4;
const R = 25 / 800;
const REST_DENSITY = 1;
const K = 0.02;
const K_NEAR = 2;
const STIFFNESS_STRONG = 0.1;
const STIFFNESS_SOFT = 0.02;
const SMOOTHING_RADIUS = R;
const SPACING = 2.5 / 800;
const CONTROL_POWER = 0.2;
const SPIN_POWER = 0.003;
const COMPRESS_POWER = 0.01;
const SHAKE_THRESHOLD = 15;

declare var GravitySensor: any;

type ParticleState = 'sticky' | 'elastic' | 'fluid';

function buildInitialSprings(positions: Float32Array): SpringData[] {
  const cols = Math.ceil(Math.sqrt(NUM_PARTICLES));
  const rows = Math.ceil(NUM_PARTICLES / cols);
  const springs: SpringData[] = [];
  const perParticle = new Uint8Array(NUM_PARTICLES);

  for (let i = 0; i < NUM_PARTICLES; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const tryAdd = (j: number) => {
      if (j >= NUM_PARTICLES) return;
      if (perParticle[i] >= 15 || perParticle[j] >= 15) return;
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
  const stateRef = useRef<ParticleState>('sticky');
  const simRef = useRef<SPHSimulation | null>(null);
  const rendererRef = useRef<MetaballRenderer | null>(null);
  const contextRef = useRef<GPUCanvasContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) gxRef.current = e.gamma;
      if (e.beta !== null) gyRef.current = e.beta;
    };
    window.addEventListener('deviceorientation', onOrientation);
    if (typeof GravitySensor !== 'undefined' && GravitySensor) {
      try {
        const s = new GravitySensor({ frequency: 60 });
        const fn = () => { gxRef.current = s.x * 90; gyRef.current = s.y * 90; };
        s.addEventListener('reading', fn); s.start();
      } catch {}
    }
    return () => { window.removeEventListener('deviceorientation', onOrientation); };
  }, []);

  useEffect(() => {
    const onMotion = (e: DeviceMotionEvent) => {
      if (!e.accelerationIncludingGravity) return;
      const ax = e.accelerationIncludingGravity.x || 0;
      const ay = e.accelerationIncludingGravity.y || 0;
      const az = e.accelerationIncludingGravity.z || 0;
      const last = lastAccelRef.current;
      const delta = Math.abs(ax - last.x) + Math.abs(ay - last.y) + Math.abs(az - last.z);
      lastAccelRef.current = { x: ax, y: ay, z: az };
      if (delta > SHAKE_THRESHOLD) shakeRef.current = 1;
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
    const context = canvas.getContext('webgpu');
    if (!context) return;
    contextRef.current = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    const sim = new SPHSimulation(device, NUM_PARTICLES);
    sim.smoothingRadius = SMOOTHING_RADIUS;
    sim.restDensity = REST_DENSITY;
    sim.stiffness = K;
    sim.nearStiffness = K_NEAR;
    sim.gravityY = -1.5;
    sim.springStiffness = STIFFNESS_SOFT;
    sim.springConnectRadius = R * 0.8;
    sim.springBreakRadius = R;
    sim.maxSpringLength = 1.2 * R;
    sim.maxCollisionVelocity = 2;
    await sim.init();

    // Particles in [0,1] space
    const data = new Float32Array(NUM_PARTICLES * 6);
    const cols = Math.ceil(Math.sqrt(NUM_PARTICLES));
    const rows = Math.ceil(NUM_PARTICLES / cols);
    const gridW = (cols - 1) * SPACING;
    const gridH = (rows - 1) * SPACING;
    const cx = 0.5, cy = 0.5;
    for (let i = 0; i < NUM_PARTICLES; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const o = i * 6;
      data[o] = cx - gridW / 2 + col * SPACING + (row % 2) * SPACING * 0.5;
      data[o + 1] = cy - gridH / 2 + row * SPACING;
    }
    sim.uploadParticles(data);

    // Pre-compute rest lengths from initial grid
    const springs = buildInitialSprings(data);
    sim.initRestLengthsFromSprings(springs);

    const renderer = new MetaballRenderer(device, format);
    await renderer.init();
    renderer.setParams({
      numParticles: NUM_PARTICLES,
      smoothingRadius: SMOOTHING_RADIUS,
      threshold: 0.5,
      aspectRatio: canvas.width / canvas.height,
      resX: canvas.width,
      resY: canvas.height,
      cameraCenterX: 0.5,
      cameraCenterY: 0.5,
      cameraZoom: CAMERA_ZOOM,
    });
    renderer.createBindGroup(sim.getParticleBuffer());
    sim.updateUniforms();
    simRef.current = sim;
    rendererRef.current = renderer;
  }, []);

  // Track center of mass for camera
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

      // Update state → spring parameters
      if (state === 'fluid') {
        s.springStiffness = 0;
      } else {
        s.springStiffness = state === 'elastic' ? STIFFNESS_STRONG : STIFFNESS_SOFT;
      }

      // User control
      let ctrlX = 0, ctrlY = 0;
      if (keys.left) ctrlX -= 1;
      if (keys.right) ctrlX += 1;
      if (keys.up) ctrlY += 1;
      if (keys.down) ctrlY -= 1;

      if (ctrlX !== 0 || ctrlY !== 0) {
        const len = Math.sqrt(ctrlX * ctrlX + ctrlY * ctrlY);
        if (len > 0) { ctrlX /= len; ctrlY /= len; }
        s.setControl(ctrlX, ctrlY, CONTROL_POWER);
      } else {
        s.clearControl();
      }

      // Spin
      if (spin !== 'none') {
        s.controlDirX = spin === 'left' ? -1 : 1;
        s.controlDirY = 0;
        s.controlStrength = SPIN_POWER;
      }

      // Gravity from sensor
      const gx = gxRef.current;
      const gy = gyRef.current;
      if (gx !== 0 || gy !== 0) {
        s.setGravity(-gx * 0.01, gy * 0.01 - 1.5);
      }

      // Shake → impulse
      if (shakeRef.current) {
        s.applyImpulse(0.5, 0.5, 0.3, 5, -5);
        shakeRef.current = 0;
      }

      s.updateUniforms();
      s.step();
      r.render(c, 0);
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
