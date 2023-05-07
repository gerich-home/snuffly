import Box2DNamespace from '@ludic/box2d';

export type World = Box2DNamespace.b2World;
export type Body = Box2DNamespace.b2Body;
export type BodyType = Box2DNamespace.b2BodyType;
export type BodyDef = Box2DNamespace.b2BodyDef;
export type Vec2 = Box2DNamespace.b2Vec2;
export type PolygonShape = Box2DNamespace.b2PolygonShape;
export type FixtureDef = Box2DNamespace.b2FixtureDef;

export type Box2D = {
  b2World: typeof Box2DNamespace.b2World,
  b2Body: typeof Box2DNamespace.b2Body,
  b2BodyType: typeof Box2DNamespace.b2BodyType,
  b2BodyDef: typeof Box2DNamespace.b2BodyDef,
  b2Vec2: typeof Box2DNamespace.b2Vec2,
  b2PolygonShape: typeof Box2DNamespace.b2PolygonShape,
  b2FixtureDef: typeof Box2DNamespace.b2FixtureDef,
};
