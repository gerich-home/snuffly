package snuffly.physics.core
{
	//Ограничение на частицы системы
	public interface IJoint
	{
		// ========================================================== //
		//Подготавливаем данные, если необходимо
		function beforeApply(iteration:int,iterations:int):void;
		// ========================================================== //
		//Применяем ограничение
		function applyJoint(iteration:int,iterations:int):void;
		// ========================================================== //
		//Корректируем данные, если необходимо 
		function afterApply(iteration:int,iterations:int):void;
		// ========================================================== //
	}
}