package snuffly.game.drawers
{
	import snuffly.game.core.*;
	import snuffly.game.powers.*;
	import flash.utils.*;
	import flash.system.*;
	//Контроллер камеры
	public class CameraControl implements IDrawable
	{
		protected var callback:Function;						//Что сделать на основе информации о центре масс?
		protected var cmCalc:CMCalculator;						//Вычислитель центра масс
		// ========================================================== //
		public function CameraControl(cmCalc:CMCalculator,callback:Function):void
		{
			this.callback=callback;
			this.cmCalc=cmCalc;
		}
		// ========================================================== //
		public function draw():void
		{
			callback(cmCalc.cx,cmCalc.cy);
		}
		// ========================================================== //
	}
}