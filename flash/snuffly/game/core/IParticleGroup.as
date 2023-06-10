package snuffly.game.core
{
	import Box2D.Dynamics.b2Body;
	import flash.events.IEventDispatcher;
	//Группа частиц
	public interface IParticleGroup extends IEventDispatcher
	{
		// ========================================================== //
		//Оповестить об изменении частиц
		function notifyGroupChanged():void;
		// ========================================================== //
		//Оповестить об уничтожении группы(необходимо освободить все слушатели)
		function notifyGroupKilled():void;
		// ========================================================== //
		//Частицы
		function getParticles():Vector.<b2Body>;
		// ========================================================== //
	}
}