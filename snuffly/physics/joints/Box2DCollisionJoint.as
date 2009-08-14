package snuffly.physics.joints
{
	import snuffly.physics.core.*;
	import Box2D.Dynamics.*;
	import Box2D.Collision.Shapes.*;
	import Box2D.Common.Math.*;
	import flash.display.Sprite;
	//Взаимодействие с Box2D миром(и шаг симуляции Box2D)
	public class Box2DCollisionJoint implements IDrawable , IJoint
	{
		public var friction:Number;				//Трение
		public var restitution:Number;			//Упругость
		public var r:Number;					//Радиус частиц
		public var m:Number;					//Масса частиц(для рассчёта импульса)
		public var world:b2World;				//Box2D мир(уже подготовленный)
		protected var pt:Vector.<BaseParticle>;
		protected var ptCount:int;
		protected var sensors:Vector.<b2Body>;				//Объекты-сенсоры в Box2D, соответсвующие частицам
		protected var sensorContacts:Vector.<Array>;		//Стек контактов i-го сенсора
		protected var sensorContactResults:Vector.<Array>;	//Стек результатов контактов i-го сенсора
		protected var minv:Number;
		
		static protected const RAD_TO_DEG=180/Math.PI;
		
		public var visible:Boolean;		//Рисуем ли?
		// ========================================================== //
		public function Box2DCollisionJoint(particles:IParticleGroup,world:b2World,r:Number,m:Number=0.1,friction:Number=0.95,restitution:Number=0.2, visible=true):void
		{
			this.friction=friction;
			this.restitution=restitution;
			this.r=r;
			this.m=m;
			minv=1/m;
			this.world=world;
			this.visible=visible;
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt=event.particles;
			ptCount=pt.length;
			sensors=new Vector.<b2Body>();
			sensorContacts=new Vector.<Array>();
			sensorContactResults=new Vector.<Array>();
			
			var i:int;
			var body:b2Body;
			var bodyDef:b2BodyDef;
			var circleDef:b2CircleDef;
			var density:Number=m/(Math.PI*r*r);
			for(i=0;i<ptCount;i++)
			{
				bodyDef = new b2BodyDef();
				bodyDef.fixedRotation=true;
				bodyDef.userData=i;
				circleDef = new b2CircleDef();
				circleDef.radius = r;
				circleDef.density = density;
				circleDef.friction = friction;
				circleDef.restitution = restitution;
				//circleDef.isSensor = true;
				circleDef.filter.groupIndex = -1;		//игнорируем другие частицы
				body = world.CreateBody(bodyDef);
				body.CreateShape(circleDef);
				body.SetMassFromShapes();
				body.hasGravity=false;
				sensors[i]=body;
				sensorContactResults[i]=new Array();
				sensorContacts[i]=new Array();
			}
			world.SetContactListener(new SensorContactListener(sensorContacts,sensorContactResults));
		}
		// ========================================================== //
		//Частицы уничтожены
		protected function particlesKilled(event:ParticleGroupEvent):void
		{
			pt=null;
			ptCount=0;
			
										//TODO: Сделать удаление объектов из мира!!!!!
										
		}
		// ========================================================== //
		public function beforeApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
		public function applyJoint(iteration:int,iterations:int):void
		{
			if(iteration+1==iterations)
			{
				var p:BaseParticle;
				var s:b2Body;
				var i:int;
				var vec:b2Vec2;
				
				for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					s=sensors[i];
					s.SetPosition(new b2Vec2(p.xx,p.yy));
					s.SetLinearVelocity(new b2Vec2(p.vx,p.vy));
					s.ApplyForceToCenter(p.nx*m,p.ny*m);
				}
				world.Step(0.01, 5,10);
				/*for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					s=sensors[i];
					vec=s.GetPosition();
					p.xx=vec.x;
					p.yy=vec.y;
					vec=s.GetLinearVelocity();
					p.vx=vec.x;
					p.vy=vec.y;
				}*/
				var contactStack:Array;
				var currentContact:SensorContactPoint;
				var currentContactResult:SensorContactResult;
				var separation:Number;
				var normal:b2Vec2;
				var dx:Number;
				var dy:Number;
				var nx:Number;
				var ny:Number;
				var ts:Number;
				var ns:Number;
				for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					s=sensors[i];
					/*contactStack=sensorContacts[i];
					dx=0;
					dy=0;
					currentContact = contactStack.pop();
					while(currentContact)
					{
						normal=currentContact.normal;
						separation = currentContact.separation;
						dx+=normal.x*separation;
						dy+=normal.y*separation;
						currentContact = contactStack.pop();
					}
					p.xx+=dx;
					p.yy+=dy;*/
					contactStack=sensorContactResults[i];
					if(contactStack.length>0)
					{
						vec=s.GetPosition();
						p.xx=vec.x;
						p.yy=vec.y;
					}
					dx=0;
					dy=0;
					//contactStack=sensorContactResults[i];
					currentContactResult = contactStack.pop();
					while(currentContactResult)
					{
						normal=currentContactResult.normal;
						nx=normal.x;
						ny=normal.y;
						ns=currentContactResult.normalImpulse;
						ts=currentContactResult.tangentImpulse;
						dx=nx*ns+ny*ts;
						dy=ny*ns-nx*ts;
						currentContactResult = contactStack.pop();
					}
					p.vx+=dx*minv;
					p.vy+=dy*minv;
				}
			}
		}
		// ========================================================== //
		public function afterApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
		//Рисуем объекты
		public function draw():void
		{
			if (visible)
			{
				var body:b2Body;
				var userdata:*;
				var pos:b2Vec2;
				var sprite:Sprite;
				
				for(body = world.GetBodyList(); body; body = body.GetNext())
				{
					userdata=body.GetUserData();
					if(userdata is Sprite)
					{
						sprite = userdata as Sprite;
						pos=body.GetPosition();
						sprite.x = pos.x;
						sprite.y = pos.y;
						sprite.rotation = body.GetAngle() * RAD_TO_DEG;
					}
				}
			}
		}
		// ========================================================== //
	}
}

import Box2D.Collision.Shapes.*;
import Box2D.Common.Math.*;
class SensorContactPoint
{
	public var separation:Number;
	public var position:b2Vec2;
	public var normal:b2Vec2;
	// ========================================================== //
	public function SensorContactPoint (separation:Number, position:b2Vec2, normal:b2Vec2)
	{
		this.separation = separation;
		this.position = position;
		this.normal = normal;
	}
	// ========================================================== //
}

import Box2D.Common.Math.*;
class SensorContactResult
{
	public var normal:b2Vec2;
	public var normalImpulse:Number;
	public var tangentImpulse:Number;
	// ========================================================== //
	public function SensorContactResult(normal:b2Vec2, normalImpulse:Number, tangentImpulse:Number)
	{
		this.normal = normal;
		this.normalImpulse = normalImpulse;
		this.tangentImpulse = tangentImpulse;
	}
	// ========================================================== //
}

import Box2D.Dynamics.*;
import Box2D.Collision.*;
import Box2D.Collision.Shapes.*;
import Box2D.Common.Math.*;
import Box2D.Dynamics.Contacts.*;
class SensorContactListener extends b2ContactListener
{
	public var sensorContacts:Vector.<Array>;
	public var sensorContactResults:Vector.<Array>;
	// ========================================================== //
	public function SensorContactListener(sensorContacts:Vector.<Array>,sensorContactResults:Vector.<Array>):void
	{
		this.sensorContacts=sensorContacts;
		this.sensorContactResults=sensorContactResults;
	}
	// ========================================================== //
	override public function Add(point:b2ContactPoint):void
	{
		var shape1:b2Shape = point.shape1;
		var shape2:b2Shape = point.shape2;
		var userdata:*;
		var sensorid:int;
		var separation:Number = point.separation;
		var position:b2Vec2 = point.position.Copy();
		var normal:b2Vec2 = point.normal.Copy();
		userdata = shape1.GetBody().GetUserData();
		if(userdata is int)
		{
			separation=0.1-separation;
			sensorid=int(userdata);
		}
		else
		{			
			userdata = shape2.GetBody().GetUserData();
			if(userdata is int)
			{
				separation-=0.1;
				sensorid=int(userdata);
			}
			else
				return;
		}
		
		//sensorContacts[sensorid].push(new SensorContactPoint(separation,position,normal));
	}
	// ========================================================== //
	override public function Result(point:b2ContactResult):void
	{
		var shape1:b2Shape = point.shape1;
		var shape2:b2Shape = point.shape2;
		var userdata:*;
		var sensorid:int;
		var normalImpulse:Number=point.normalImpulse;
		var tangentImpulse:Number=point.tangentImpulse;
		var normal:b2Vec2 = point.normal.Copy();
		userdata = shape1.GetBody().GetUserData();
		if(userdata is int)
		{
			normalImpulse=-normalImpulse;
			tangentImpulse=-tangentImpulse;
			sensorid=int(userdata);
		}
		else
		{			
			userdata = shape2.GetBody().GetUserData();
			if(userdata is int)
				sensorid=int(userdata);
			else
				return;
		}
		sensorContactResults[sensorid].push(new SensorContactResult(normal,normalImpulse,tangentImpulse));
	}
	// ========================================================== //
}