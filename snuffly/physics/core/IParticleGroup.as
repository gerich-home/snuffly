package snuffly.physics.core
{
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
		function getParticles():Vector.<BaseParticle>;
		// ========================================================== //
	}
}