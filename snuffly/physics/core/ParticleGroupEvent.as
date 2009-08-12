package snuffly.physics.core
{
	import flash.events.Event;
	//Событие изменения группы
	public class ParticleGroupEvent extends Event
	{
		public static const CHANGED:String = "changed";		//Произошли какие-то изменения в группе частиц
		public static const KILLED:String = "killed";		//Группа уничтожена
		private var _group:IParticleGroup;					//Группа
		// ========================================================== //
		public function ParticleGroupEvent(type:String,group:IParticleGroup) {
			super(type);
			_group=group;
		} 
		// ========================================================== //
		public override function toString():String
		{ 
			return formatToString("ParticleGroupEvent");
		}
		// ========================================================== //
		public function get particles():Vector.<BaseParticle>
		{ 
			return _group.getParticles();
		}
		// ========================================================== //
		public function get group():IParticleGroup
		{ 
			return _group;
		}
		// ========================================================== //
	}
}