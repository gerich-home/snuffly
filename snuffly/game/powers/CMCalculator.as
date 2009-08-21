package snuffly.game.powers
{
	import snuffly.game.core.*;
	import Box2D.Dynamics.b2Body;
	import Box2D.Common.Math.b2Vec2;
	//Событие изменения группы
	public class CMCalculator implements IPower
	{
		protected var pt:Vector.<b2Body>;						//Тела
		protected var ptCount:int;								//Количество тел
		private var _cx:Number;									//Координаты центра масс
		private var _cy:Number;
		// ========================================================== //
		public function CMCalculator(particles:IParticleGroup):void
		{
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt			=event.particles;
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
		public function applyPower():void
		{
			var i:int;
			var vec:b2Vec2;
			var ptCountInv:Number;
			if(ptCount>0)
			{
				ptCountInv=1/ptCount;
				_cx=0;
				_cy=0;
				for(i=0;i<ptCount;i++)
				{
					vec=pt[i].GetPosition();
					_cx+=vec.x;
					_cy+=vec.y;
				}
				_cx*=ptCountInv;
				_cy*=ptCountInv;
			}
			else
			{
				_cx=0;
				_cy=0;
			}
		}
		// ========================================================== //
		public function get cx():Number
		{ 
			return _cx;
		}
		// ========================================================== //
		public function get cy():Number
		{ 
			return _cy;
		}
		// ========================================================== //
	}
}