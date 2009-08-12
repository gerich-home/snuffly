package snuffly.test
{
	import flash.display.Shape;
	import flash.display.Sprite;
	import flash.display.Bitmap;
	import snuffly.physics.core.*;
	import snuffly.physics.joints.*;
	import snuffly.physics.powers.*;
	import snuffly.physics.particles.*;
	
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
			joints.push(new BoundJoint(canvas,particles,0,0,   0,1 ));	//Работает для всей системы точек
			joints.push(new BoundJoint(canvas,particles,0,0,   1,0 ));
			joints.push(new BoundJoint(canvas,particles,0,400, 0,-1));
			joints.push(new BoundJoint(canvas,particles,550,0, -1,0));
			
			
			//Создаём группу частиц(тут нет особого резона это делать,
			//но просто если бы были другие группы частиц, то необходимо)
			var g1:IParticleGroup;
			g1=new ParticleGroup();
			//Для простоты все дальнейшие функции будут добавлять частицы именно в g1
			output=g1.getParticles();
			
			var jello:IParticleGroup;
			jello=createJello(200,20,1,0,0);
			powers.push(new KeyboardPower(jello,container,0.18,0.1,0.1));
			jello.notifyGroupChanged();
			
			//powers.push(new FluidFrictionPower(g1,0.02));
			powers.push(new Gravity(g1,0.2));
			powers.push(new MousePower(g1,60,3,container));
			g1.notifyGroupChanged();		//событие изменения группы частиц
			
			iterations=10;	//=1 потому что нет таких Joint'ов которые надо несколько раз прогонять
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
	}
}