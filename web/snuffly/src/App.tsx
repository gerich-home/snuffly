import './App.css';
import { useEffect, useState } from 'react';
import { World, Body, Vec2 } from './Box2D';
import { useBox2D } from './useBox2D';
import { useAnimationFrame } from './useAnimationFrame';

function App() {
  const Box2D = useBox2D();

  const [world, setWorld] = useState<World>();
  const [body, setBody] = useState<Body>();

  useEffect(()=> {
    if(!Box2D) {
      return;
    }

    const gravity = new Box2D.b2Vec2(0.0, -10.0);
    const world = new Box2D.b2World(gravity);

    const groundBodyDef = new Box2D.b2BodyDef();
    groundBodyDef.position.Set(0, -10);
    const groundBody = world.CreateBody(groundBodyDef);

    const groundBox = new Box2D.b2PolygonShape();
    groundBox.SetAsBox(50, 10);

    groundBody.CreateFixture(groundBox, 0);

    const bodyDef = new Box2D.b2BodyDef();
    bodyDef.type = 2;
    bodyDef.position.Set(0, 4);
    bodyDef.allowSleep = true;
    const body = world.CreateBody(bodyDef);
    
    const dynamicBox = new Box2D.b2PolygonShape();
    dynamicBox.SetAsBox(1, 1);


    const fixtureDef = new Box2D.b2FixtureDef();

    fixtureDef.shape = dynamicBox;
    fixtureDef.density = 1.0;
    fixtureDef.friction = 0.3;

    body.CreateFixture(fixtureDef);

    setWorld(world);
    setBody(body);
  }, [Box2D]);

  const [pos, setPos] = useState<Vec2>();
  const [angle, setAngle] = useState<number>();

  const [nSteps, setNSteps] = useState(0);
  
  useAnimationFrame(dt => {
    if (!world) {
      return;
    }

    if (!body?.IsAwake()) {
      return;
    }


    world.Step(dt / 1000, 8, 3);
    
    const position = body?.GetPosition();
    const angle = body?.GetAngle();

    setPos(position);
    setAngle(angle);
    setNSteps(nSteps + 1);
  });
  
  return (
    <div className="App">
      <header className="App-header">
        <div>
          <div>{Box2D !== null ? 'Loaded': 'Loading'}</div>
          <div>x {Math.round((pos?.x || 0) * 100) / 100}</div>
          <div>y {Math.round((pos?.y || 0) * 100) / 100}</div>
          <div>angle {Math.round((angle || 0) * 100) / 100}</div>
          <div>steps {nSteps}</div>
        </div>
      </header>
    </div>
  );
}

export default App;
