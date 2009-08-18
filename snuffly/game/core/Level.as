package snuffly.game.core
{
	import flash.utils.*;
	import Box2D.Dynamics.b2World;
	//Базовый класс для уровня
	//При переопределении этого класса необхдимо создать Box2D мир и силы и рисуемые объекты
	public class Level
	{
		protected var powers:Vector.<IPower>;			//Силы, действующие на объекты
		protected var drawables:Vector.<IDrawable>;		//рисуемые объекты
		protected var powersCount:int;					//Количество сил
		protected var drawablesCount:int;				//Количество рисуемых объектов
		protected var world:b2World;					//Мир
		protected var dt:Number;						//Шаг симуляции
		protected var velocityIterations:int;			//Число итераций для Box2D
		protected var positionIterations:int;
		// ========================================================== //
		public function Level():void
		{
			powers=new Vector.<IPower>();
			drawables=new Vector.<IDrawable>();
			dt=0.1;
			velocityIterations=2;
			positionIterations=2;
			
			init();
			
			powersCount=powers.length;
			drawablesCount=drawables.length;
		}
		// ========================================================== //
		//Инициализация мира - должна быть переопределена
		public virtual function init():void
		{
		}
		// ========================================================== //
		//Шаг симуляции физики
		public function step():void
		{
			var t1:int=getTimer();
			var i:int;
			for(i=0;i<powersCount;i++)
				powers[i].applyPower();
			var t2:int=getTimer()-t1;
			world.Step(dt,velocityIterations,positionIterations);
			trace(t2,getTimer()-t1);
		}
		// ========================================================== //
		//Прорисовка
		public function draw():void
		{
			var i:int;
			for(i=0;i<drawablesCount;i++)
				drawables[i].draw();
		}
		// ========================================================== //
		//Добавить силу
		public function addPower(power:IPower):void
		{
			powers.push(power);
		}
		// ========================================================== //
		//Добавить рисуемый объект
		public function addDrawable(drawable:IDrawable):void
		{
			drawables.push(drawable);
		}
		// ========================================================== //
		//Добавить рисуемый объект
		public function addDrawablePower(drawablePower:Object):void
		{
			if(drawablePower is IPower)
				powers.push(drawablePower);
			if(drawablePower is IDrawable)
				drawables.push(drawablePower);
		}
		// ========================================================== //
	}
}	