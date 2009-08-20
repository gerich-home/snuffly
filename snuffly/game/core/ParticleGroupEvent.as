package snuffly.game.core
{
	import Box2D.Dynamics.b2Body;
	import Box2D.Common.Math.b2Vec2;
	import flash.events.Event;
	//Событие изменения группы
	public class ParticleGroupEvent extends Event
	{
		public static const CHANGED:String = "changed";		//Произошли какие-то изменения в группе частиц
		public static const KILLED:String = "killed";		//Группа уничтожена
		private var _group:IParticleGroup;					//Группа
		private var _cx:Number;								//Координаты центра масс
		private var _cy:Number;								//Координаты центра масс
		private var cmNeedCalc:Boolean;						//Надо ли вычислить центр масс?
		// ========================================================== //
		public function ParticleGroupEvent(type:String,group:IParticleGroup) {
			super(type);
			_group=group;
			cmNeedCalc=true;
		} 
		// ========================================================== //
		public override function toString():String
		{ 
			return formatToString("ParticleGroupEvent");
		}
		// ========================================================== //
		public function get particles():Vector.<b2Body>
		{ 
			return _group.getParticles();
		}
		// ========================================================== //
		public function get group():IParticleGroup
		{ 
			return _group;
		}
		// ========================================================== //
		public function get cx():Number
		{ 
			if(cmNeedCalc)
				calcCM();
			return _cx;
		}
		// ========================================================== //
		public function get cy():Number
		{ 
			if(cmNeedCalc)
				calcCM();
			return _cy;
		}
		// ========================================================== //
		private function calcCM():void
		{ 
			var i:int;
			var pt:Vector.<b2Body>;
			var vec:b2Vec2;
			var ptCount:int;
			var ptCountInv:Number;
			pt=_group.getParticles();
			ptCount=pt.length;
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
			cmNeedCalc=false;
		}
		// ========================================================== //
	}
}