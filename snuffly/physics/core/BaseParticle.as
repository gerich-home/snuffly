package snuffly.physics.core
{
	//Основа класса для частиц(масса всех таких частиц одинакова)
	//Потомки класса по-разному управление
	public class BaseParticle
	{
		public var ox:Number;		//Прошлое положение
		public var oy:Number;
		public var xx:Number;		//Текущее положение
		public var yy:Number;
		public var vx:Number;		//Скорость точки
		public var vy:Number;
		public var nx:Number;		//Для накопления сил
		public var ny:Number;
		protected var _isStatic:Boolean;	//Статичная точка, для которой не применяются силы и ограничения
		
		// ========================================================== //
		public function BaseParticle(xx:Number, yy:Number, isStatic:Boolean=false):void
		{
			this.xx = xx;
			this.yy = yy;
			
			resetSpeed();
			resetPowers();
	
			this.isStatic = isStatic;
		}
		// ========================================================== //
		//Статичная точка
		public function get isStatic():Boolean 
		{
			return _isStatic;
		}
		// ========================================================== //
		public function set isStatic(_isStatic:Boolean):void 
		{
			this._isStatic=_isStatic;
		}
		// ========================================================== //
		//Сброс накопителей сил
		public function resetPowers():void 
		{
			nx=0;
			ny=0;
		}
		// ========================================================== //
		//Сброс скорости в 0
		public function resetSpeed():void 
		{
			ox = xx;
			oy = yy;
			vx = 0;
			vy = 0;
		}
		// ========================================================== //
		//Изменение положения точки в соответсвии с алгоритмом Верлета
		public function integrate():void 
		{
			ox = xx;
			xx += vx + nx;
			
			oy = yy;
			yy += vy + ny;
			
			vx = xx - ox;
			vy = yy - oy;
		}
		// ========================================================== //
	}
}