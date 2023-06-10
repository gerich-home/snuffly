import { useCallback, useEffect, useRef, useState } from 'react';
import { useBox2D } from './useBox2D';
import { TestLevel } from './TestLevel';

function App() {
  const [spins, setSpins] = useState(false);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [up, setUp] = useState(false);
  const [down, setDown] = useState(false);
  const [turnElastic, setTurnElastic] = useState(false);
  const [turnJello, setTurnJello] = useState(false);
  const [turnFluid, setTurnFluid] = useState(false);

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

  const Box2D = useBox2D();

  const [testLevel, setTestLevel] = useState<TestLevel>();

  useEffect(() => {
    if (!Box2D) {
      return;
    }

    const testLevel = new TestLevel(Box2D);
    setTestLevel(testLevel);
  }, [Box2D]);

  const [nSteps, setNSteps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback((ctx: CanvasRenderingContext2D, deltaTime: number) => {
    if (!testLevel) {
      return;
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#000000';

    for(let i = 0; i < 10; i++) {
      testLevel.step(deltaTime / 1000, {
        spins,
        down,
        left,
        right,
        up,
        turnFluid,
        turnElastic,
        turnJello,
      });
    }
    testLevel.draw(ctx);

    ctx.restore();

    setNSteps(nSteps + 1);
  }, [testLevel, nSteps, spins, left, right, up, down, turnFluid, turnElastic, turnJello]);


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

  return (
    <div className="App">
      <canvas width={800} height={600} ref={canvasRef} />
    </div>
  );
}

export default App;
