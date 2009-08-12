package snuffly.physics.joints
{
	import flash.display.Shape;
	//Связь-нить
	internal class WeakJoint extends Joint implements IDrawable , IJoint
	{
		// ========================================================== //
		public function WeakJoint(canvas:Shape, p1:BaseParticle, p2:BaseParticle, len:Number, lineWidth:uint=1,lineColor:uint=0,lineAlpha:Number=1, visible:Boolean=true):void
		{
			super(canvas,p1,p2,len,lineWidth,lineColor,lineAlpha,visible);
		}
		// ========================================================== //
		public override function applyJoint(iteration:int,iterations:int):void
		{
			var dx:Number;
			var dy:Number;
			var diff:Number;
			var quadDelta:Number;
	
			dx = p2.xx-p1.xx;
			dy = p2.yy-p1.yy;
			
			quadDelta = dx*dx + dy*dy;
			
			if (quadDelta > quadlen)
			{
				diff = quadlen/(quadDelta+quadlen)-0.5;

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
		}
		// ========================================================== //
	}
}