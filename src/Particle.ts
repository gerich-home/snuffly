export type Vector = {
  readonly x: number;
  readonly y: number;
};

export const zero: Vector = {
  x: 0,
  y: 0
};

export function len(v: Vector) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function len2(v: Vector) {
  return v.x * v.x + v.y * v.y;
}

export function mul(p: Vector, a: number): Vector {
  return { x: p.x * a, y: p.y * a };
}

export function add(v1: Vector, v2: Vector): Vector {
  return { x: v1.x + v2.x, y: v1.y + v2.y };
}

export function sub(v1: Vector, v2: Vector): Vector {
  return { x: v1.x - v2.x, y: v1.y - v2.y };
}

export function dot(v1: Vector, v2: Vector): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function fromB2D(v: { x: number; y: number }) {
  return { x: v.x, y: v.y };
}

export function asB2D<T>(box2d: any, v: Vector, action: (b2v: any) => T): T {
  let b2v: any = null;
  try {
    b2v = new box2d.b2Vec2(v.x, v.y);
    return action(b2v);
  } finally {
    if (b2v) box2d.destroy(b2v);
  }
}

export enum ParticleState {
  Sticky = 0,
  Elastic = 1,
  Fluid = 2,
};
