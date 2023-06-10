package snuffly.game.core
{
	import Box2D.Dynamics.b2Body;
	import flash.events.Event;
	import flash.events.EventDispatcher;
	//Набор частиц, объединённых в группу
	public class ParticleGroup implements IParticleGroup
	{
		protected var _particles:Vector.<b2Body>;
		protected var eventDispatcher:EventDispatcher;
		// ========================================================== //
		public function ParticleGroup(particles:Vector.<b2Body>=null):void
		{
			eventDispatcher = new EventDispatcher(this);
			setParticles(particles);
		}
		// ========================================================== //
		//Оповестить об изменении частиц
		public function notifyGroupChanged():void
		{
			eventDispatcher.dispatchEvent(new ParticleGroupEvent(ParticleGroupEvent.CHANGED,this));
		}
		// ========================================================== //
		//Оповестить об уничтожении группы частиц
		public function notifyGroupKilled():void
		{
			eventDispatcher.dispatchEvent(new ParticleGroupEvent(ParticleGroupEvent.KILLED,this));
		}
		// ========================================================== //
		//Частицы
		public function getParticles():Vector.<b2Body>
		{
			return _particles;
		}
		// ========================================================== //
		public function setParticles(_particles:Vector.<b2Body>):void
		{
			if(_particles)
				this._particles=_particles;
			else
				this._particles=new Vector.<b2Body>;
		}
		// ========================================================== //
		public function addEventListener(type:String, listener:Function, useCapture:Boolean = false, priority:int = 0, useWeakReference:Boolean = false):void
		{
			eventDispatcher.addEventListener.apply(null, arguments);
		}
		// ========================================================== //
		public function dispatchEvent(event:Event):Boolean
		{
			return eventDispatcher.dispatchEvent.apply(null, arguments);
		}
		// ========================================================== //
		public function hasEventListener(type:String):Boolean
		{
			return eventDispatcher.hasEventListener.apply(null, arguments);
		}
		// ========================================================== //
		public function removeEventListener(type:String, listener:Function, useCapture:Boolean = false):void
		{
			eventDispatcher.removeEventListener.apply(null, arguments);
		}
		// ========================================================== //
		public function willTrigger(type:String):Boolean
		{
			return eventDispatcher.willTrigger.apply(null, arguments);
		}
		// ========================================================== //
	}
}