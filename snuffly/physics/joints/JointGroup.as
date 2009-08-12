package snuffly.physics.joints
{
	internal class JointGroup implements IJoint
	{
		protected var jointCount:int;
		protected var _joints:Vector.<IJoint>;
		public var changed:Boolean;
		public var automix:Boolean;
		public var doBeforeApply:Boolean;
		public var doAfterApply:Boolean;
		public var mixcount:Number;
		// ========================================================== //
		public function JointGroup(joints:Vector.<IJoint>=null,automix:Boolean=false,mixcount:Number=0.25,doBeforeApply:Boolean=true,doAfterApply:Boolean=true):void
		{
			changed=true;
			this.automix=automix;
			this.joints=joints;
			this.mixcount=mixcount;
			this.doBeforeApply=doBeforeApply;
			this.doAfterApply=doAfterApply;
		}
		// ========================================================== //
		//Набор ограничений
		public function get joints():Vector.<IJoint>
		{
			return _joints;
		}
		// ========================================================== //
		public function set joints(_joints:Vector.<IJoint>):void
		{
			if(_joints)
				this._joints=_joints;
			else
				this._joints=new Vector.<IJoint>;
		}
		// ========================================================== //
		//Установить состояние "изменён"
		public function changeJoints():void
		{
			changed=true;
		}
		// ========================================================== //
		//Cбросить состояние "изменён"
		public function resetJoints():void
		{
			changed=false;
		}
		// ========================================================== //
		//Перемешать ограничения, чтобы не возникало эффекта нарастания движений
		public function Mix():void
		{
			var p:int;
			var c:int;
			var k:int;
			var rndi:int;
			var rndj:int;
			var jnt:IJoint;
			p=jointCount*0.25;
			c=jointCount+1;
			for (k=0;k<p;k++)
            {
				rndi=Math.random()*c-1;
				rndj=Math.random()*c-1;
				if(rndi<0)
					trace(rndi);
                jnt=joints[rndi];
				_joints[rndi]=joints[rndj];
				_joints[rndj]=jnt;
            }
		}
		// ========================================================== //
		public function beforeApply(iteration:int,iterations:int):void
		{
			if(changed)
				if(iteration==0)
				{
					jointCount=_joints.length;
					changed=false;
				}
			if(doBeforeApply)
			{
				if(automix)
					Mix();
				var i:int;
				for(i=0;i<jointCount;i++)
					_joints[i].beforeApply(iteration,iterations)
			}
		}
		// ========================================================== //
		//Применяем дочерние ограничения
		public function applyJoint(iteration:int,iterations:int):void
		{
			var i:int;
			for(i=0;i<jointCount;i++)
				_joints[i].applyJoint(iteration,iterations)
		}
		// ========================================================== //
		public function afterApply(iteration:int,iterations:int):void
		{
			if(doAfterApply)
			{
				var i:int;
				for(i=0;i<jointCount;i++)
					_joints[i].afterApply(iteration,iterations)
			}
		}
		// ========================================================== //
	}
}