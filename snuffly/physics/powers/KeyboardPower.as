package snuffly.physics.powers
{
	import snuffly.physics.core.*;
	import flash.display.Sprite;
	import flash.events.KeyboardEvent;
	import flash.ui.Keyboard;
	//Управление с помощью клавиатуры
	public class KeyboardPower implements IPower
	{
		protected var pt:Vector.<BaseParticle>;
		protected var ptCount:int;
		
		//Сила по разным направлениям
		public var kLeft:Number;
		public var kRight:Number;
		public var kDown:Number;
		public var kUp:Number;
		public var keyboardContainer:Sprite;	//Слушатель клавиатуры
		
		protected var moveLeft:Boolean;
		protected var moveRight:Boolean;
		protected var moveDown:Boolean;
		protected var moveUp:Boolean;
		// ========================================================== //
		public function KeyboardPower(particles:IParticleGroup, keyboardContainer:Sprite, kUp:Number, kDown:Number=-1, kLeft:Number=-1, kRight:Number=-1):void
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
			keyboardContainer.stage.addEventListener(KeyboardEvent.KEY_DOWN,KeyDown);
			keyboardContainer.stage.addEventListener(KeyboardEvent.KEY_UP,KeyUp);
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
			var p:BaseParticle;
			var i:int;
			var dx:Number;
			var dy:Number;
			var diff:Number;
			var d:Number;
			var qd:Number;
			
			if(moveLeft||moveUp||moveRight||moveDown)
			{
				for(i=0;i<ptCount;i++)
				{
					p=pt[i];
					if(!p.isStatic)
					{
						if(moveLeft)		p.nx-=kLeft;
						else if(moveRight)	p.nx+=kRight;
						if(moveDown)		p.ny+=kDown;
						else if(moveUp)		p.ny-=kUp;
					}
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
			}
		}
		// ========================================================== //
	}
}