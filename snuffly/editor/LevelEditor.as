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
		
		private var scrollbar_width:Number=17;
		private var ui_height:Number;
		
		private var ui_container:Sprite;
		private var scroller:Sprite;
		private var scrollbar:ScrollBar;
		private var info:Label;
		private var resource_label:Label;
		private var resource_list:List;
		private var static_geom_label:Label;
		private var static_geom_list:List;
		private var static_graphics_label:Label;
		private var static_graphics_list:List;
		private var dynamic_geom_label:Label;
		private var dynamic_geom_list:List;
		private var dynamic_graphics_label:Label;
		private var dynamic_graphics_list:List;
		
		var libdp:DataProvider;
		var static_geom_dp:DataProvider;
		var static_graphics_dp:DataProvider;
		var dynamic_objects_dp:DataProvider;
		var dynamic_geom_dp:DataProvider;
		var dynamic_graphics_dp:DataProvider;
		
		private var level:Object;
		
		private var testing:Boolean=true;
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
			
			libdp=new DataProvider(lib);
			
			clearLevel();
			initUI();
			changeMode(false);
			
			container.addEventListener(KeyboardEvent.KEY_DOWN,KeyDown);
			container.addEventListener(KeyboardEvent.KEY_UP,KeyUp);
			container.addEventListener(FocusEvent.FOCUS_OUT,FocusLost);
			
			offsetX=stage.stageWidth*0.5;
			offsetY=stage.stageHeight*0.5;
			
			scrollerwnd();
			//message();
			super();
		}
		// ========================================================== //
		private function message():void
		{
			var messagewnd:EditorWindow;
			
			messagewnd=new ModalWindow(0xCCCCCC,0.8);
			messagewnd.width=300;
			messagewnd.height=100;
			messagewnd.x=100;
			messagewnd.y=100;
			var titlebar:Sprite;
			var graphics:Graphics;
			titlebar=new Sprite();
			graphics=titlebar.graphics;
			graphics.beginFill(0x999999,1);
			graphics.drawRect(0,0,300,10);
			graphics.endFill();
			messagewnd.addChild(titlebar);
			titlebar.addEventListener(MouseEvent.MOUSE_DOWN,function(){
																		messagewnd.startDrag()
																		});
			titlebar.addEventListener(MouseEvent.MOUSE_UP,function(){
																		messagewnd.stopDrag();
																		});
			
			var l:Label;
			l=new Label();
			l.text="Редактор уровней v1.0";
			l.width=152;
			l.x=(messagewnd.width-l.width)*0.5;
			l.y=(messagewnd.height-l.height)*0.5;
			
			var butOK:Button;
			butOK=new Button();
			butOK.addEventListener(ComponentEvent.BUTTON_DOWN,function(){
																			message();
																		});
			butOK.x=messagewnd.width*0.5-butOK.width-2;
			butOK.y=messagewnd.height-butOK.height-10;
			butOK.label="New";
			messagewnd.addChild(butOK);
			
			var butCancel:Button;
			butCancel=new Button();
			butCancel.addEventListener(ComponentEvent.BUTTON_DOWN,function(){
																				stage.removeChild(messagewnd);
																			});
			butCancel.x=messagewnd.width*0.5+2
			butCancel.y=messagewnd.height-butCancel.height-10;
			butCancel.label="Close";
			messagewnd.addChild(butCancel);
			
			messagewnd.addChild(l);
			
			messagewnd.addEventListener(MouseEvent.MOUSE_DOWN,function(e:MouseEvent){
																		if(stage.contains(messagewnd))
																			if((e.target!=butOK)&&(e.target!=butCancel))
																				stage.setChildIndex(messagewnd,stage.numChildren-1);
																		});
			stage.addChild(messagewnd);
		}
		// ========================================================== //
		private function scrollerwnd():void
		{
			var scrollerwnd:ScrollerWindow;
			
			scrollerwnd=new ScrollerWindow(0xCCCCCC,0.8);
			scrollerwnd.width=300;
			scrollerwnd.height=100;
			scrollerwnd.x=100;
			scrollerwnd.y=100;
			
			var butOK:Button;
			butOK=new Button();
			butOK.x=(scrollerwnd.width-butOK.width)*0.5;
			butOK.y=0;
			butOK.label="1";
			scrollerwnd.addChild(butOK);
			
			butOK=new Button();
			butOK.x=(scrollerwnd.width-butOK.width)*0.5;
			butOK.y=40;
			butOK.label="2";
			scrollerwnd.addChild(butOK);
			
			butOK=new Button();
			butOK.x=(scrollerwnd.width-butOK.width)*0.5;
			butOK.y=80;
			butOK.label="3";
			scrollerwnd.addChild(butOK);
			
			butOK=new Button();
			butOK.x=(scrollerwnd.width-butOK.width)*0.5;
			butOK.y=120;
			butOK.label="4";
			scrollerwnd.addChild(butOK);
			
			butOK=new Button();
			butOK.x=(scrollerwnd.width-butOK.width)*0.5;
			butOK.y=160;
			butOK.label="5";
			scrollerwnd.addChild(butOK);
			
			scrollerwnd.scrollerHeight=200;
			
			stage.addChild(scrollerwnd);
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
						static_objects:
						{
							graphics:new Array(),
							geom:new Array()
						},
						dynamic_objects:new Array()
					};
			static_graphics_dp=new DataProvider(level.static_objects.graphics);
			static_geom_dp=new DataProvider(level.static_objects.geom);
			dynamic_objects_dp=new DataProvider(level.dynamic_objects);
		}
		// ========================================================== //
		//Инициализируем UI
		private function initUI():void
		{
			var nexty:Number=0;
			var smallgap:Number=0;
			var largegap:Number=2;
			
			var width:Number;
			var height:Number;
			
			var graphics:Graphics;
			
			width=stage.stageWidth/3;
			height=stage.stageHeight;
			
			ui_container=new Sprite();
			ui_container.visible=false;
			ui_container.x=0;
			ui_container.y=0;
			graphics=ui_container.graphics;
			graphics.clear();
			graphics.beginFill(0xFFFFFF,0.8);
			graphics.drawRect(0,0,width,height);
			graphics.endFill();
			
			scroller=new Sprite();
			scroller.x=0;
			scroller.y=0;
			ui_container.addChild(scroller);
			
			scrollbar=new ScrollBar();
			scrollbar.x=width-scrollbar_width;
			scrollbar.y=0;
			scrollbar.width=scrollbar_width;
			scrollbar.height=height;
			scrollbar.enabled=true;
			scrollbar.minScrollPosition=0;
			scrollbar.addEventListener(Event.SCROLL,scroll);
			ui_container.addChild(scrollbar);
			
			width-=scrollbar_width;
			
			info=new Label();
			info.text="Редактор уровней";
			info.x=0;
			info.y=nexty;
			info.width=width;
			scroller.addChild(info);
			nexty+=info.height+largegap;
			
			resource_label=new Label();
			resource_label.text="Ресурсы";
			resource_label.x=0;
			resource_label.y=nexty;
			resource_label.width=width;
			scroller.addChild(resource_label);
			nexty+=resource_label.height+smallgap;
			
			resource_list=new List();
			resource_list.x=0;
			resource_list.y=nexty;
			resource_list.width=width;
			resource_list.height=200;
			resource_list.dataProvider=libdp;
			resource_list.buttonMode=false;
			resource_list.addEventListener(fl.events.ListEvent.ITEM_DOUBLE_CLICK,newSprite);
			scroller.addChild(resource_list);
			nexty+=resource_list.height+largegap;
			
			static_geom_label=new Label();
			static_geom_label.text="Статичная геометрия";
			static_geom_label.x=0;
			static_geom_label.y=nexty;
			static_geom_label.width=width;
			scroller.addChild(static_geom_label);
			nexty+=static_geom_label.height+smallgap;
			
			static_geom_list=new List();
			static_geom_list.x=0;
			static_geom_list.y=nexty;
			static_geom_list.width=width;
			static_geom_list.height=200;
			static_geom_list.dataProvider=static_geom_dp;
			static_geom_list.buttonMode=false;
			scroller.addChild(static_geom_list);
			nexty+=static_geom_list.height+largegap;
			
			
			static_graphics_label=new Label();
			static_graphics_label.text="Статичная графика";
			static_graphics_label.x=0;
			static_graphics_label.y=nexty;
			static_graphics_label.width=width;
			scroller.addChild(static_graphics_label);
			nexty+=static_graphics_label.height+smallgap;
			
			static_graphics_list=new List();
			static_graphics_list.x=0;
			static_graphics_list.y=nexty;
			static_graphics_list.width=width;
			static_geom_list.height=200;
			static_graphics_list.dataProvider=static_graphics_dp;
			static_graphics_list.buttonMode=false;
			scroller.addChild(static_graphics_list);
			nexty+=static_graphics_list.height+largegap;
			
			ui_height=nexty;
			
			if(ui_height>height)
			{
				scrollbar.enabled=true;
				scrollbar.maxScrollPosition=ui_height-height;
			}
			else
				scrollbar.enabled=false;
			
			stage.addChild(ui_container);
		}
		// ========================================================== //
		//Переключение между режимом тестирования и создания уровня
		private function changeMode(mode:Boolean):void
		{
			if((!testing)&&(mode))
			{
				stage.scaleMode = StageScaleMode.SHOW_ALL;
				stage.removeEventListener(Event.RESIZE,resize);
				trace("тут должна быть инициализация мира!");
			}
			else
				if((testing)&&(!mode))
				{
					stage.scaleMode = StageScaleMode.NO_SCALE;
					stage.addEventListener(Event.RESIZE,resize);
					trace("тут должно быть удаление мира и отображение debug-графики!");
				}
				
			testing=mode;
			
			ui_container.visible = !testing;
			fluidbmp.visible = testing;
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
			if(testing)
			{				
				var i:int;
				for(i=0;i<powersCount;i++)
					powers[i].applyPower();
				world.Step(dt,velocityIterations,positionIterations);
			}
		}
		// ========================================================== //
		//Прорисовка
		public override function draw():void
		{
			if(testing)
			{
				var i:int;
				for(i=0;i<drawablesCount;i++)
					drawables[i].draw();
			}
			/*else			//прорисовка геометрии
			{
				
			}*/
		}
		// ========================================================== //
		//Нажатие кнопок
		private function KeyDown(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case Keyboard.SPACE:	space=    true; break;
			}
		}
		// ========================================================== //
		private function KeyUp(e:KeyboardEvent):void
		{
			switch(e.keyCode)
			{
				case Keyboard.SPACE:	space=    false; break;
			}
		}
		// ========================================================== //
		private function FocusLost(e:FocusEvent):void
		{
			space=  false;
		}
		// ========================================================== //
		private function resize(e:Event):void
		{
			var width:Number;
			var height:Number;
			
			
			width=stage.stageWidth;
			height=stage.stageHeight;
			
			width=stage.stageWidth/3;
			height=stage.stageHeight;
			var graphics:Graphics;
			graphics=ui_container.graphics;
			graphics.clear();
			graphics.beginFill(0xFFFFFF,0.8);
			graphics.drawRect(0,0,width,height);
			graphics.endFill();
			
			ui_container.x=-(stage.stageWidth-550)*0.5;
			ui_container.y=-(stage.stageHeight-400)*0.5;
			
			scrollbar.x=width-scrollbar_width;
			scrollbar.height=height;
			if(ui_height>height)
			{
				scrollbar.enabled=true;
				scrollbar.maxScrollPosition=ui_height-height;
				scrollbar.scrollPosition=-scroller.y;
				scroller.y=-scrollbar.scrollPosition;
			}
			else
				scrollbar.enabled=false;
			width-=scrollbar_width;
			
			info.width=width;
			resource_label.width=width;
			resource_list.width=width;
			static_geom_label.width=width;
			static_geom_list.width=width;
			static_graphics_label.width=width;
			static_graphics_list.width=width;
		}
		// ========================================================== //
		private function scroll(e:ScrollEvent):void
		{
			scroller.y=-scrollbar.scrollPosition;
		}
		// ========================================================== //
	}
}