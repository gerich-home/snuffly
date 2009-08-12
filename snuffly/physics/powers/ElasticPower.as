package snuffly.physics.powers
{
	import snuffly.physics.core.*;
	import flash.display.Shape;
	//Сила Гука
	public class ElasticPower implements IDrawable , IPower
	{
		public var p1:BaseParticle;
		public var p2:BaseParticle;
		public var len:Number;				//Длина нерастянутой пружины
		public var k:Number;				//Коэффициент упругости
		
		public var lineColor:uint;			//Цвет пружины
		public var lineWidth:uint;			//Толщина пружины
		public var lineAlpha:Number;		//Прозрачность пружины
		public var visible:Boolean;			//Рисовать ли?
		public var canvas:Shape;			//Где рисуем
		// ========================================================== //
		public function ElasticPower(canvas:Shape,p1:BaseParticle, p2:BaseParticle, k:Number, len:Number=-1, lineWidth:uint=1,lineColor:uint=0,lineAlpha:Number=1,visible:Boolean=true):void
		{
			this.p1 = p1;	
			this.p2 = p2;
			this.k = k;
			this.lineColor=lineColor;
			this.lineWidth=lineWidth;
			this.lineAlpha=lineAlpha;
			this.visible=visible;
			this.canvas=canvas;
			if(len<0)
				this.len=Math.sqrt((p1.xx-p2.xx)*(p1.xx-p2.xx)+(p1.yy-p2.yy)*(p1.yy-p2.yy));
			else
				this.len = len;
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
		public function applyPower():void
		{
			var dx:Number;
			var dy:Number;
			var diff:Number;
			var d:Number;
			var qd:Number;
			
			dx = p2.xx-p1.xx;
			dy = p2.yy-p1.yy;
			qd=dx*dx+dy*dy;
			if(qd!=0)
			{
				d=Math.sqrt(qd);
				diff=d-len;
				diff=diff*k/d;
				dx*=diff;
				dy*=diff;
				if (!p1.isStatic)
				{
					p1.nx+=dx;
					p1.ny+=dy;
				}
				if (!p2.isStatic)
				{
					p2.nx-=dx;
					p2.ny-=dy;
				}
			}
		}
		// ========================================================== //
	}
}