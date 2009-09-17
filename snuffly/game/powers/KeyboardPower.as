package snuffly.game.powers
{
	import Box2D.Dynamics.*;
	import Box2D.Common.Math.*;
	import snuffly.game.core.*;
	import flash.display.DisplayObject;
	import flash.events.KeyboardEvent;
	import flash.events.FocusEvent;
	import flash.ui.Keyboard;
	//Управление с помощью клавиатуры
	public class KeyboardPower implements IPower
	{
		protected var pt:Vector.<b2Body>;
		protected var ptCount:int;
		
		//Сила по разным направлениям
		public var kLeft:Number;
		public var kRight:Number;
		public var kDown:Number;
		public var kUp:Number;
		public var kCompress:Number;
		public var kRotate:Number;
		public var kRotateLeft:Number;
		public var kRotateRight:Number;
		public var keyboardContainer:DisplayObject;	//Слушатель клавиатуры
		
		protected var rotateLeft:Boolean;
		protected var rotateRight:Boolean;
		protected var moveLeft:Boolean;
		protected var moveRight:Boolean;
		protected var moveDown:Boolean;
		protected var moveUp:Boolean;
		protected var compress:Boolean;
		protected var cntrl:Boolean;
		
		protected var cmCalc:CMCalculator;						//Вычислитель центра масс
		// ========================================================== //
		public function KeyboardPower(particles:IParticleGroup, cmCalc:CMCalculator, keyboardContainer:DisplayObject, kCompress:Number=0.1, kRotate:Number = 0.0005, kRotateLeft:Number=0.01, kRotateRight:Number=0.1, kUp:Number=0.18, kDown:Number=-1, kLeft:Number=-1, kRight:Number=-1):void
		{
			this.kCompress=kCompress;
			this.kRotate=kRotate;
			this.kRotateLeft=kRotateLeft;
			this.kRotateRight=kRotateRight;
			this.kUp = kUp;
			if(kDown<0)
				this.kDown=kUp;
			else
				this.kDown=kDown;
			if(kLeft<0)
				this.kLeft=kUp;
			else
				this.kLeft=kLeft;
			if(kRight<0)
				this.kRight=this.kLeft;
			else
				this.kRight=kRight;
			this.keyboardContainer=keyboardContainer;
			this.cmCalc=cmCalc;
			
			rotateLeft=false;
			rotateRight=false;
			moveLeft=false;
			moveRight=false;
			moveUp=false;
			moveDown=false;
			compress=false;
			cntrl=false;
			keyboardContainer.addEventListener(KeyboardEvent.KEY_DOWN,KeyDown);
			keyboardContainer.addEventListener(KeyboardEvent.KEY_UP,KeyUp);
			keyboardContainer.addEventListener(FocusEvent.FOCUS_OUT,FocusLost);
			particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
		}
		// ========================================================== //
		//Изменены частицы
		protected function particlesChanged(event:ParticleGroupEvent):void
		{
			pt=event.particles;
			ptCount=pt.length;		}
		// ========================================================== //
		public function applyPower():void
		{
			var sqrt:Function=Math.sqrt;
			var p:b2Body;
			var i:int;
			var px:Number;
			var py:Number;
			var fx:Number;
			var fy:Number;
			var d:Number;
			var dk:Number;
			var dx:Number;
			var dy:Number;
			var vx:Number;
			var vy:Number;
			var w:Number;
			
			var cx:Number=cmCalc.cx;
			var cy:Number=cmCalc.cy;
			var cvx:Number=cmCalc.vx;
			var cvy:Number=cmCalc.vy;
			var vec:b2Vec2;
			var b1:Boolean=rotateLeft||rotateRight;
			var b2:Boolean=b1||compress;
			if(b2||moveLeft||moveRight||moveUp||moveDown)
			{
				px=0;
				py=0;
				if(moveLeft)		px=-kLeft;
				else if(moveRight)	px=kRight;
				if(moveDown)		py=kDown;
				else if(moveUp)		py=-kUp;
				
				for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					fx=px;
					fy=py;
					if(b2)
					{
						vec=p.GetPosition();
						dx=vec.x-cx;
						dy=vec.y-cy;
						if(compress)
						{
							dk=kCompress;
							fx-=dx*dk;
							fy-=dy*dk;
						}
						if(b1)
						{
							d=sqrt(dx*dx+dy*dy);
							if(d>0)
							{
								d=1/d;
								vec=p.GetLinearVelocity();
								vx=vec.x-cvx;
								vy=vec.y-cvy;
								w=sqrt(vx*vx+vy*vy)*d;
								if(w>1.5)
								{
									w*=w*kRotate;
									dk=0;
								}
								else
								{
									if(rotateLeft)
										dk=kRotateLeft;
									else
										dk=-kRotateRight;
									w*=w*(w*0.6666)*kRotate;
								}
								fx+=dy*dk-dx*w;
								fy-=dx*dk+dy*w;
							}
						}
					}
					p.ApplyForceToCenter(fx,fy);
				}
			}
		}
		// ========================================================== //
		//Нажатие кнопок
		public function KeyDown(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case 65:				moveLeft=    true; break;
				case 87:				moveUp=      true; break;
				case 68:				moveRight=   true; break;
				case 83:				moveDown=    true; break;
				case Keyboard.LEFT:		rotateLeft=  true; break;
				case Keyboard.RIGHT:	rotateRight= true; break;
				case Keyboard.SPACE:	compress=    true; break;
			}
		}
		// ========================================================== //
		public function KeyUp(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case 65:				moveLeft=    false; break;
				case 87:				moveUp=      false; break;
				case 68:				moveRight=   false; break;
				case 83:				moveDown=    false; break;
				case Keyboard.SPACE:	compress=    false; break;
				case Keyboard.LEFT:		rotateLeft=  false; break;
				case Keyboard.RIGHT:	rotateRight= false; break;
			}
		}
		// ========================================================== //
		public function FocusLost(e:FocusEvent):void
		{
			rotateLeft=  false;
			rotateRight= false;
			moveLeft=    false;
			moveUp=      false;
			moveRight=   false;
			moveDown=    false;
			compress=    false;
			cntrl=       false;
		}
		// ========================================================== //
	}
}
