package snuffly.physics.joints
{
	import snuffly.physics.core.*;
	import flash.display.Shape;
	//Ограничение на скорость
	public class MaxSpeedJoint implements IJoint
	{
		protected var pt:Vector.<BaseParticle>;
		protected var ptCount:int;
		
		protected var _maxSpeed:Number;			//Максимальная скорость
		protected var maxSpeedSqr:Number;		//Квадрат максимальной скорости
		// ========================================================== //
		public function MaxSpeedJoint(particles:ParticleGroup,maxSpeed:Number=100):void
		{
			this.maxSpeed=maxSpeed;
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
		//Максимальная скорость
		public function get maxSpeed():Number
		{
			return _maxSpeed;
		}
		// ========================================================== //
		public function set maxSpeed(_maxSpeed:Number):void
		{
			this._maxSpeed=_maxSpeed;
			this.maxSpeedSqr = _maxSpeed*_maxSpeed;
		}
		// ========================================================== //
		public function beforeApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
		public function applyJoint(iteration:int,iterations:int):void
		{
			if(iteration+1==iterations)
			{
				var dx:Number;
				var dy:Number;
				var d:Number;
				var i:uint;
				var p:BaseParticle;
				for (i=0; i<ptCount; i++)
				{
					p=pt[i];
					dx=p.vx;
					dy=p.vy;
					d=dx*dx+dy*dy;
					if(d>maxSpeedSqr)
					{
						d=maxSpeed/Math.sqrt(d);
						p.vx*=d;
						p.vy*=dy*d;
					}
				}
			}
		}
		// ========================================================== //
		public function afterApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
	}
}