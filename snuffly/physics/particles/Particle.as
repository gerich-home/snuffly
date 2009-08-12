package snuffly.physics.particles
{
	import snuffly.physics.core.*;
	import flash.display.Shape;
	import flash.display.Sprite;
	import flash.events.MouseEvent;
	//Частица, рисуемая на спрайте
	public class Particle extends BaseParticle implements IDrawable
	{
		protected var _r:Number;			//Радиус
		protected var _color:uint;			//Цвет
		protected var _alpha:Number;		//Прозрачность
		protected var _borderWidth:uint;	//Ширина окружности
		protected var _borderColor:uint;	//Цвет окружности
		protected var _borderAlpha:Number;	//Прозрачность окружности
		
		private var circle:Sprite;
		private var stateFlag:Boolean;
		// ========================================================== //
		public function Particle(container:Sprite, xx:Number, yy:Number, m:Number=1, isStatic:Boolean=false, r:Number = 4,color:uint=0xFFD22B,alpha:Number=1,borderWidth:uint=1,borderColor:uint=0,borderAlpha:Number=1, visible:Boolean=true):void
		{
			this._r = r;
			this._color = color;
			this._alpha = alpha;
			this._borderWidth = borderWidth;
			this._borderColor = borderColor;
			this._borderAlpha = borderAlpha;
			stateFlag=false;
			
			super(xx,yy,m,isStatic);
			
			circle=new Sprite();
			container.addChild(circle);
			
			circle.x=xx;
			circle.y=yy;
			
			redrawSprite();
			circle.visible=visible;
			circle.addEventListener(MouseEvent.MOUSE_DOWN,MouseDown);
			
		}
		// ========================================================== //
		//Статичная точка
		public override function set isStatic(_isStatic:Boolean):void 
		{
			this._isStatic=_isStatic;
			stateFlag=!_isStatic;
		}
		// ========================================================== //
		//Радиус
		public function get r():Number 
		{
			return _r;
		}
		// ========================================================== //
		public function set r(_r:Number):void 
		{
			this._r=_r;
			redrawSprite();
		}
		// ========================================================== //
		//Цвет
		public function get color():uint 
		{
			return _color;
		}
		// ========================================================== //
		public function set color(_color:uint):void 
		{
			this._color=_color;
			redrawSprite();
		}
		// ========================================================== //
		//Прозрачность
		public function get alpha():Number 
		{
			return _alpha;
		}
		// ========================================================== //
		public function set alpha(_alpha:Number):void 
		{
			this._alpha=_alpha;
			redrawSprite();
		}
		// ========================================================== //
		//Ширина окружности
		public function get borderWidth():uint 
		{
			return _borderWidth;
		}
		// ========================================================== //
		public function set borderWidth(_borderWidth:uint):void 
		{
			this._borderWidth=_borderWidth;
			redrawSprite();
		}
		// ========================================================== //
		//Цвет окружности
		public function get borderColor():uint 
		{
			return _borderColor;
		}
		// ========================================================== //
		public function set borderColor(_borderColor:uint):void 
		{
			this._borderColor=_borderColor;
			redrawSprite();
		}
		// ========================================================== //
		//Прозрачность окружности
		public function get borderAlpha():Number 
		{
			return _borderAlpha;
		}
		// ========================================================== //
		public function set borderAlpha(_borderAlpha:Number):void 
		{
			this._borderAlpha=_borderAlpha;
			redrawSprite();
		}
		// ========================================================== //
		//Видима?
		public function get visible():Boolean 
		{
			return circle.visible;
		}
		// ========================================================== //
		public function set visible(_visible:Boolean):void 
		{
			circle.visible=_visible;
		}
		// ========================================================== //
		protected function redrawSprite():void 
		{
			circle.graphics.clear();
			circle.graphics.lineStyle(_borderWidth, _borderColor,_borderAlpha);
			circle.graphics.beginFill(_color,_alpha);
			circle.graphics.drawCircle(0, 0, _r);
			circle.graphics.endFill();
		}
		// ========================================================== //
		public override function draw():void 
		{
			circle.x=xx;
			circle.y=yy;
		}
		// ========================================================== //
		//Обработка таскания мышкой
		private function MouseDown(event:MouseEvent):void 
		{
			if (_isStatic)
				stateFlag=false;
			else
			{
				_isStatic = true;
				stateFlag = true;
			}
			
			circle.stage.addEventListener(MouseEvent.MOUSE_MOVE, dragParticle);
			circle.stage.addEventListener(MouseEvent.MOUSE_UP, dropParticle);
		}
		// ========================================================== //
		private function dragParticle(event:MouseEvent):void
		{
			var xPos:int = event.stageX;
			var yPos:int = event.stageY;
			
			ox = xx;
			oy = yy;
			
			vx = 0;
			vy = 0;
			
			xx = xPos;
			yy = yPos;
		}
		// ========================================================== //
		private function dropParticle(event:MouseEvent):void 
		{
			if (stateFlag) _isStatic = false;

			stateFlag = false;
			
			ox = xx;
			oy = yy;
			
			circle.stage.removeEventListener(MouseEvent.MOUSE_MOVE, dragParticle);
			circle.stage.removeEventListener(MouseEvent.MOUSE_UP, dropParticle);
		}
		// ========================================================== //
	}
}