package snuffly.test
{
	import flash.display.Shape;
	import flash.display.Sprite;
	import flash.display.Bitmap;
	import snuffly.physics.core.*;
	import snuffly.physics.joints.*;
	import snuffly.physics.powers.*;
	import snuffly.physics.particles.*;
	import Box2D.Dynamics.*;
	import Box2D.Collision.*;
	import Box2D.Collision.Shapes.*;
	import Box2D.Common.Math.*;
	import Box2D.Common.*;
	
	//Описание физического мир
	public class TestParticleSystem extends ParticleSystem
	{
		public var container:Sprite;
		public var canvas:Shape;
		public var water:Shape;
		public var fluidbmp:Bitmap
		private var output:Vector.<BaseParticle>;
		// ========================================================== //
		public function TestParticleSystem(prepareDraw:Function,canvas:Shape,water:Shape,fluidbmp:Bitmap,container:Sprite=null):void
		{
			this.canvas=canvas;
			this.water=water;
			this.fluidbmp=fluidbmp;
			this.container=container;
			super(prepareDraw);		//тут вызывается init() !
		}
		// ========================================================== //
		//Формируем систему
		protected override function init():void
		{
			particles=new ParticleGroup();		//Группа для всех точек системы
			pt=particles.getParticles();
			
			//Стены
			/*joints.push(new BoundJoint(canvas,particles,0,0,   0,1 ));	//Работает для всей системы точек
			joints.push(new BoundJoint(canvas,particles,0,0,   1,0 ));
			joints.push(new BoundJoint(canvas,particles,0,400, 0,-1));
			joints.push(new BoundJoint(canvas,particles,550,0, -1,0));
			*/
			
			//Создаём группу частиц(тут нет особого резона это делать,
			//но просто если бы были другие группы частиц, то необходимо)
			var g1:IParticleGroup;
			g1=new ParticleGroup();
			//Для простоты все дальнейшие функции будут добавлять частицы именно в g1
			output=g1.getParticles();
			
			var jello:IParticleGroup;
			jello=createJello(200,20,1,0,0,550,232);
			powers.push(new KeyboardPower(jello,container,0.18,0.1,0.1));
			createBox2DWorld(g1);
			jello.notifyGroupChanged();
			
			//powers.push(new FluidFrictionPower(g1,0.02));
			powers.push(new Gravity(g1,0.2));
			powers.push(new MousePower(g1,60,0.3,container));
			g1.notifyGroupChanged();		//событие изменения группы частиц
			
			iterations=1;	//=1 потому что нет таких Joint'ов которые надо несколько раз прогонять
		}
		// ========================================================== //
		private function createJello(count:int = 150, r:Number = 20, rest_density:Number = 1 , xmin:Number=0, ymin:Number=300, xmax:Number=550, ymax:Number=400):IParticleGroup
		{
			var i:int;
			var jellopt:Vector.<BaseParticle>=new Vector.<BaseParticle>;
			var jellogroup:IParticleGroup;
            var p:BaseParticle;
            var jello:Jello;
			
            for (i=0;i<count;i++)
            {
				p=new FluidParticle(xmin+(xmax-xmin)*Math.random(),ymin+(ymax-ymin)*Math.random(),false,30,null,(uint(Math.random()*2)==0)?0xFFEE00:0xFF7700);
                pt.push(p);
				jellopt.push(p);
				output.push(p);
			}
			
			jellogroup=new ParticleGroup(jellopt);
			jello=new Jello(fluidbmp,jellogroup,r,rest_density,0xB<<30);
			
			
			addDrawablePower(jello);
			jellogroup.notifyGroupChanged();
			return jello;
		}
		// ========================================================== //
		private function createBox2DWorld(g:IParticleGroup):void
		{
			var world:b2World;
			var worldAABB:b2AABB;
			
			var body:b2Body;
			var bodyDef:b2BodyDef;
			var boxDef:b2PolygonDef;
			
			worldAABB= new b2AABB();
			worldAABB.lowerBound.Set(-100.0*b2Settings.b2_pixelScale, -100.0*b2Settings.b2_pixelScale);
			worldAABB.upperBound.Set(100.0*b2Settings.b2_pixelScale, 100.0*b2Settings.b2_pixelScale);
			
			// Define the gravity vector
			var gravity:b2Vec2;
			gravity = new b2Vec2(0.0, 10*b2Settings.b2_pixelScale);
			
			world = new b2World(worldAABB, gravity, true);
			
			/*var dbgDraw:b2DebugDraw = new b2DebugDraw();
			dbgDraw.SetSprite(container);
			dbgDraw.SetDrawScale(1.0);
			dbgDraw.SetFillAlpha(0.0);
			dbgDraw.SetLineThickness(1.0);
			dbgDraw.SetFlags(0xFFFFFFFF);
			world.SetDebugDraw(dbgDraw);*/
			
			// Add ground body
			bodyDef = new b2BodyDef();
			bodyDef.position.Set(10*b2Settings.b2_pixelScale, 12*b2Settings.b2_pixelScale);
			boxDef = new b2PolygonDef();
			boxDef.SetAsBox(256*3/*30*b2Settings.b2_pixelScale*/, 128/*3*b2Settings.b2_pixelScale*/);
			boxDef.friction = 0.3;
			boxDef.density = 0;
			bodyDef.userData = new Ground();
			bodyDef.userData.width =   512*3//2 * 30 * b2Settings.b2_pixelScale; 
			bodyDef.userData.height =  256//2 * 3 * b2Settings.b2_pixelScale; 
			container.addChild(bodyDef.userData);
			body = world.CreateBody(bodyDef);
			body.CreateShape(boxDef);
			body.SetMassFromShapes();
			
			var i:int;
			var sizeX:Number;
			var sizeY:Number;
			for(i=0;i<1;i++)
			{
				bodyDef = new b2BodyDef();
				sizeX = (Math.random() + 0.5)* b2Settings.b2_pixelScale;
				sizeY = (Math.random() + 0.5)* b2Settings.b2_pixelScale;
				bodyDef.position.x = (Math.random() * 15 + 5)* b2Settings.b2_pixelScale;
				bodyDef.position.y = (Math.random() * 10)* b2Settings.b2_pixelScale-sizeY-128;
				bodyDef.angle = Math.random() * 2*Math.PI;
				boxDef = new b2PolygonDef();
				boxDef.SetAsBox(sizeX, sizeY);
				boxDef.density = 1.0/(b2Settings.b2_pixelScale*b2Settings.b2_pixelScale);
				boxDef.friction = 0.5;
				boxDef.restitution = 0.2;
				bodyDef.userData = new Box();
				bodyDef.userData.width = sizeX * 2; 
				bodyDef.userData.height = sizeY * 2; 
				container.addChild(bodyDef.userData);
				body = world.CreateBody(bodyDef);
				body.CreateShape(boxDef);
				body.SetMassFromShapes();
			}
			
			var Box2DJoint:Box2DCollisionJoint=new Box2DCollisionJoint(g,world,1,5);
			addDrawableJoint(Box2DJoint);
		}
		// ========================================================== //
	}
}