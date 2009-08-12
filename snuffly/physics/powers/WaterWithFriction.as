package snuffly.physics.powers
{
	import snuffly.physics.core.*;
	import flash.display.Shape;
	//Вода
	public class WaterWithFriction extends ArchimedPower
	{
		protected var u:Number;
		
		// ========================================================== //
		public function WaterWithFriction(canvas:Shape, particles:IParticleGroup,u:Number,levely:Number,levelx:Number=0,rg:Number=0.4,ny:Number=-1,nx:Number=0,waterColor:uint=0x0000FF,waterAlpha:Number=0.2, visible=true):void
		{
			super(canvas, particles,levely,levelx,rg,ny,nx,waterColor,waterAlpha, visible);
			this.u=u;
		}
		// ========================================================== //
		//Применяем силу
		public override function applyPower():void
		{
			var i:int;
			var p:BaseParticle;
			if(particles.getParticlesChanged())
			{
				pt=particles.getParticles();
				ptCount=pt.length;
			}
			for (i=0; i<ptCount; i++)
			{
				p=pt[i];
				if((_levelx-p.xx)*_nx+(_levely-p.yy)*_ny>0)
				{
					p.nx+=_px-u*p.vx;
					p.ny+=_py-u*p.vy;
				}
			}
		}
		// ========================================================== //
	}
	
}