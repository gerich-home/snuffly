package snuffly.editor
{
	import flash.display.*;
	import flash.events.*;
	import flash.ui.*;
	import flash.geom.*;
	import fl.containers.*;
	import fl.controls.*;
	import fl.data.*;
	import fl.events.*;
	import snuffly.game.core.*;
	import snuffly.game.drawers.*;
	import snuffly.game.powers.*;
	import snuffly.game.utils.*;
	import Box2D.Dynamics.*;
	import Box2D.Collision.Shapes.*;
	import Box2D.Collision.*;
	import Box2D.Common.Math.*;
	import Box2D.Common.*;
	//Редактор уровней
	public class LevelEditor extends Level
	{
		private var stage:Stage;
		private var container:DisplayObjectContainer;
		private var fluidbmp:Bitmap;
		private var lib:Array/* of Class*/;
		private var space:Boolean;
		
		private var uicontainer:BaseScrollPane;
		private var geomlist:List;
		
		private var level:Object;
		
		private var testing:Boolean;
		private var offsetX:Number;
		private var offsetY:Number;
		
		private var currentGroup:IParticleGroup;
		// ========================================================== //
		public function LevelEditor(stage:Stage,container:DisplayObjectContainer,fluidbmp:Bitmap,lib:Array):void
		{
			this.container=container;
			this.fluidbmp=fluidbmp;
			this.lib=lib;
			this.stage=stage;
			testing=false;
			
			clearLevel();
			initUI();
			
			container.addEventListener(KeyboardEvent.KEY_DOWN,KeyDown);
			container.addEventListener(KeyboardEvent.KEY_UP,KeyUp);
			container.addEventListener(FocusEvent.FOCUS_OUT,FocusLost);
			
			offsetX=stage.stageWidth*0.5;
			offsetY=stage.stageHeight*0.5;
			
			
			super();
		}
		// ========================================================== //
		//Очищаем/инициализируем информацию об уровне
		private function clearLevel():void
		{
			level=	{
						bounds:
						{
							lower:{x:-100.0*b2Settings.b2_pixelScale,y:-100.0*b2Settings.b2_pixelScale},
							upper:{x: 100.0*b2Settings.b2_pixelScale,y: 100.0*b2Settings.b2_pixelScale}
						},
						gravity:{x:0,y:0.2*b2Settings.b2_pixelScale},
						static:
						{
							graphics:new Array(),
							geom:new Array()
						},
						dynamic:new Array()
					};
			trace(XML(level).toXMLString());
		}
		// ========================================================== //
		//Инициализируем UI
		private function initUI():void
		{
			fluidbmp.visible=false;
			
			uicontainer=new BaseScrollPane();
			uicontainer.mouseChildren = true;
			uicontainer.mouseEnabled = true;
			uicontainer.visible=true;
			uicontainer.x=0;
			uicontainer.y=0;
			uicontainer.width=stage.stageWidth/3;
			uicontainer.height=stage.stageHeight;
			
			var l:Label=new Label();
			l.text="Редактор уровней";
			l.x=0;
			l.y=0;
			l.width=120;
			l.height=20;
			l.visible=true;
			uicontainer.addChild(l);
			
			var graphlist:List=new List();
			graphlist.visible=true;
			graphlist.x=0;
			graphlist.y=l.height+1;
			
			var dp:DataProvider=new DataProvider(lib);
			graphlist.dataProvider=dp;
			graphlist.buttonMode=false;
			graphlist.height=200;
			graphlist.addEventListener(fl.events.ListEvent.ITEM_DOUBLE_CLICK,newSprite);
			uicontainer.addChild(graphlist);
			
			geomlist=new List();
			geomlist.visible=true;
			geomlist.x=0;
			geomlist.y=graphlist.y+graphlist.height+1;
			geomlist.height=stage.stageHeight-geomlist.y;
			geomlist.buttonMode=false;
			geomlist.dataProvider=new DataProvider();
			
			uicontainer.addChild(geomlist);
			stage.addChild(uicontainer);
		}
		// ========================================================== //
		//Добавляем спрайт
		private function newSprite(event:ListEvent):void
		{
			var element:Class=event.item.factory;
			var sprite:DisplayObject=new element();
			sprite.x=offsetX;
			sprite.y=offsetY;
			container.addChild(sprite);
		}
		// ========================================================== //
		//Создаём мир
		public override function init():void
		{
			powers=new Vector.<IPower>;
			drawablesCount=new Vector.<IDrawable>;
		}
		// ========================================================== //
		//Шаг симуляции физики
		public override function step():void
		{
			
		}
		// ========================================================== //
		//Прорисовка
		public override function draw():void
		{
			
		}
		// ========================================================== //
		//Нажатие кнопок
		public function KeyDown(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case Keyboard.SPACE:	space=    true; break;
			}
		}
		// ========================================================== //
		public function KeyUp(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case Keyboard.SPACE:	space=    false; break;
			}
		}
		// ========================================================== //
		public function FocusLost(e:FocusEvent):void
		{
			space=  false;
		}
		// ========================================================== //
	}
}	