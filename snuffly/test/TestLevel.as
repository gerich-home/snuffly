package snuffly.test
{
	import flash.display.Bitmap;
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.display.DisplayObjectContainer;
	import snuffly.game.core.*;
	import snuffly.game.drawers.*;
	import snuffly.game.powers.*;
	import snuffly.game.utils.*;
	import Box2D.Dynamics.*;
	import Box2D.Collision.Shapes.*;
	import Box2D.Collision.*;
	import Box2D.Common.Math.*;
	import Box2D.Common.*;
	//Тестовый уровень
	public class TestLevel extends Level
	{
		private var container:DisplayObjectContainer;
		private var fluidbmp:Bitmap;
		
		private var currentGroup:IParticleGroup;
		// ========================================================== //
		public function TestLevel(container:DisplayObjectContainer,fluidbmp:Bitmap):void
		{
			this.container=container;
			this.fluidbmp=fluidbmp;
			
			super();
		}
		// ========================================================== //
		//Создаём мир
		public override function init():void
		{
			var jello:Jello;
			var cmCalc:CMCalculator;
			world=createBox2DWorld();
			fillWorld();
			currentGroup=new ParticleGroup();
			jello=createJello(200,20,8);
			addDrawablePower(jello);
			cmCalc=new CMCalculator(jello);
			addPower(cmCalc);
			addPower(new KeyboardPower(jello,cmCalc,container,0.5*0.01,5*0.01,5*0.01,0.12*0.01*b2Settings.b2_pixelScale,0.3*0.01*b2Settings.b2_pixelScale,0.3*0.01*b2Settings.b2_pixelScale));
			//addPower(new MousePower(currentGroup,60,3*0.01*b2Settings.b2_pixelScale,container));
			var spiteCenterX:Number=0.5*container.stage.stageWidth;
			var spiteCenterY:Number=0.5*container.stage.stageHeight;
			var atannorm:Number=2/Math.PI;
			addDrawable(new CameraControl(cmCalc,
										  function(cmX:Number,cmY:Number){
											  			var offsetX:Number=spiteCenterX-cmX-jello.offsetX;
											  			var offsetY:Number=spiteCenterY-cmY-jello.offsetY;
											  			var atanX:Number=Math.abs(Math.atan(offsetX*0.2)*atannorm);
											  			var atanY:Number=Math.abs(Math.atan(offsetY*0.2)*atannorm);
														offsetX*=0.01+atanX*0.09;
														offsetY*=0.01+atanY*0.09;
														jello.offsetX+=offsetX;
														jello.offsetY+=offsetY;
														container.x=jello.offsetX;
														container.y=jello.offsetY;
													}));
			currentGroup.notifyGroupChanged();
			jello.notifyGroupChanged();
			velocityIterations=1;
		}
		// ========================================================== //
		private function createJello(count:int = 200, r:Number = 20, b2r:Number = 1, m:Number = 0.01, friction:Number = 1, restitution:Number = 0.1, rest_density:Number = 1 , xmin:Number=100, ymin:Number=0, xmax:Number=450, ymax:Number=200):Jello
		{
			var i:int;
			var jellopt:Vector.<b2Body>=new Vector.<b2Body>;
			var jellogroup:IParticleGroup;
            var jello:Jello;
			
			var i:int;
			var body:b2Body;
			var bodyDef:b2BodyDef;
			var circleDef:b2CircleDef;
			var density:Number=m/(Math.PI*b2r*b2r);
			var bmp1:BitmapData=FluidParticle.drawBubble(1.5*r,0xFFEE00);
			var bmp2:BitmapData=FluidParticle.drawBubble(1.5*r,0xFF7700);
			
			for(i=0;i<count;i++)
			{
				bodyDef = new b2BodyDef();
				bodyDef.fixedRotation=true;
				bodyDef.userData = ((uint(Math.random()*2)==0)?bmp1:bmp2);
				bodyDef.position.x = xmin+(xmax-xmin)*Math.random();
				bodyDef.position.y = ymin+(ymax-ymin)*Math.random();
				circleDef = new b2CircleDef();
				circleDef.radius = b2r;
				circleDef.density = density;
				circleDef.friction = friction;
				circleDef.restitution = restitution;
				circleDef.filter.groupIndex = -1;		//игнорируем другие частицы
				body = world.CreateBody(bodyDef);
				body.CreateShape(circleDef);
				body.SetMassFromShapes();
				jellopt.push(body);
				currentGroup.getParticles().push(body);
			}
			
			jellogroup=new ParticleGroup(jellopt);
			jello=new Jello(fluidbmp,jellogroup,r,1.5*r,rest_density,0xB<<30);
			
			
			jellogroup.notifyGroupChanged();
			return jello;
		}
		// ========================================================== //
		private function createBox2DWorld():b2World
		{
			var world:b2World;
			var worldAABB:b2AABB;
			
			worldAABB= new b2AABB();
			worldAABB.lowerBound.Set(-100.0*b2Settings.b2_pixelScale, -100.0*b2Settings.b2_pixelScale);
			worldAABB.upperBound.Set(100.0*b2Settings.b2_pixelScale, 100.0*b2Settings.b2_pixelScale);
			
			// Define the gravity vector
			var gravity:b2Vec2;
			gravity = new b2Vec2(0.0, 0.2*b2Settings.b2_pixelScale);
			
			world = new b2World(worldAABB, gravity, true);
			/*
			var dbgDraw:b2DebugDraw = new b2DebugDraw();
			dbgDraw.SetSprite(container);
			dbgDraw.SetDrawScale(1.0);
			dbgDraw.SetFillAlpha(0.0);
			dbgDraw.SetLineThickness(1.0);
			dbgDraw.SetFlags(0xFFFFFFFF);
			world.SetDebugDraw(dbgDraw);*/
			return world;
		}
		// ========================================================== //
		private function fillWorld():void
		{
			var dynamicBodies:Vector.<b2Body>=new Vector.<b2Body>;
			var dynamicBodiesGroup:IParticleGroup;
			
			var body:b2Body;
			var bodyDef:b2BodyDef;
			var boxDef:b2PolygonDef;
			var circleDef:b2CircleDef;
			var i:int;
			
			//Земля
			bodyDef = new b2BodyDef();
			bodyDef.position.Set(10*b2Settings.b2_pixelScale, 15*b2Settings.b2_pixelScale);
			boxDef = new b2PolygonDef();
			boxDef.SetAsBox(256*3/*30*b2Settings.b2_pixelScale*/, 128/*3*b2Settings.b2_pixelScale*/);
			boxDef.friction = 0.5;
			boxDef.density = 0;
			bodyDef.userData = new Ground();
			bodyDef.userData.width =   512*3//2 * 30 * b2Settings.b2_pixelScale; 
			bodyDef.userData.height =  256//2 * 3 * b2Settings.b2_pixelScale; 
			bodyDef.userData.x = 10*b2Settings.b2_pixelScale;
			bodyDef.userData.y = 15*b2Settings.b2_pixelScale;
			container.addChild(bodyDef.userData);
			body = world.CreateBody(bodyDef);
			body.CreateShape(boxDef);
			body.SetMassFromShapes();
			
			
			bodyDef = new b2BodyDef();
			bodyDef.position.Set(-1*b2Settings.b2_pixelScale, 6*b2Settings.b2_pixelScale);
			boxDef = new b2PolygonDef();
			boxDef.SetAsBox(209/*30*b2Settings.b2_pixelScale*/, 55/*3*b2Settings.b2_pixelScale*/);
			boxDef.friction = 0.5;
			boxDef.density = 0;
			bodyDef.userData = new Wall();
			bodyDef.userData.width =   418; 
			bodyDef.userData.height =  110; 
			bodyDef.userData.x = -1*b2Settings.b2_pixelScale;
			bodyDef.userData.y = 6*b2Settings.b2_pixelScale;
			container.addChild(bodyDef.userData);
			body = world.CreateBody(bodyDef);
			body.CreateShape(boxDef);
			body.SetMassFromShapes();
			
			
			bodyDef = new b2BodyDef();
			bodyDef.position.Set(17*b2Settings.b2_pixelScale, -3*b2Settings.b2_pixelScale);
			boxDef = new b2PolygonDef();
			boxDef.SetAsBox(209/*30*b2Settings.b2_pixelScale*/, 55/*3*b2Settings.b2_pixelScale*/);
			boxDef.friction = 0.5;
			boxDef.density = 0;
			bodyDef.userData = new Wall();
			bodyDef.userData.width =   418; 
			bodyDef.userData.height =  110; 
			bodyDef.userData.x = 17*b2Settings.b2_pixelScale;
			bodyDef.userData.y = -3*b2Settings.b2_pixelScale;
			container.addChild(bodyDef.userData);
			body = world.CreateBody(bodyDef);
			body.CreateShape(boxDef);
			body.SetMassFromShapes();
			
			
			var sizeX:Number;
			var sizeY:Number;
			for(i=0;i<2;i++)
			{
				bodyDef = new b2BodyDef();
				sizeX = (Math.random() + 0.5)* b2Settings.b2_pixelScale;
				sizeY = (Math.random() + 0.5)* b2Settings.b2_pixelScale;
				bodyDef.position.x = (Math.random() * 15 + 5)* b2Settings.b2_pixelScale;
				bodyDef.position.y = (Math.random() * 10)* b2Settings.b2_pixelScale-sizeY-128;
				bodyDef.angle = Math.random() * 2*Math.PI;
				boxDef = new b2PolygonDef();
				boxDef.SetAsBox(sizeX, sizeY);
				boxDef.density = 0.08/(b2Settings.b2_pixelScale*b2Settings.b2_pixelScale);
				boxDef.friction = 0.5;
				boxDef.restitution = 0.2;
				bodyDef.userData = new Box();
				bodyDef.userData.width = sizeX * 2; 
				bodyDef.userData.height = sizeY * 2; 
				container.addChild(bodyDef.userData);
				body = world.CreateBody(bodyDef);
				body.CreateShape(boxDef);
				body.SetMassFromShapes();
				dynamicBodies.push(body);
			}
			
			//Мячи
			var r:Number;
			for(i=0;i<2;i++)
			{
				bodyDef = new b2BodyDef();
				r = (Math.random() + 0.5)* b2Settings.b2_pixelScale;
				bodyDef.position.x = (Math.random() * 15 + 5)* b2Settings.b2_pixelScale;
				bodyDef.position.y = (Math.random() * 10)* b2Settings.b2_pixelScale-r-128;
				bodyDef.angle = Math.random() * 2*Math.PI;
				circleDef = new b2CircleDef();
				circleDef.radius=r;
				circleDef.density = 0.03/(b2Settings.b2_pixelScale*b2Settings.b2_pixelScale);
				circleDef.friction = 0.5;
				circleDef.restitution = 0.2;
				bodyDef.userData = new Ball();
				bodyDef.userData.width = r * 2; 
				bodyDef.userData.height = r * 2; 
				container.addChild(bodyDef.userData);
				body = world.CreateBody(bodyDef);
				body.CreateShape(circleDef);
				body.SetMassFromShapes();
				dynamicBodies.push(body);
			}
			
			dynamicBodiesGroup=new ParticleGroup(dynamicBodies);
			
			addDrawable(new BodyDrawerXYRot(dynamicBodiesGroup));
			dynamicBodiesGroup.notifyGroupChanged();
		}
		// ========================================================== //
	}
}	