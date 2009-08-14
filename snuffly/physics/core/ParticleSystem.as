package snuffly.physics.core
{
	import flash.utils.*;
	//Класс определяющий основную логику работы движка: подготовку, порядок работы физики, прорисовку
	//Для описания конкретного физического мира надо переопределить метод init в дочернем классе
	//и в нём сформировать все компоненты системы
	public class ParticleSystem
	{
		//Объекты системы
		public var particles:IParticleGroup;		//Все частицы системы
		public var drawables:Vector.<IDrawable>;	//Рисуемые объекты(IDrawable)
		public var powers:Vector.<IPower>;			//Силы действующие на частицы(IPower)
		public var joints:Vector.<IJoint>;			//Ограничения системы(IJoint)
		
		//Соответсвующие длины массивов
		protected var drawablesCount:int;
		protected var powersCount:int;
		protected var jointsCount:int;
		
		//Вершины из particles
		protected var pt:Vector.<BaseParticle>;
		protected var ptCount:int;
			
		protected var paused:Boolean;				//Остановлена ли симуляция?
		
		public var iterations:int;					//Число повторений в одном шаге верлета
		
		public var prepareDraw:Function;			//Функция, которая вызывается перед рисованием для очистки области рисования и для других задач
		
		// ========================================================== //
		public function ParticleSystem(prepareDraw:Function):void
		{
			paused=true;
			this.prepareDraw = prepareDraw;
			drawables=new Vector.<IDrawable>;
			powers=new Vector.<IPower>;
			joints=new Vector.<IJoint>;
			iterations=15;
			init();
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			particles.notifyGroupChanged();
			drawablesCount=drawables.length;
			powersCount=powers.length;
			jointsCount=joints.length;
		}
		// ========================================================== //
		//Формируем систему
		protected function init():void
		{
			particles=new ParticleGroup();
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt=event.particles;
			ptCount=pt.length;
		}
		// ========================================================== //
		//Запуск симуляции
		public function start():void
		{
			paused=false;
		}
		// ========================================================== //
		//Остановка симуляции
		public function pause():void
		{
			paused=true;
		}
		// ========================================================== //
		//Шаг интеграции верлета
		public function integrate():void
		{
			if(paused)	return;
			
			var p:BaseParticle;
			var i:int;
			var j:int;
			var k:int;
			
			for (i=0; i<ptCount; i++)
			{
				p=pt[i];
				if(!p.isStatic)
					p.integrate();
			}
			
			for (i=0; i<ptCount; i++)			pt[i].resetPowers();
			for (i=0; i<powersCount; i++)		powers[i].applyPower();
			
			for (i=0; i<iterations; i++)
			{
				for (j=0; j<jointsCount; j++)
					joints[j].beforeApply(i,iterations);
				for (j=0; j<jointsCount; j++)
					joints[j].applyJoint(i,iterations);
				for (j=0; j<jointsCount; j++)
					joints[j].afterApply(i,iterations);
			}
		}
		// ========================================================== //
		//Перерисовываем кадр
		public function draw():void
		{
			prepareDraw();
			drawSystem();
		}
		// ========================================================== //
		//Рисуем систему
		protected function drawSystem():void
		{
			var i:int;
			for (i=0; i<drawablesCount; i++)	drawables[i].draw();
		}
		// ========================================================== //
		//Добавить связь сразу в список joint'ов и в список прорисовки
		protected function addDrawableJoint(j:IJoint,to:Vector.<IJoint>=null):void
		{
			if(to)
				to.push(j);
			else
				joints.push(j);
			if(j is IDrawable)
				drawables.push(j);
		}
		// ========================================================== //
		//Добавить точку сразу в список частиц и в список прорисовки
		protected function addDrawableParticle(p:BaseParticle,to:Vector.<BaseParticle>=null):void
		{
			pt.push(p);
			if(to)
				if(to!=pt)
					to.push(p);
			if(p is IDrawable)
				drawables.push(p);
		}
		// ========================================================== //
		//Добавить силу сразу в список сил и в список прорисовки
		protected function addDrawablePower(p:IPower):void
		{
			powers.push(p);
			if(p is IDrawable)
				drawables.push(p);
		}
		// ========================================================== //
	}
}