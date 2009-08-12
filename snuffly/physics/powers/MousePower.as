package snuffly.physics.powers
{
	import snuffly.physics.core.*;
	import flash.display.Sprite;
	import flash.events.MouseEvent;
	//Взаимодействие с мышью
	public class MousePower implements IPower
	{
		protected var pt:Vector.<BaseParticle>;
		protected var ptCount:int;
		
		public var r:Number;				//Радиус области
		public var k:Number;				//Сила
		public var mouseContainer:Sprite;	//Слушатель нажатия мыши
		
		protected var r2:Number;			//Квадрат радиуса
		protected var pressed:Boolean;		//Нажата ли мышь?
		protected var mx:Number;			//Положение мыши
		protected var my:Number;
		// ========================================================== //
		public function MousePower(particles:IParticleGroup, r:Number, k:Number, mouseContainer:Sprite):void
		{
			this.r = r;
			r2=r*r;
			this.k = k;
			this.mouseContainer=mouseContainer
			mouseContainer.stage.addEventListener(MouseEvent.MOUSE_DOWN,MouseDown);
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt=event.particles;
			ptCount=pt.length;
		}
		// ========================================================== //
		public function applyPower():void
		{
			var p:BaseParticle;
			var i:int;
			var dx:Number;
			var dy:Number;
			var diff:Number;
			var d:Number;
			var qd:Number;
			
			if(pressed)
			{
				for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					if(!p.isStatic)
					{
						dx = p.xx-mx;
						dy = p.yy-my;
						if(Math.abs(dx)<r)
							if(Math.abs(dy)<r)
							{
								qd=dx*dx+dy*dy;
								if(qd<r2)
									if(qd!=0)
									{
										d=Math.sqrt(qd);
										diff=k/d;
										dx*=diff;
										dy*=diff;
										p.nx+=dx;
										p.ny+=dy;
									}
							}
					}
				}
			}
		}
		// ========================================================== //
		//Обработка мыши
		private function MouseDown(event:MouseEvent):void 
		{
			pressed=true;
			
			mx = event.stageX;
			my = event.stageY;
			mouseContainer.stage.addEventListener(MouseEvent.MOUSE_MOVE, MouseMove);
			mouseContainer.stage.addEventListener(MouseEvent.MOUSE_UP, MouseUp);
		}
		// ========================================================== //
		private function MouseMove(event:MouseEvent):void
		{
			mx = event.stageX;
			my = event.stageY;
		}
		// ========================================================== //
		private function MouseUp(event:MouseEvent):void 
		{
			pressed=false;
			
			mouseContainer.stage.removeEventListener(MouseEvent.MOUSE_MOVE, MouseMove);
			mouseContainer.stage.removeEventListener(MouseEvent.MOUSE_UP, MouseUp);
		}
		// ========================================================== //
	}
}