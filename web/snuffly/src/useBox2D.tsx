import { useEffect, useState } from 'react';
import { Box2D } from './Box2D';

const Box2DLoader = (window as any).Box2D as () => Promise<Box2D>;

export function useBox2D() {
  const [Box2D, setBox2D] = useState<Box2D | null>(null);

  useEffect(() => {
    async function loadBox2D() {
      const box2d = await Box2DLoader();
      
      setBox2D(box2d);
    }

    loadBox2D();
  }, []);

  return Box2D;
}
