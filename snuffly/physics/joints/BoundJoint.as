package snuffly.physics.joints
{
	import snuffly.physics.core.*;
	import flash.display.Shape;
	import flash.display.GraphicsPathCommand;
	import flash.display.GraphicsPathWinding;
	//Препятствие типа бесконечная плоскость
	public class BoundJoint implements IDrawable , IJoint
	{
		
		protected var _cx:Number;				//Точка на поверхности стены
		protected var _cy:Number;
		protected var _nx:Number;				//Перпендикуляр к плоскости стены
		protected var _ny:Number;
		public var friction:Number;				//Трение
		public var damping:Number;				//Упругость
		protected var pt:Vector.<BaseParticle>;
		protected var ptCount:int;
		
		protected var command:Vector.<int>;
		protected var coord:Vector.<Number>;
		
		public var wallColor:uint;		//Цвет стены
		public var wallAlpha:Number;	//Прозрачность стены
		public var visible:Boolean;		//Рисуем ли?
		public var canvas:Shape;		//Где рисуем
		// ========================================================== //
		public function BoundJoint(canvas:Shape, particles:IParticleGroup,cx:Number=0,cy:Number=0,nx:Number=0,ny:Number=1,friction:Number=0.95,damping:Number=0.2, visible=false,wallColor:uint=0xCCCCCC,wallAlpha:Number=1):void
		{
			this.canvas=canvas;
			this._cx=cx;
			this._cy=cy;
			this._nx=nx
			this._ny=ny;
			this.friction=friction
			this.damping=damping;
			this.wallColor=wallColor;
			this.wallAlpha=wallAlpha;
			this.visible=visible;
			normalize();
			recalcPath();
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
			particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt=event.particles;
			ptCount=pt.length;
		}
		// ========================================================== //
		//Частицы уничтожены
		protected function particlesKilled(event:ParticleGroupEvent):void
		{
			pt=null;
			ptCount=0;
		}
		// ========================================================== //
		//Нормируем вектор нормали
		protected function normalize():void 
		{
			var n:Number;
			n=1/(_nx*_nx+_ny*_ny);
			_nx*=n;
			_ny*=n;
		}
		// ========================================================== //
		//Изменение нормали
		public function setNormal(_nx:Number,_ny:Number):void 
		{
			this._nx=_nx;
			this._ny=_ny;
			normalize();
			recalcPath();
		}
		// ========================================================== //
		//Изменение точки на поверхности
		public function setC(_cx:Number,_cy:Number):void 
		{
			this._cx=_cx;
			this._cy=_cy;
			recalcPath();
		}
		// ========================================================== //
		//Изменение нормали и точки на поверхности
		public function setNormalAndC(_nx:Number,_ny:Number,_cx:Number,_cy:Number):void 
		{
			this._nx=_nx;
			this._ny=_ny;
			normalize();
			this._cx=_cx;
			this._cy=_cy;
			recalcPath();
		}
		// ========================================================== //
		//Нормаль - координата x
		public function get nx():Number 
		{
			return _nx;
		}
		// ========================================================== //
		//Нормаль - координата y
		public function get ny():Number 
		{
			return _ny;
		}
		// ========================================================== //
		//Точка на поверхности стены - координата x
		public function get cx():Number 
		{
			return _cx;
		}
		// ========================================================== //
		//Точка на поверхности стены - координата y
		public function get cy():Number 
		{
			return _cy;
		}
		// ========================================================== //
		public function beforeApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
		public function applyJoint(iteration:int,iterations:int):void
		{
			var i:int;
			var p:BaseParticle;
			var s:Number;
			var v1:Number;
			var v2:Number;
			var dx:Number;
			var dy:Number;
			var b:Boolean;
			b=iteration==0;
			for (i=0; i<ptCount; i++)
			{
				p=pt[i];
				s=(_cx-p.xx)*_nx+(_cy-p.yy)*_ny;
				if(s>0)
				{
					p.xx+=_nx*s;
					p.yy+=_ny*s;
					if(b)
					{
						dx=p.vx;
						dy=p.vy;
						v1=-damping*(dx*_nx+dy*_ny);
						v2=friction*(dx*_ny-dy*_nx);
						p.vx=_nx*v1+_ny*v2;
						p.vy=_ny*v1-_nx*v2;
					}
				}
			}
		}
		// ========================================================== //
		public function afterApply(iteration:int,iterations:int):void
		{
		}
		// ========================================================== //
		//Рисуем стену
		public function draw():void
		{
			if (visible)
			{
				canvas.graphics.beginFill(wallColor,wallAlpha);
				canvas.graphics.drawPath(command,coord);
				canvas.graphics.endFill();
			}
		}
		// ========================================================== //
		//Пересчёт области, изображающей полуплоскость
		private function recalcPath():void
		{
			var w:Number;
			var h:Number;
			var b1:Boolean;
			var b2:Boolean;
			var b3:Boolean;
			var b4:Boolean;
			w=canvas.stage.stageWidth;
			h=canvas.stage.stageHeight;
			b1=(_cx*_nx     +_cy*_ny>0);
			b2=((_cx-w)*_nx +_cy*_ny>0);
			b3=((_cx-w)*_nx +(_cy-h)*_ny>0);
			b4=(_cx*_nx     +(_cy-h)*_ny>0);
			
			command=new Vector.<int>;
			coord=new Vector.<Number>;
			
			if(!(b1 || b2 || b3 || b4))
				return;
				
			command.push(GraphicsPathCommand.MOVE_TO);
			if(b1 && b2 && b3 && b4)
			{
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,0);
				return;
			}
			
			if(b4 && !b1 && b2)
			{
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_cy+_cx*_ny/_nx);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+_cy*_nx/_ny,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				return;
			}
			
			if(b1 && !b2 && b3)
			{
				trace(4);
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+_cy*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_cy+(_cx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,h);
				return;
			}
			
			if(b2 && !b3 && b4)
			{
				coord.push(0,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_cy+(_cx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+(_cy-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				return;
			}
			
			if(b3 && !b4 && b1)
			{
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+(_cy-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_cy+_cx*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				return;
			}
			
			if(!b4 && b1 && !b2)
			{
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+_cy*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_cy+_cx*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,0);
				return;
			}
			
			if(!b1 && b2 && !b3)
			{
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_cy+(_cx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+_cy*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				return;
			}
			
			if(!b2 && b3 && !b4)
			{
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+(_cy-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_cy+(_cx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,h);
				return;
			}
			
			if(b1 && b2)
			{
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_cy+(_cx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_cy+_cx*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,0);
				return;
			}
			
			if(b2 && b3)
			{
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+(_cy-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+_cy*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				return;
			}
			
			if(b3 && b4)
			{
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_cy+_cx*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_cy+(_cx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,h);
				return;
			}
			
			if(b4 && b1)
			{
				coord.push(0,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+_cy*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_cx+(_cy-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				return;
			}
		}
		// ========================================================== //
	}
}