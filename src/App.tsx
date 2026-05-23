import './App.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPHSimulation } from './gpu/simulation';
import { MetaballRenderer } from './gpu/renderer';
import { Controls } from './core/IPower';
import { mul } from './Particle';
import { scale } from './scale';

const NUM_PARTICLES = 2000;
const width = window.innerWidth;
const height = window.innerHeight;
const isMobile = (width * height < 800 * 800);

declare var GravitySensor: {
  new(options?: { frequency: number }): {
    x: number;
    y: number;
    z: number;
    addEventListener(type: 'reading', listener: () => void): void;
    removeEventListener(type: 'reading', listener: () => void): void;
    start(): void;
    stop(): void;
  };
};

function App() {
  const [spinsLeft, setSpinsLeft] = useState(false);
  const [spinsRight, setSpinsRight] = useState(false);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [up, setUp] = useState(false);
  const [down, setDown] = useState(false);
  const [turnElastic, setTurnElastic] = useState(false);
  const [turnJello, setTurnJello] = useState(false);
  const [turnFluid, setTurnFluid] = useState(false);
  const [soft, setSoft] = useState(false);
  const [touch, setTouch] = useState(false);
  const [gx, setGx] = useState(0);
  const [gy, setGy] = useState(0);
  const [sim, setSim] = useState<SPHSimulation | null>(null);
  const simRef = useRef<SPHSimulation | null>(null);
  const rendererRef = useRef<MetaballRenderer | null>(null);
  const controlsRef = useRef<Controls>({
    spins: 'none', left: false, right: false, down: false, up: false,
    turnFluid: false, turnElastic: false, turnJello: false,
    gravity: { x: 0, y: 9 / scale }, soft: false,
  });
  const contextRef = useRef<GPUCanvasContext | null>(null);
  const deviceRef = useRef<GPUDevice | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const keyMap: { [code: string]: (value: boolean) => void } = useMemo(() => ({
    'ArrowLeft': setSpinsRight,
    'ArrowRight': setSpinsLeft,
    'KeyW': setUp,
    'KeyA': setLeft,
    'KeyS': setDown,
    'KeyD': setRight,
    'KeyQ': setTurnJello,
    'KeyE': setTurnElastic,
    'KeyF': setTurnFluid,
    'Space': setSoft,
  }), []);

  const onTouchStart = useCallback(() => setTouch(true), []);
  const onTouchEnd = useCallback(() => setTouch(false), []);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const handler = keyMap[event.code];
    if (handler) handler(true);
  }, [keyMap]);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    const handler = keyMap[event.code];
    if (handler) handler(false);
  }, [keyMap]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    window.addEventListener("keyup", onKeyUp);
    return () => window.removeEventListener("keyup", onKeyUp);
  }, [onKeyUp]);

  useEffect(() => {
    window.addEventListener("touchstart", onTouchStart, false);
    return () => window.removeEventListener("touchstart", onTouchStart, false);
  }, [onTouchStart]);

  useEffect(() => {
    window.addEventListener("touchend", onTouchEnd, false);
    return () => window.removeEventListener("touchend", onTouchEnd, false);
  }, [onTouchEnd]);

  useEffect(() => {
    if (typeof GravitySensor !== 'undefined') {
      const sensor = new GravitySensor({ frequency: 60 });
      const listener = () => {
        setGx(sensor.x);
        setGy(sensor.y);
      };
      sensor.addEventListener("reading", listener);
      sensor.start();
      return () => {
        sensor.stop();
        sensor.removeEventListener("reading", listener);
      };
    }
  }, []);

  // Init WebGPU
  const canvasCallback = useCallback(async (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    if (canvasRef.current === canvas) return;
    canvasRef.current = canvas;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (!navigator.gpu) {
      console.error('WebGPU not supported');
      return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { console.error('No GPU adapter'); return; }

    const device = await adapter.requestDevice();
    deviceRef.current = device;

    const context = canvas.getContext('webgpu');
    if (!context) { console.error('No WebGPU context'); return; }
    contextRef.current = context;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: 'premultiplied',
    });

    const sim = new SPHSimulation(device, NUM_PARTICLES);
    await sim.init();
    simRef.current = sim;
    setSim(sim);

    const renderer = new MetaballRenderer(device, format);
    await renderer.init();
    renderer.setParams({
      numParticles: NUM_PARTICLES,
      smoothingRadius: sim.smoothingRadius,
      threshold: 0.65,
      aspectRatio: canvas.width / canvas.height,
      resX: canvas.width,
      resY: canvas.height,
    });
    renderer.createBindGroup(sim.getParticleBuffer());
    rendererRef.current = renderer;
  }, []);

  // Update controls Ref
  useEffect(() => {
    const gravityScale = 0.5 / (9.8 * scale);
    controlsRef.current = {
      spins: touch ? 'left' : (
        (spinsLeft === spinsRight) ? 'none' : (spinsRight ? 'right' : 'left')
      ),
      down, left, right, up,
      turnFluid, turnElastic, turnJello,
      gravity: mul({ x: -gx, y: gy }, gravityScale),
      soft,
    };
  }, [spinsLeft, spinsRight, left, right, up, down, turnFluid, turnElastic, turnJello, touch, gx, gy, soft]);

  // Apply controls to sim each frame
  useEffect(() => {
    if (!sim) return;

    let running = true;
    let lastTime = performance.now();

    function frame(time: number) {
      if (!running) return;
      lastTime = time;

      if (!simRef.current || !rendererRef.current || !contextRef.current) {
        requestAnimationFrame(frame);
        return;
      }

      const c = controlsRef.current;
      const controlPower = 0.6;

      if (c.left || c.right || c.up || c.down) {
        const fx = (c.left ? -controlPower : (c.right ? controlPower : 0));
        const fy = (c.up ? controlPower : (c.down ? -controlPower : 0));
        simRef.current.applyImpulse(0.5, 0.5, 0.3, fx, fy);
      }

      const g = c.gravity;
      if (g.x !== 0 || g.y !== 0) {
        simRef.current.setGravity(g.x, g.y);
      }

      simRef.current.step();
      rendererRef.current.render(contextRef.current!);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return () => { running = false; };
  }, [sim]);

  // Touch move for impulse
  useEffect(() => {
    if (!sim) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPos(clientX: number, clientY: number) {
      const r = canvas!.getBoundingClientRect();
      return {
        x: (clientX - r.left) / r.width,
        y: 1 - (clientY - r.top) / r.height,
      };
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!simRef.current) return;
      const t = e.changedTouches[0];
      const p = getCanvasPos(t.clientX, t.clientY);
      simRef.current.applyImpulse(p.x, p.y, 0.08, 0.4, 0.4);
    }

    function onMouseMove(e: MouseEvent) {
      if (!simRef.current) return;
      const p = getCanvasPos(e.clientX, e.clientY);
      simRef.current.applyImpulse(p.x, p.y, 0.08, 0.4, 0.4);
    }

    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('mousemove', onMouseMove);

    return () => {
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [sim]);

  return (
    <>
      <div style={{ position: 'absolute', animation: 'fadeOut 7s', animationFillMode: 'forwards' }}>
        {isMobile ? null : (
          <>
            <div>WASD - move jello</div>
            <div>left/right arrows - spin jello</div>
            <div>Q - make sticky & plastic</div>
            <div>E - make non-sticky & elastic</div>
          </>
        )}
      </div>
      <canvas
        ref={canvasCallback}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </>
  );
}

export default App;
