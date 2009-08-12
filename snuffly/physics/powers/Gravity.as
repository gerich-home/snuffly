package snuffly.physics.powers
{
	import snuffly.physics.core.*;
	//Сила тяжести
	public class Gravity implements IPower
	{
		public var gx:Number;
		public var gy:Number;
		public var pt:Vector.<BaseParticle>;
		public var ptCount:int;
		// ========================================================== //
		public function Gravity(particles:IParticleGroup,gy:Number=0.1,gx:Number=0):void
		{
			this.gx=gx;
			this.gy=gy;
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
				p.nx+=gx;
				p.ny+=gy;
			}
		}
		// ========================================================== //
	}
	
}