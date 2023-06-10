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
		protected var _cx:Number;								//Координаты центра масс
		protected var _cy:Number;
		protected var _vx:Number;								//Скорость центра масс
		protected var _vy:Number;
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
			var p:b2Body;
			var vec:b2Vec2;
			var ptCountInv:Number;
			if(ptCount>0)
			{
				ptCountInv=1/ptCount;
				_cx=0;
				_cy=0;
				_vx=0;
				_vy=0;
				for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					vec=p.GetPosition();
					_cx+=vec.x;
					_cy+=vec.y;
					vec=p.GetLinearVelocity();
					_vx+=vec.x;
					_vy+=vec.y;
				}
				_cx*=ptCountInv;
				_cy*=ptCountInv;
				_vx*=ptCountInv;
				_vy*=ptCountInv;
			}
			else
			{
				_cx=0;
				_cy=0;
				_vx=0;
				_vy=0;
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
		public function get vx():Number
		{ 
			return _vx;
		}
		// ========================================================== //
		public function get vy():Number
		{ 
			return _vy;
		}
		// ========================================================== //
	}
}