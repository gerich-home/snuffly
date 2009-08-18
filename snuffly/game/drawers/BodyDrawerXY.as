package snuffly.game.drawers
{
	import Box2D.Dynamics.*;
	import Box2D.Common.Math.*;
	import snuffly.game.core.*;
	import flash.utils.*;
	import flash.display.DisplayObject;
	//Прорисовщик тел(только позиция без поворота)
	public class BodyDrawerXY implements IDrawable
	{
		protected var pt:Vector.<b2Body>;						//Тела
		protected var ptCount:int;								//Количество тел
		
		// ========================================================== //
		public function BodyDrawerXY(particles:IParticleGroup):void
		{
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt			=Vector.<b2Body>(event.particles);
			ptCount		=pt.length;
		}
		// ========================================================== //
		//Частицы уничтожены
		protected function particlesKilled(event:ParticleGroupEvent):void
		{
			pt			=null;
			ptCount		=0;
		}
		// ========================================================== //
		public function draw():void
		{
			var i:int;
			var vec:b2Vec2;
			var dis:DisplayObject;
			var p:b2Body;
			for (i=0; i<ptCount; i++)
			{
				p=pt[i];
				dis=p.GetUserData();
				vec=p.GetPosition();
				dis.x=vec.x;
				dis.y=vec.y;
			}
		}
		// ========================================================== //
	}
}