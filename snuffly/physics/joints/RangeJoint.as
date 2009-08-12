package snuffly.physics.joints
{
	public class RangeJoint extends Joint
	{
		public var lenmax:Number;
		public var lenmin:Number;
		// ========================================================== //
		public function RangeJoint(_p1:Particle, _p2:Particle, _lenmin:Number, _lenmax:Number):void
		{
			lenmax=_lenmax;
			lenmin=_lenmin;
			super(_p1,_p2,_lenmax);
		}
		// ========================================================== //
		override public function apply():void
		{
			var dx:Number;
			var dy:Number;
			var d_len:Number;
			var diff:Number;

			dx = p2.xx-p1.xx;
			dy = p2.yy-p1.yy;
			d_len = Math.sqrt(dx*dx + dy*dy);
			
			if(d_len==0)
			{
				dx=Math.random()*0.01;
				dy=(Math.random()+1)*0.01;
				d_len = Math.sqrt(dx*dx + dy*dy);
			}
			if((d_len>lenmax)||(d_len<lenmin))
			{
				if(d_len>lenmax)	diff = (d_len-lenmax)/d_len;
				if(d_len<lenmin)	diff = (d_len-lenmin)/d_len;
				
				if((p1.isStatic) || (p2.isStatic))
				{
					dx *= diff;
					dy *= diff;
				} else {
					dx *= 0.5*diff;
					dy *= 0.5*diff;
				}
				
				if(!p2.isStatic)
				{
					p2.xx -= dx;
					p2.yy -= dy;
				}
				if(!p1.isStatic)
				{
					p1.xx += dx;
					p1.yy += dy;
				}
			}
		}
		// ========================================================== //
	}
}