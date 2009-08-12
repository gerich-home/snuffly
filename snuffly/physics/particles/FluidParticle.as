package snuffly.physics.particles
{
	import snuffly.physics.core.BaseParticle;
	import flash.display.Shape;
	import flash.display.Graphics;
	import flash.display.BitmapData;
	import flash.display.GradientType;
	import flash.geom.Rectangle;
	import flash.geom.Matrix;
	//Частица жидкости
	public class FluidParticle extends BaseParticle
	{
		public var bubbleBmp:BitmapData;
		public var r:Number;
		// ========================================================== //
		public function FluidParticle(xx:Number, yy:Number, isStatic:Boolean=false, r:Number=25, bubbleBmp:BitmapData=null,color:uint=0x0000FF):void
		{
			super(xx,yy,isStatic);
			if(bubbleBmp)
				this.bubbleBmp=bubbleBmp;
			else
				this.bubbleBmp=FluidParticle.drawBubble(r,color);
			this.r=r;
		}
		// ========================================================== //
		//Создать изображение капельки
		public static function drawBubble(r:Number,fluidColor:uint):BitmapData
		{
			var bubbleShape:Shape;
			var bubbleBmp:BitmapData;
			var bubble:Graphics;
			var m:Matrix;
			
			bubbleShape=new Shape();
			bubble=bubbleShape.graphics;
			bubble.clear();
			
			m=new Matrix();
			m.createGradientBox(2*r, 2*r, 0, -r, -r);
			bubble.beginGradientFill(GradientType.RADIAL, [fluidColor,fluidColor], [1,0], [0, 255],m);
			bubble.drawCircle(0, 0, r);
			bubble.endFill();
			bubbleBmp=new BitmapData(bubbleShape.width,bubbleShape.height);
			m=new Matrix();
			m.translate(r,r);
			bubbleBmp.fillRect(new Rectangle(0, 0, bubbleBmp.width, bubbleBmp.height), 0);
			bubbleBmp.draw(bubbleShape,m);
			return bubbleBmp;
		}
	}
}