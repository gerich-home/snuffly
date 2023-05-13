import { useCallback, useEffect, useRef, useState } from 'react';
import { useBox2D } from './useBox2D';
import { TestLevel } from './TestLevel';

function App() {
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

    for(let i = 0; i < 3; i++) {
      testLevel.step(deltaTime / 500);
    }
    testLevel.draw(ctx);

    ctx.restore();

    setNSteps(nSteps + 1);
  }, [testLevel, nSteps]);


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
      <canvas width={1200} height={600} ref={canvasRef} />
    </div>
  );
}

export default App;
