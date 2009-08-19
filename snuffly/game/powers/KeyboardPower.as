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
		public var keyboardContainer:DisplayObject;	//Слушатель клавиатуры
		
		public var cx:Number;				//Центр масс
		public var cy:Number;
		
		protected var moveLeft:Boolean;
		protected var moveRight:Boolean;
		protected var moveDown:Boolean;
		protected var moveUp:Boolean;
		protected var compress:Boolean;
		// ========================================================== //
		public function KeyboardPower(particles:IParticleGroup, keyboardContainer:DisplayObject, kUp:Number, kDown:Number=-1, kLeft:Number=-1, kRight:Number=-1):void
		{
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
			moveLeft=false;
			moveRight=false;
			moveUp=false;
			moveDown=false;
			compress=false;
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
			ptCount=pt.length;
			cx=event.cx;
			cy=event.cy;
		}
		// ========================================================== //
		public function applyPower():void
		{
			var p:b2Body;
			var i:int;
			var px:Number;
			var py:Number;
			var dx:Number;
			var dy:Number;
			var cx:Number;
			var cy:Number;
			var b:Boolean=moveLeft||moveRight||compress)
			if(b||moveUp||moveDown)
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
					p.ApplyForceToCenter(dx,dy);
				}
			}
		}
		// ========================================================== //
		//Нажатие кнопок
		public function KeyDown(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case Keyboard.LEFT:		moveLeft= true; break;
				case Keyboard.UP:		moveUp=   true; break;
				case Keyboard.RIGHT:	moveRight=true; break;
				case Keyboard.DOWN:		moveDown= true; break;
				case Keyboard.SPACE:	compress= true; break;
			}
		}
		// ========================================================== //
		public function KeyUp(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case Keyboard.LEFT:		moveLeft= false; break;
				case Keyboard.UP:		moveUp=   false; break;
				case Keyboard.RIGHT:	moveRight=false; break;
				case Keyboard.DOWN:		moveDown= false; break;
				case Keyboard.SPACE:	compress= false; break;
			}
		}
		// ========================================================== //
		public function FocusLost(e:FocusEvent):void
		{
			moveLeft= false;
			moveUp=   false;
			moveRight=false;
			moveDown= false;
			compress= false;
		}
		// ========================================================== //
	}
}
