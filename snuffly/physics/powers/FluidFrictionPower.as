 package snuffly.physics.powers
{
	import snuffly.physics.core.*;
	//Сила тяжести
	public class FluidFrictionPower implements IPower
	{
		public var u:Number;
		public var pt:Vector.<BaseParticle>;
		public var ptCount:int;
		// ========================================================== //
		public function FluidFrictionPower(particles:ParticleGroup,u:Number=0.01):void
		{
			this.u=u;
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
			var i:int;
			var p:BaseParticle;
			for (i=0; i<ptCount; i++)
			{
				p=pt[i];
				p.nx+=u*(p.ox-p.xx);
				p.ny+=u*(p.oy-p.yy);
			}
		}
		// ========================================================== //
	}
	
}