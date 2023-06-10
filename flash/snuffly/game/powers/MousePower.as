package snuffly.game.powers
{
	import snuffly.game.core.*;
	import Box2D.Dynamics.*;
	import Box2D.Common.Math.*;
	import flash.display.DisplayObject;
	import flash.events.MouseEvent;
	//Взаимодействие с мышью
	public class MousePower implements IPower
	{
		protected var pt:Vector.<b2Body>;
		protected var ptCount:int;
		
		public var r:Number;						//Радиус области
		public var k:Number;						//Сила
		public var mouseContainer:DisplayObject;	//Слушатель нажатия мыши
		
		protected var r2:Number;			//Квадрат радиуса
		protected var pressed:Boolean;		//Нажата ли мышь?
		protected var mx:Number;			//Положение мыши
		protected var my:Number;
		// ========================================================== //
		public function MousePower(particles:IParticleGroup, r:Number, k:Number, mouseContainer:DisplayObject):void
		{
			this.r = r;
			r2=r*r;
			this.k = k;
			this.mouseContainer=mouseContainer;
			mouseContainer.addEventListener(MouseEvent.MOUSE_DOWN,MouseDown);
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
			var abs:Function=Math.abs;
			var sqrt:Function=Math.sqrt;
			var p:b2Body;
			var i:int;
			var dx:Number;
			var dy:Number;
			var diff:Number;
			var d:Number;
			var qd:Number;
			var vec:b2Vec2;
			
			if(pressed)
			{
				for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					vec=p.GetPosition();
					dx = vec.x-mx;
					dy = vec.y-my;
					if(abs(dx)<r)
						if(abs(dy)<r)
						{
							qd=dx*dx+dy*dy;
							if(qd<r2)
								if(qd!=0)
								{
									d=sqrt(qd);
									diff=k/d;
									dx*=diff;
									dy*=diff;
									p.ApplyForceToCenter(dx,dy);
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
			
			mx = event.localX;
			my = event.localY;
			mouseContainer.addEventListener(MouseEvent.MOUSE_MOVE, MouseMove);
			mouseContainer.addEventListener(MouseEvent.MOUSE_UP, MouseUp);
		}
		// ========================================================== //
		private function MouseMove(event:MouseEvent):void
		{
			mx = event.localX;
			my = event.localY;
		}
		// ========================================================== //
		private function MouseUp(event:MouseEvent):void 
		{
			pressed=false;
			mouseContainer.removeEventListener(MouseEvent.MOUSE_MOVE, MouseMove);
			mouseContainer.removeEventListener(MouseEvent.MOUSE_UP, MouseUp);
		}
		// ========================================================== //
	}
}
