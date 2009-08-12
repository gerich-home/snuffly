package snuffly.physics.powers
{
	import snuffly.physics.core.*;
	import flash.display.Shape;
	import flash.display.GraphicsPathCommand;
	import flash.display.GraphicsPathWinding;
	//Сила архимеда
	public class ArchimedPower implements IPower , IDrawable
	{
		protected var _rg:Number;				//Выталкивающая сила
		protected var _levelx:Number;			//Точка уровня(на поверхности жидкости)
		protected var _levely:Number;
		protected var _nx:Number;				//Перпендикуляр к плоскости жидкости
		protected var _ny:Number;
		protected var _px:Number;				//Вектор силы(направлен по перпендикуляру)
		protected var _py:Number;
		public var particles:IParticleGroup;	//Точки, на которые действует сила архимеда
		protected var pt:Vector.<BaseParticle>;
		protected var ptCount:int;
		
		protected var command:Vector.<int>;
		protected var coord:Vector.<Number>;
		
		public var waterColor:uint;		//Цвет воды
		public var waterAlpha:Number;	//Прозрачность воды
		public var visible:Boolean;		//Рисуем ли?
		public var canvas:Shape;		//Где рисуем
		// ========================================================== //
		public function ArchimedPower(canvas:Shape, particles:IParticleGroup,levely:Number,levelx:Number=0,rg:Number=0.3,ny:Number=-1,nx:Number=0,waterColor:uint=0x0000FF,waterAlpha:Number=0.2, visible=true):void
		{
			this.canvas=canvas;
			this.particles=particles;
			this._rg=rg;
			this._levelx=levelx;
			this._levely=levely;
			this._nx=nx
			this._ny=ny;
			this.waterColor=waterColor;
			this.waterAlpha=waterAlpha;
			this.visible=visible;
			recalcPath();
			recalcPower();
		}
		// ========================================================== //
		//Пересчёт вектора силы
		protected function recalcPower():void
		{
			var l:Number;
			l=_rg/Math.sqrt(_nx*_nx+_ny*_ny);
			_px=_nx*l;
			_py=_ny*l;
		}
		// ========================================================== //
		//Изменение нормали
		public function setNormal(_nx:Number,_ny:Number):void 
		{
			this._nx=_nx;
			this._ny=_ny;
			recalcPower();
			recalcPath();
		}
		// ========================================================== //
		//Изменение уровня
		public function setLevel(_levelx:Number,_levely:Number):void 
		{
			this._levelx=_levelx;
			this._levely=_levely;
			recalcPath();
		}
		// ========================================================== //
		//Изменение нормали и уровня
		public function setNormalAndLevel(_nx:Number,_ny:Number,_levelx:Number,_levely:Number):void 
		{
			this._nx=_nx;
			this._ny=_ny;
			this._levelx=_levelx;
			this._levely=_levely;
			recalcPower();
			recalcPath();
		}
		// ========================================================== //
		//Выталкивающая сила
		public function get rg():Number 
		{
			return _rg;
		}
		// ========================================================== //
		public function set rg(_rg:Number):void 
		{
			this._rg=_rg;
			recalcPower();
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
		//Точка на поверхности воды - координата x
		public function get levelx():Number 
		{
			return _levelx;
		}
		// ========================================================== //
		//Точка на поверхности воды - координата y
		public function get levely():Number 
		{
			return _levely;
		}
		// ========================================================== //
		//Применяем силу
		public function applyPower():void
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
					p.nx+=_px;
					p.ny+=_py;
				}
			}
		}
		// ========================================================== //
		//Рисуем воду
		public function draw():void
		{
			if (visible)
			{
				canvas.graphics.beginFill(waterColor,waterAlpha);
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
			b1=(_levelx*_nx     +_levely*_ny>0);
			b2=((_levelx-w)*_nx +_levely*_ny>0);
			b3=((_levelx-w)*_nx +(_levely-h)*_ny>0);
			b4=(_levelx*_nx     +(_levely-h)*_ny>0);
			
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
				coord.push(0,_levely+_levelx*_ny/_nx);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_levelx+_levely*_nx/_ny,0);
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
				coord.push(_levelx+_levely*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_levely+(_levelx-w)*_nx/_ny);
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
				coord.push(w,_levely+(_levelx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_levelx+(_levely-h)*_ny/_nx,h);
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
				coord.push(_levelx+(_levely-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_levely+_levelx*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				return;
			}
			
			if(!b4 && b1 && !b2)
			{
				coord.push(0,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_levelx+_levely*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_levely+_levelx*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,0);
				return;
			}
			
			if(!b1 && b2 && !b3)
			{
				coord.push(w,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_levely+(_levelx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_levelx+_levely*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,0);
				return;
			}
			
			if(!b2 && b3 && !b4)
			{
				coord.push(w,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_levelx+(_levely-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_levely+(_levelx-w)*_nx/_ny);
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
				coord.push(w,_levely+(_levelx-w)*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,_levely+_levelx*_nx/_ny);
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
				coord.push(_levelx+(_levely-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_levelx+_levely*_ny/_nx,0);
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
				coord.push(0,_levely+_levelx*_nx/_ny);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(w,_levely+(_levelx-w)*_nx/_ny);
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
				coord.push(_levelx+_levely*_ny/_nx,0);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(_levelx+(_levely-h)*_ny/_nx,h);
				command.push(GraphicsPathCommand.LINE_TO);
				coord.push(0,h);
				return;
			}
		}
		// ========================================================== //
	}
	
}