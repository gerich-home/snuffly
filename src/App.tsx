import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBox2D } from './useBox2D';
import { TestLevel } from './TestLevel';

const width = window.innerWidth;
const height = window.innerHeight;

function App() {

  const [spins, setSpins] = useState(false);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [up, setUp] = useState(false);
  const [down, setDown] = useState(false);
  const [turnElastic, setTurnElastic] = useState(false);
  const [turnJello, setTurnJello] = useState(false);
  const [turnFluid, setTurnFluid] = useState(false);
  const [touch, setTouch] = useState(false);

  const onMouseDown = () => {
    setTouch(true);
  };

  const onMouseUp = () => {
    setTouch(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      setSpins(true);
    }
    if (event.code === 'ArrowLeft') {
      setLeft(true);
    }
    if (event.code === 'ArrowRight') {
      setRight(true);
    }
    if (event.code === 'ArrowUp') {
      setUp(true);
    }
    if (event.code === 'ArrowDown') {
      setDown(true);
    }
    if (event.code === 'KeyE') {
      setTurnElastic(true);
    }
    if (event.code === 'KeyF') {
      setTurnFluid(true);
    }
    if (event.code === 'KeyJ') {
      setTurnJello(true);
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      setSpins(false);
    }
    if (event.code === 'ArrowLeft') {
      setLeft(false);
    }
    if (event.code === 'ArrowRight') {
      setRight(false);
    }
    if (event.code === 'ArrowUp') {
      setUp(false);
    }
    if (event.code === 'ArrowDown') {
      setDown(false);
    }
    if (event.code === 'KeyE') {
      setTurnElastic(false);
    }
    if (event.code === 'KeyF') {
      setTurnFluid(false);
    }
    if (event.code === 'KeyJ') {
      setTurnJello(false);
    }
  };
  
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  
  useEffect(() => {
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  
  
  useEffect(() => {
    window.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, []);
  
  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const Box2D = useBox2D();

  const [testLevel, setTestLevel] = useState<TestLevel>();

  useEffect(() => {
    if (!Box2D) {
      return;
    }

    const testLevel = new TestLevel(Box2D, width, height);
    setTestLevel(testLevel);
  }, [Box2D]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback((ctx: CanvasRenderingContext2D, deltaTime: number) => {
    if (!testLevel) {
      return;
    }

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.fillStyle = '#000000';

    const controls = {
      spins,
      down,
      left,
      right,
      up,
      turnFluid,
      turnElastic,
      turnJello,
      touch,
    };

    for(let i = 0; i < 10; i++) {
      testLevel.step(deltaTime / 1000, controls);
    }
    testLevel.draw(ctx);

    ctx.restore();
  }, [testLevel, spins, left, right, up, down, turnFluid, turnElastic, turnJello, touch]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    let previousTime: number | undefined = undefined;
    let animationFrameId: number;

    const render = (time: number) => {
      if (previousTime !== undefined) {
        const deltaTime = time - previousTime;
        draw(context, deltaTime);
      }

      previousTime = time;
      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [draw]);

  useEffect(() => {
    if(canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, [canvasRef]);

  return (
    <canvas ref={canvasRef} />
  );
}

export default App;
