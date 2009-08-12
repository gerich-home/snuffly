package snuffly.physics.joints
{
	import flash.display.Shape;
	//Жёсткая связь
	internal class Joint implements IDrawable , IJoint
	{
		public var p1:BaseParticle;
		public var p2:BaseParticle;
		protected var _len:Number;
		protected var quadlen:Number;
		
		public var lineColor:uint;		//Цвет
		public var lineWidth:uint;		//Толщина
		public var lineAlpha:Number;	//Прозрачность
		public var visible:Boolean;		//Рисовать ли?
		public var canvas:Shape;		//Где рисуем
		// ========================================================== //
		public function Joint(canvas:Shape, p1:BaseParticle, p2:BaseParticle, len:Number, lineWidth:uint=1,lineColor:uint=0,lineAlpha:Number=1, visible:Boolean=true):void
		{
			this.canvas=canvas;
			this.lineColor=lineColor;
			this.lineWidth=lineWidth;
			this.lineAlpha=lineAlpha;
			this.visible=visible;
			this.p1 = p1;
			this.p2 = p2;
			this.len = len;
		}
		// ========================================================== //
		//Длина связи
		public function get len():Number
		{
			return _len;
		}
		// ========================================================== //
		public function set len(_len:Number):void
		{
			this._len=_len;
			this.quadlen = _len*_len;
		}
		// ========================================================== //
		//Изображаем связь
		public function draw():void
		{
			if (visible)
			{
				canvas.graphics.lineStyle(lineWidth,lineColor,lineAlpha);
				canvas.graphics.moveTo(p1.xx, p1.yy);
				canvas.graphics.lineTo(p2.xx, p2.yy);
			}
		}
		// ========================================================== //
		public function beforeApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
		public function applyJoint(iteration:int,iterations:int):void
		{
			var dx:Number;
			var dy:Number;
			var diff:Number;
			
			dx = p2.xx-p1.xx;
			dy = p2.yy-p1.yy;

			diff = quadlen/(dx*dx+dy*dy+quadlen)-0.5;

			if(!(p1.isStatic || p2.isStatic))
				diff *= 0.5;
				
			dx *= diff;
			dy *= diff;
			
			if (!p2.isStatic)
			{
				p2.xx += dx;
				p2.yy += dy;
			}
			if (!p1.isStatic)
			{
				p1.xx -= dx;
				p1.yy -= dy;
			}
		}
		// ========================================================== //
		public function afterApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
	}
}