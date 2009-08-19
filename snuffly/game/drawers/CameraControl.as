package snuffly.game.drawers
{
	import Box2D.Dynamics.*;
	import Box2D.Common.Math.*;
	import snuffly.game.core.*;
	import flash.utils.*;
	import flash.system.*;
	//Контроллер камеры
	public class CameraControl implements IDrawable
	{
		protected var pt:Vector.<b2Body>;						//Тела
		protected var ptCount:int;								//Количество тел
		protected var callback:Function;						//Что сделать на основе информации о центре масс?
		protected var cx:Number;								//Центр масс
		protected var cy:Number;								//Центр масс
		// ========================================================== //
		public function CameraControl(particles:IParticleGroup,callback:Function):void
		{
			this.callback=callback;
			ptCount	=0;
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt			=event.particles;
			ptCount		=pt.length;
			cx			=event.cx;
			cy			=event.cy;
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
			callback(cx,cy);
		}
		// ========================================================== //
	}
}