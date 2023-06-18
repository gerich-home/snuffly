import './App.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBox2D } from './useBox2D';
import { TestLevel } from './TestLevel';
import { type GravitySensor as GravitySensorType } from 'motion-sensors-polyfill';
import { Controls } from './core/IPower';
import { mul } from './Particle';

declare var GravitySensor: typeof GravitySensorType;

const width = window.innerWidth;
const height = window.innerHeight;
const isMobile = (width * height < 800 * 800);

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
  const [touch, setTouch] = useState(false);
  const [gx, setGx] = useState(0);
  const [gy, setGy] = useState(0);

  const keyMap: { [code: string]: (value: boolean) => void } = useMemo(() => ({
    'KeyA': setLeft,
    'KeyD': setRight,
    'ArrowLeft': setSpinsRight,
    'ArrowRight': setSpinsLeft,
    'KeyW': setUp,
    'KeyS': setDown,
    'KeyE': setTurnElastic,
    'KeyF': setTurnFluid,
    'KeyJ': setTurnJello,
  }), []);

  const onTouchStart = () => {
    setTouch(true);
  };

  const onTouchEnd = () => {
    setTouch(false);
  };

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const handler = keyMap[event.code];
    if (handler) {
      handler(true);
    }
  }, [keyMap]);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    const handler = keyMap[event.code];
    if (handler) {
      handler(false);
    }
  }, [keyMap]);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);

  useEffect(() => {
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onKeyUp]);


  useEffect(() => {
    window.addEventListener("touchstart", onTouchStart, false);

    return () => {
      window.removeEventListener("touchstart", onTouchStart, false);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("touchend", onTouchEnd, false);

    return () => {
      window.removeEventListener("touchend", onTouchEnd, false);
    };
  }, []);

  useEffect(() => {
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
  });

  const Box2D = useBox2D();

  const testLevel = useMemo(() => {
    if (!Box2D) {
      return;
    }

    return new TestLevel(Box2D, width, height, isMobile);
  }, [Box2D]);

  const controls = useMemo(() => {
    const gravityScale = 0.5 / 9.8;

    const controls: Controls = {
      spins: touch ? 'left' : (
        (spinsLeft === spinsRight) ?
          'none' :
          (spinsRight ? 'right' : 'left')
      ),
      down,
      left,
      right,
      up,
      turnFluid,
      turnElastic,
      turnJello,
      gravity: mul({
        x: -gx,
        y: gy,
      }, gravityScale),
    };

    return controls;
  }, [spinsLeft, spinsRight, left, right, up, down, turnFluid, turnElastic, turnJello, touch, gx, gy]);

  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const canvasRef = useCallback((node: HTMLCanvasElement) => {
    if (node !== null) {
      setCanvas(node);
    }
  }, []);

  const context = useMemo(() => {
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    return context;
  }, [canvas]);

  const simulateToTime = useCallback((newCurrentTime: number) => {
    if (!testLevel) {
      return;
    }

    testLevel.step(newCurrentTime, controls);
  }, [testLevel, controls]);

  const draw = useCallback(() => {
    if (!testLevel || !context) {
      return;
    }

    context.clearRect(0, 0, width, height);

    context.save();
    context.fillStyle = '#000000';

    testLevel.draw(context);

    context.restore();
  }, [testLevel, context]);

  const [startTime, setStartTime] = useState<number | undefined>();

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(setStartTime);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const render = (time: number) => {
      if (startTime !== undefined) {
        const newCurrentTime = time - startTime;
        simulateToTime(newCurrentTime);
        draw();
      }

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [simulateToTime, draw, startTime]);

  useEffect(() => {
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  }, [canvas]);

  return (
    <>
      <div style={{ position: 'absolute', animation: 'fadeOut 7s', animationFillMode: 'forwards' }}>
        <div>space - spin jello</div>
        <div>arrows - move jello</div>
        <div>E - make elastic & non-sticky</div>
        <div>J - make plastic</div>
        <div>ctrl - relax</div>
      </div>
      <canvas ref={canvasRef} />
    </>
  );
}

export default App;
