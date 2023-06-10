package snuffly.game.drawers
{
	import Box2D.Dynamics.*;
	import Box2D.Common.Math.*;
	import snuffly.game.core.*;
	import flash.utils.*;
	import flash.display.DisplayObject;
	//Прорисовщик тел(только позиция без поворота)
	public class BodyDrawerXYRot extends BodyDrawerXY implements IDrawable
	{
		protected const RAD_TO_DEG:Number = 180/Math.PI;
		// ========================================================== //
		public function BodyDrawerXYRot(particles:IParticleGroup):void
		{
			super(particles);
		}
		// ========================================================== //
		public override function draw():void
		{
			var i:int;
			var vec:b2Vec2;
			var dis:DisplayObject;
			var p:b2Body;
			for (i=0; i<ptCount; i++)
			{
				p=pt[i];
				dis=p.GetUserData();
				vec=p.GetPosition();
				dis.x=vec.x;
				dis.y=vec.y;
				dis.rotation=p.GetAngle()*RAD_TO_DEG;
			}
		}
		// ========================================================== //
	}
}