package snuffly.editor
{
	import flash.display.*;
	import flash.events.*;
	import flash.ui.*;
	import flash.geom.*;
	import flash.text.*;
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
		
		private var editor_panel:EditorWindow;
		private var level_panel:ScrollerWindow;
		private var graphics_panel:ScrollerWindow;
		private var geom_panel:ScrollerWindow;
		private var stick_panel:ScrollerWindow;
		private var dynamic_panel:ScrollerWindow;
		private var resource_panel:ScrollerWindow;
		
		private var level_info_label:Label;
		private var level_bounds_label:Label;
		private var level_upper_bound_label:Label;
		private var level_lower_bound_label:Label;
		private var level_upperx_bound_label:Label;
		private var level_upperx_bound_text:TextInput;
		private var level_lowerx_bound_label:Label;
		private var level_lowerx_bound_text:TextInput;
		private var level_uppery_bound_label:Label;
		private var level_uppery_bound_text:TextInput;
		private var level_lowery_bound_label:Label;
		private var level_lowery_bound_text:TextInput;
		private var level_gravity_label:Label;
		private var level_gravityx_label:Label;
		private var level_gravityx_text:TextInput;
		private var level_gravityy_label:Label;
		private var level_gravityy_text:TextInput;
		private var level_static_geom_label:Label;
		private var level_static_geom_list:List;
		private var level_static_geom_add_button:Button;
		private var level_static_geom_rem_button:Button;
		private var level_static_graphics_label:Label;
		private var level_static_graphics_list:List;
		private var level_static_graphics_add_button:Button;
		private var level_static_graphics_rem_button:Button;
		private var level_static_stick_label:Label;
		private var level_static_stick_list:List;
		private var level_static_stick_add_button:Button;
		private var level_static_stick_rem_button:Button;
		private var level_dynamic_label:Label;
		private var level_dynamic_list:List;
		private var level_dynamic_add_button:Button;
		private var level_dynamic_rem_button:Button;
		
		private var graphics_info_label:Label;
		private var graphics_name_label:Label;
		private var graphics_name_text:TextInput;
		private var graphics_res_label:Label;
		private var graphics_res_name_label:Label;
		private var graphics_res_set_button:Button;
		private var graphics_position_label:Label;
		private var graphics_x_label:Label;
		private var graphics_x_text:Label;
		private var graphics_y_label:Label;
		private var graphics_y_text:Label;
		private var graphics_rot_label:Label;
		private var graphics_rot_text:Label;
		private var graphics_ok_button:Button;
		private var graphics_cancel_button:Button;
		
		private var geom_info_label:Label;
		private var geom_name_label:Label;
		private var geom_name_text:TextInput;
		private var geom_material_label:Label;
		private var geom_friction_label:Label;
		private var geom_friction_text:TextInput;
		private var geom_restitution_label:Label;
		private var geom_restitution_text:TextInput;
		private var geom_ok_button:Button;
		private var geom_cancel_button:Button;
		
		private var stick_info_label:Label;
		private var stick_name_label:Label;
		private var stick_name_text:TextInput;
		private var stick_params_label:Label;
		private var stick_d_label:Label;
		private var stick_d_text:TextInput;
		private var stick_k_label:Label;
		private var stick_k_text:TextInput;
		private var stick_ok_button:Button;
		private var stick_cancel_button:Button;
		
		private var dynamic_info_label:Label;
		private var dynamic_name_label:Label;
		private var dynamic_name_text:TextInput;
		private var dynamic_geom_label:Label;
		private var dynamic_geom_list:List;
		private var dynamic_geom_add_button:Button;
		private var dynamic_geom_rem_button:Button;
		private var dynamic_graphics_label:Label;
		private var dynamic_graphics_list:List;
		private var dynamic_graphics_add_button:Button;
		private var dynamic_graphics_rem_button:Button;
		private var dynamic_stick_label:Label;
		private var dynamic_stick_list:List;
		private var dynamic_stick_add_button:Button;
		private var dynamic_stick_rem_button:Button;
		private var dynamic_ok_button:Button;
		private var dynamic_cancel_button:Button;
		
		private var resource_info_label:Label;
		private var resource_list:List;
		private var resource_ok_button:Button;
		private var resource_cancel_button:Button;
		
		var lib_dp:DataProvider;
		var static_geom_dp:DataProvider;
		var static_graphics_dp:DataProvider;
		var static_stick_dp:DataProvider;
		var dynamic_dp:DataProvider;
		var dynamic_geom_dp:DataProvider;
		var dynamic_graphics_dp:DataProvider;
		var dynamic_stick_dp:DataProvider;
		
		private var panel_stack:Array;
		private var object_stack:Array;
		private var active_panel:ScrollerWindow;
		private var active_object:Object;
		
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
			
			lib_dp=new DataProvider(lib);
			
			clearLevel();
			initGUI();
			setupListeners();
			changeMode(false);
			
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
						static_objects:
						{
							graphics:new Array(),
							stick:new Array(),
							geom:new Array()
						},
						dynamic_objects:new Array()
					};
			static_graphics_dp=new DataProvider(level.static_objects.graphics);
			static_geom_dp=new DataProvider(level.static_objects.geom);
			static_stick_dp=new DataProvider(level.static_objects.stick);
			dynamic_dp=new DataProvider(level.dynamic_objects);
		}
		// ========================================================== //
		//Переход в другое окно редактора
		private function showPanel(panel:ScrollerWindow):void
		{
			active_panel.visible=false;
			panel_stack.push(active_panel);
			active_panel=panel;
			active_panel.visible=true;
		}
		// ========================================================== //
		//Возврат назад
		private function hidePanel():void
		{
			if(panel_stack.length>0)
			{
				active_panel.visible=false;
				active_panel=panel_stack.pop();
				active_panel.visible=true;
			}
		}
		// ========================================================== //
		//Загрузка объекта в редактор
		private function loadInfo(info:Object):void
		{
			object_stack.push(active_object);
			active_object=info;
		}
		// ========================================================== //
		//Выгрузка объекта из редактора
		private function unloadInfo():void
		{
			if(object_stack.length>0)
				active_object=object_stack.pop();
		}
		// ========================================================== //
		//Загрузка инфы о статичной графике
		private function load_graphics_panel(info:Object):void
		{
			loadInfo(info);
			graphics_name_text.text=info.label;
			if(info.res)
				graphics_res_name_label.text="["+info.res.label+"]";
			else
				graphics_res_name_label.text="[]";
			graphics_x_text.text=info.x;
			graphics_y_text.text=info.y;
			graphics_rot_text.text=info.rot;
		}
		// ========================================================== //
		//Новый объект статичной графики
		private function new_graphics_object():Object
		{
			var info:Object={};
			info.label="Новый объект";
			info.res=null;
			info.x=0;
			info.y=0;
			info.rot=0;
			return info;
		}
		// ========================================================== //
		//Загрузка инфы о статичной геометрии
		private function load_geom_panel(info:Object):void
		{
			loadInfo(info);
			geom_name_text.text=info.label;
			geom_friction_text.text=info.friction;
			geom_restitution_text.text=info.restitution;
		}
		// ========================================================== //
		//Новый объект статичной геометрии
		private function new_geom_object():Object
		{
			var info:Object={};
			info.label="Новый объект";
			info.friction=0.5;
			info.restitution=0.3;
			return info;
		}
		// ========================================================== //
		//Загрузка инфы о области липкости
		private function load_stick_panel(info:Object):void
		{
			loadInfo(info);
			stick_name_text.text=info.label;
			stick_k_text.text=info.k;
			stick_d_text.text=info.d;
		}
		// ========================================================== //
		//Новый объект области липкости
		private function new_stick_object():Object
		{
			var info:Object={};
			info.label="Новый объект";
			info.k=1;
			info.d=5;
			return info;
		}
		// ========================================================== //
		//Загрузка инфы о динамическом объекте
		private function load_dynamic_panel(info:Object):void
		{
			loadInfo(info);
			dynamic_name_text.text=info.label;
			dynamic_graphics_dp=new DataProvider(info.graphics);
			dynamic_stick_dp=new DataProvider(info.stick);
			dynamic_geom_dp=new DataProvider(info.geom);
			dynamic_graphics_list.dataProvider=dynamic_graphics_dp;
			dynamic_stick_list.dataProvider=dynamic_stick_dp;
			dynamic_geom_list.dataProvider=dynamic_geom_dp;
		}
		// ========================================================== //
		//Новый динамический объект
		private function new_dynamic_object():Object
		{
			var info:Object={};
			info.label="Новый объект";
			info.graphics=new Array();
			info.stick=new Array();
			info.geom=new Array();
			return info;
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
			
			editor_panel.visible = !testing;
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
			editor_panel.height=stage.stageHeight;
			level_panel.height=stage.stageHeight;
			graphics_panel.height=stage.stageHeight;
			geom_panel.height=stage.stageHeight;
			stick_panel.height=stage.stageHeight;
			dynamic_panel.height=stage.stageHeight;
			resource_panel.height=stage.stageHeight;
		}
		// ========================================================== //
		private function stick_ok_button_Clicked(e:MouseEvent):void
		{
			active_object.label=stick_name_text.text;
			active_object.k=stick_k_text.text;
			active_object.d=stick_d_text.text;
			if(active_object.dp)
			{
				active_object.dp.addItem(active_object);
				active_object.dp=null;
			}
			if(active_object.owner)
			{
				active_object.owner.replaceItem(active_object,active_object);
				active_object.owner=null;
			}
			unloadInfo();
			hidePanel();
		}
		// ========================================================== //
		private function stick_cancel_button_Clicked(e:MouseEvent):void
		{
			hidePanel();
		}
		// ========================================================== //
		private function resource_ok_button_Clicked(e:MouseEvent):void
		{
			var item:Object=resource_list.selectedItem;
			if(item)
			{
				active_object.res=item;
				graphics_res_name_label.text="["+active_object.res.label+"]";
			}
			else
				graphics_res_name_label.text="[]";
			hidePanel();
		}
		// ========================================================== //
		private function resource_cancel_button_Clicked(e:MouseEvent):void
		{
			hidePanel();
		}
		// ========================================================== //
		private function graphics_ok_button_Clicked(e:MouseEvent):void
		{
			active_object.label=graphics_name_text.text;
			if(active_object.dp)
			{
				active_object.dp.addItem(active_object);
				active_object.dp=null;
			}
			if(active_object.owner)
			{
				active_object.owner.replaceItem(active_object,active_object);
				active_object.owner=null;
			}
			unloadInfo();
			hidePanel();
		}
		// ========================================================== //
		private function graphics_cancel_button_Clicked(e:MouseEvent):void
		{
			hidePanel();
		}
		// ========================================================== //
		private function geom_ok_button_Clicked(e:MouseEvent):void
		{
			active_object.label=geom_name_text.text;
			active_object.friction=geom_friction_text.text;
			active_object.restitution=geom_restitution_text.text;
			if(active_object.dp)
			{
				active_object.dp.addItem(active_object);
				active_object.dp=null;
			}
			if(active_object.owner)
			{
				active_object.owner.replaceItem(active_object,active_object);
				active_object.owner=null;
			}
			unloadInfo();
			hidePanel();
		}
		// ========================================================== //
		private function geom_cancel_button_Clicked(e:MouseEvent):void
		{
			hidePanel();
		}
		// ========================================================== //
		private function level_static_stick_rem_button_Clicked(e:MouseEvent):void
		{
			var item:Object=level_static_stick_list.selectedItem;
			if(item)
				level_static_stick_list.removeItem(item);
		}
		// ========================================================== //
		private function level_static_stick_add_button_Clicked(e:MouseEvent):void
		{
			load_stick_panel(new_stick_object());
			active_object.dp=static_stick_dp;
			showPanel(stick_panel);
		}
		// ========================================================== //
		private function level_static_graphics_rem_button_Clicked(e:MouseEvent):void
		{
			var item:Object=level_static_graphics_list.selectedItem;
			if(item)
				level_static_graphics_list.removeItem(item);
		}
		// ========================================================== //
		private function level_static_graphics_add_button_Clicked(e:MouseEvent):void
		{
			load_graphics_panel(new_graphics_object());
			active_object.dp=static_graphics_dp;
			showPanel(graphics_panel);
		}
		// ========================================================== //
		private function level_static_geom_rem_button_Clicked(e:MouseEvent):void
		{
			var item:Object=level_static_geom_list.selectedItem;
			if(item)
				level_static_geom_list.removeItem(item);
		}
		// ========================================================== //
		private function level_static_geom_add_button_Clicked(e:MouseEvent):void
		{
			load_geom_panel(new_geom_object());
			active_object.dp=static_geom_dp;
			showPanel(geom_panel);
		}
		// ========================================================== //
		private function level_dynamic_rem_button_Clicked(e:MouseEvent):void
		{
			var item:Object=level_dynamic_list.selectedItem;
			if(item)
				level_dynamic_list.removeItem(item);
		}
		// ========================================================== //
		private function level_dynamic_add_button_Clicked(e:MouseEvent):void
		{
			load_dynamic_panel(new_dynamic_object());
			active_object.dp=dynamic_dp;
			showPanel(dynamic_panel);
		}
		// ========================================================== //
		private function graphics_res_set_button_Clicked(e:MouseEvent):void
		{
			resource_list.selectedItem=active_object.res;
			showPanel(resource_panel);
		}
		// ========================================================== //
		private function dynamic_stick_rem_button_Clicked(e:MouseEvent):void
		{
			var item:Object=dynamic_stick_list.selectedItem;
			if(item)
				dynamic_stick_list.removeItem(item);
		}
		// ========================================================== //
		private function dynamic_stick_add_button_Clicked(e:MouseEvent):void
		{
			load_stick_panel(new_stick_object());
			active_object.dp=dynamic_stick_list.dataProvider;
			showPanel(stick_panel);
		}
		// ========================================================== //
		private function dynamic_graphics_rem_button_Clicked(e:MouseEvent):void
		{
			var item:Object=dynamic_graphics_list.selectedItem;
			if(item)
				dynamic_graphics_list.removeItem(item);
		}
		// ========================================================== //
		private function dynamic_graphics_add_button_Clicked(e:MouseEvent):void
		{
			load_graphics_panel(new_graphics_object());
			active_object.dp=dynamic_graphics_list.dataProvider;
			showPanel(graphics_panel);
		}
		// ========================================================== //
		private function dynamic_geom_rem_button_Clicked(e:MouseEvent):void
		{
			var item:Object=dynamic_geom_list.selectedItem;
			if(item)
				dynamic_geom_list.removeItem(item);
		}
		// ========================================================== //
		private function dynamic_geom_add_button_Clicked(e:MouseEvent):void
		{
			load_geom_panel(new_geom_object());
			active_object.dp=dynamic_geom_list.dataProvider;
			showPanel(geom_panel);
		}
		// ========================================================== //
		private function dynamic_ok_button_Clicked(e:MouseEvent):void
		{
			active_object.label=dynamic_name_text.text;
			active_object.geom=dynamic_geom_list.dataProvider.toArray();
			active_object.graphics=dynamic_graphics_list.dataProvider.toArray();
			active_object.stick=dynamic_stick_list.dataProvider.toArray();
			if(active_object.dp)
			{
				active_object.dp.addItem(active_object);
				active_object.dp=null;
			}
			if(active_object.owner)
			{
				active_object.owner.replaceItem(active_object,active_object);
				active_object.owner=null;
			}
			unloadInfo();
			hidePanel();
		}
		// ========================================================== //
		private function dynamic_cancel_button_Clicked(e:MouseEvent):void
		{
			hidePanel();
		}
		// ========================================================== //
		private function level_static_stick_list_dblClicked(e:ListEvent):void
		{
			load_stick_panel(e.item);
			e.item.owner=static_stick_dp;
			showPanel(stick_panel);
		}
		// ========================================================== //
		private function level_static_geom_list_dblClicked(e:ListEvent):void
		{
			load_geom_panel(e.item);
			e.item.owner=static_geom_dp;
			showPanel(geom_panel);
		}
		// ========================================================== //
		private function level_static_graphics_list_dblClicked(e:ListEvent):void
		{
			load_graphics_panel(e.item);
			e.item.owner=static_graphics_dp;
			showPanel(graphics_panel);
		}
		// ========================================================== //
		private function level_dynamic_list_dblClicked(e:ListEvent):void
		{
			load_dynamic_panel(e.item);
			e.item.owner=dynamic_dp;
			showPanel(dynamic_panel);
		}
		// ========================================================== //
		private function dynamic_stick_list_dblClicked(e:ListEvent):void
		{
			load_stick_panel(e.item);
			e.item.owner=dynamic_stick_dp;
			showPanel(stick_panel);
		}
		// ========================================================== //
		private function dynamic_geom_list_dblClicked(e:ListEvent):void
		{
			load_geom_panel(e.item);
			e.item.owner=dynamic_geom_dp;
			showPanel(geom_panel);
		}
		// ========================================================== //
		private function dynamic_graphics_list_dblClicked(e:ListEvent):void
		{
			load_graphics_panel(e.item);
			e.item.owner=dynamic_graphics_dp;
			showPanel(graphics_panel);
		}
		// ========================================================== //
		private function resource_list_dblClicked(e:ListEvent):void
		{
			var item:Object=resource_list.selectedItem;
			if(item)
			{
				active_object.res=item;
				graphics_res_name_label.text="["+active_object.res.label+"]";
			}
			else
				graphics_res_name_label.text="[]";
			hidePanel();
		}
		// ========================================================== //
		private function setupListeners():void
		{
			stick_ok_button.addEventListener(MouseEvent.CLICK,stick_ok_button_Clicked)
			stick_cancel_button.addEventListener(MouseEvent.CLICK,stick_cancel_button_Clicked)
			resource_ok_button.addEventListener(MouseEvent.CLICK,resource_ok_button_Clicked)
			resource_cancel_button.addEventListener(MouseEvent.CLICK,resource_cancel_button_Clicked)
			graphics_ok_button.addEventListener(MouseEvent.CLICK,graphics_ok_button_Clicked)
			graphics_cancel_button.addEventListener(MouseEvent.CLICK,graphics_cancel_button_Clicked)
			geom_ok_button.addEventListener(MouseEvent.CLICK,geom_ok_button_Clicked)
			geom_cancel_button.addEventListener(MouseEvent.CLICK,geom_cancel_button_Clicked)
			level_static_stick_rem_button.addEventListener(MouseEvent.CLICK,level_static_stick_rem_button_Clicked)
			level_static_stick_add_button.addEventListener(MouseEvent.CLICK,level_static_stick_add_button_Clicked)
			level_static_graphics_rem_button.addEventListener(MouseEvent.CLICK,level_static_graphics_rem_button_Clicked)
			level_static_graphics_add_button.addEventListener(MouseEvent.CLICK,level_static_graphics_add_button_Clicked)
			level_static_geom_rem_button.addEventListener(MouseEvent.CLICK,level_static_geom_rem_button_Clicked)
			level_static_geom_add_button.addEventListener(MouseEvent.CLICK,level_static_geom_add_button_Clicked)
			level_dynamic_rem_button.addEventListener(MouseEvent.CLICK,level_dynamic_rem_button_Clicked)
			level_dynamic_add_button.addEventListener(MouseEvent.CLICK,level_dynamic_add_button_Clicked)
			graphics_res_set_button.addEventListener(MouseEvent.CLICK,graphics_res_set_button_Clicked)
			dynamic_stick_rem_button.addEventListener(MouseEvent.CLICK,dynamic_stick_rem_button_Clicked)
			dynamic_stick_add_button.addEventListener(MouseEvent.CLICK,dynamic_stick_add_button_Clicked)
			dynamic_graphics_rem_button.addEventListener(MouseEvent.CLICK,dynamic_graphics_rem_button_Clicked)
			dynamic_graphics_add_button.addEventListener(MouseEvent.CLICK,dynamic_graphics_add_button_Clicked)
			dynamic_geom_rem_button.addEventListener(MouseEvent.CLICK,dynamic_geom_rem_button_Clicked)
			dynamic_geom_add_button.addEventListener(MouseEvent.CLICK,dynamic_geom_add_button_Clicked)
			dynamic_ok_button.addEventListener(MouseEvent.CLICK,dynamic_ok_button_Clicked)
			dynamic_cancel_button.addEventListener(MouseEvent.CLICK,dynamic_cancel_button_Clicked)
			level_static_stick_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,level_static_stick_list_dblClicked)
			level_static_geom_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,level_static_geom_list_dblClicked)
			level_static_graphics_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,level_static_graphics_list_dblClicked)
			level_dynamic_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,level_dynamic_list_dblClicked)
			dynamic_stick_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,dynamic_stick_list_dblClicked)
			dynamic_geom_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,dynamic_geom_list_dblClicked)
			dynamic_graphics_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,dynamic_graphics_list_dblClicked)
			resource_list.addEventListener(ListEvent.ITEM_DOUBLE_CLICK,resource_list_dblClicked)
		}
		// ========================================================== //
		private function initGUI():void
		{
	 
			var nexty:Number=0;
			var smallgap:Number=1;
			var largegap:Number=4;
			var scroller_width:Number=17;
			
			var width_with_scrollbars:Number=stage.stageWidth/3;
			var width:Number=width_with_scrollbars-scroller_width;
			var height:Number=stage.height;
			
			var control_width:Number=width-largegap*2;
			var label_text_proportions:Number=0.09;
			var label_width:Number=(width-largegap*2+smallgap)*label_text_proportions;
			var button_width:Number=(width-largegap*2+smallgap)*0.5;
			var button_x:Number=button_width+largegap+smallgap;
			var text_width:Number=(width-largegap*2+smallgap)*(1-label_text_proportions);
			var text_x:Number=label_width+largegap+smallgap;
			
			var biglabel_text_proportions:Number=0.42;
			var biglabel_width:Number=(width-largegap*2+smallgap)*biglabel_text_proportions;
			var bigtext_width:Number=(width-largegap*2+smallgap)*(1-biglabel_text_proportions);
			var bigtext_x:Number=biglabel_width+largegap+smallgap;
			
			var list_height:Number=120;
			
			var container:DisplayObjectContainer;
			
			editor_panel=new EditorWindow(0xCCCCCC,0.2);
			editor_panel.width=width_with_scrollbars;
			editor_panel.height=height;
			editor_panel.x=0;
			editor_panel.y=0;
			
			
			// ****************** Главное окно *********************
			
			level_panel=new ScrollerWindow(0xCCCCCC,0.2,0xCCCCCC,0.01,scroller_width);
			level_panel.width=width_with_scrollbars;
			level_panel.height=height;
			level_panel.x=0;
			level_panel.y=0;
			level_panel.visible=false;
			container=level_panel.container;
			
			level_info_label=new Label();
			level_info_label.text="Редактор уровней";
			level_info_label.x=largegap;
			level_info_label.y=nexty;
			level_info_label.width=control_width;
			container.addChild(level_info_label);
			nexty+=level_info_label.height+largegap;
			
			level_bounds_label=new Label();
			level_bounds_label.text="Границы";
			level_bounds_label.x=largegap;
			level_bounds_label.y=nexty;
			level_bounds_label.width=control_width;
			container.addChild(level_bounds_label);
			nexty+=level_bounds_label.height+smallgap;
			
			level_upper_bound_label=new Label();
			level_upper_bound_label.text="Верхняя";
			level_upper_bound_label.x=largegap;
			level_upper_bound_label.y=nexty;
			level_upper_bound_label.width=control_width;
			container.addChild(level_upper_bound_label);
			nexty+=level_upper_bound_label.height+smallgap;
			
			level_upperx_bound_label=new Label();
			level_upperx_bound_label.text="x:";
			level_upperx_bound_label.x=largegap;
			level_upperx_bound_label.y=nexty;
			level_upperx_bound_label.width=label_width;
			container.addChild(level_upperx_bound_label);
			
			level_upperx_bound_text=new TextInput();
			level_upperx_bound_text.text=level.bounds.upper.x;
			level_upperx_bound_text.x=text_x;
			level_upperx_bound_text.y=nexty;
			level_upperx_bound_text.width=text_width;
			level_upperx_bound_text.height=level_upperx_bound_label.height;
			container.addChild(level_upperx_bound_text);
			nexty+=Math.max(level_upperx_bound_label.height,level_upperx_bound_text.height)+smallgap;
			
			level_uppery_bound_label=new Label();
			level_uppery_bound_label.text="y:";
			level_uppery_bound_label.x=largegap;
			level_uppery_bound_label.y=nexty;
			level_uppery_bound_label.width=label_width;
			container.addChild(level_uppery_bound_label);
			
			level_uppery_bound_text=new TextInput();
			level_uppery_bound_text.text=level.bounds.upper.y;
			level_uppery_bound_text.x=text_x;
			level_uppery_bound_text.y=nexty;
			level_uppery_bound_text.width=text_width;
			level_uppery_bound_text.height=level_uppery_bound_label.height;
			container.addChild(level_uppery_bound_text);
			nexty+=Math.max(level_uppery_bound_label.height,level_uppery_bound_text.height)+smallgap;
			
			level_lower_bound_label=new Label();
			level_lower_bound_label.text="Нижняя";
			level_lower_bound_label.x=largegap;
			level_lower_bound_label.y=nexty;
			level_lower_bound_label.width=control_width;
			container.addChild(level_lower_bound_label);
			nexty+=level_lower_bound_label.height+smallgap;
			
			level_lowerx_bound_label=new Label();
			level_lowerx_bound_label.text="x:";
			level_lowerx_bound_label.x=largegap;
			level_lowerx_bound_label.y=nexty;
			level_lowerx_bound_label.width=label_width;
			container.addChild(level_lowerx_bound_label);
			
			level_lowerx_bound_text=new TextInput();
			level_lowerx_bound_text.text=level.bounds.lower.x;
			level_lowerx_bound_text.x=text_x;
			level_lowerx_bound_text.y=nexty;
			level_lowerx_bound_text.width=text_width;
			level_lowerx_bound_text.height=level_lowerx_bound_label.height;
			container.addChild(level_lowerx_bound_text);
			nexty+=Math.max(level_lowerx_bound_label.height,level_lowerx_bound_text.height)+smallgap;
			
			level_lowery_bound_label=new Label();
			level_lowery_bound_label.text="y:";
			level_lowery_bound_label.x=largegap;
			level_lowery_bound_label.y=nexty;
			level_lowery_bound_label.width=label_width;
			container.addChild(level_lowery_bound_label);
			
			level_lowery_bound_text=new TextInput();
			level_lowery_bound_text.text=level.bounds.lower.y;
			level_lowery_bound_text.x=text_x;
			level_lowery_bound_text.y=nexty;
			level_lowery_bound_text.width=text_width;
			level_lowery_bound_text.height=level_lowery_bound_label.height;
			container.addChild(level_lowery_bound_text);
			nexty+=Math.max(level_lowery_bound_label.height,level_lowery_bound_text.height)+smallgap;
			
			level_gravity_label=new Label();
			level_gravity_label.text="Гравитация";
			level_gravity_label.x=largegap;
			level_gravity_label.y=nexty;
			level_gravity_label.width=control_width;
			container.addChild(level_gravity_label);
			nexty+=level_gravity_label.height+smallgap;
			
			level_gravityx_label=new Label();
			level_gravityx_label.text="x:";
			level_gravityx_label.x=largegap;
			level_gravityx_label.y=nexty;
			level_gravityx_label.width=label_width;
			container.addChild(level_gravityx_label);
			
			level_gravityx_text=new TextInput();
			level_gravityx_text.text=level.gravity.x;
			level_gravityx_text.x=text_x;
			level_gravityx_text.y=nexty;
			level_gravityx_text.width=text_width;
			level_gravityx_text.height=level_gravityx_label.height;
			container.addChild(level_gravityx_text);
			nexty+=Math.max(level_gravityx_label.height,level_gravityx_text.height)+smallgap;
			
			level_gravityy_label=new Label();
			level_gravityy_label.text="y:";
			level_gravityy_label.x=largegap;
			level_gravityy_label.y=nexty;
			level_gravityy_label.width=label_width;
			container.addChild(level_gravityy_label);
			
			level_gravityy_text=new TextInput();
			level_gravityy_text.text=level.gravity.y;
			level_gravityy_text.x=text_x;
			level_gravityy_text.y=nexty;
			level_gravityy_text.width=text_width;
			level_gravityy_text.height=level_gravityy_label.height;
			container.addChild(level_gravityy_text);
			nexty+=Math.max(level_gravityy_label.height,level_gravityy_text.height)+smallgap;
			
			level_static_geom_label=new Label();
			level_static_geom_label.text="Статичная геометрия";
			level_static_geom_label.x=largegap;
			level_static_geom_label.y=nexty;
			level_static_geom_label.width=control_width;
			container.addChild(level_static_geom_label);
			nexty+=level_static_geom_label.height+smallgap;
			
			level_static_geom_list=new List();
			level_static_geom_list.dataProvider=static_geom_dp;
			level_static_geom_list.buttonMode=false;
			level_static_geom_list.x=largegap;
			level_static_geom_list.y=nexty;
			level_static_geom_list.width=control_width;
			level_static_geom_list.height=list_height;
			container.addChild(level_static_geom_list);
			nexty+=level_static_geom_list.height+smallgap;
			
			level_static_geom_add_button=new Button();
			level_static_geom_add_button.label="Добавить"
			level_static_geom_add_button.x=largegap;
			level_static_geom_add_button.y=nexty;
			level_static_geom_add_button.width=button_width;
			container.addChild(level_static_geom_add_button);
			
			level_static_geom_rem_button=new Button();
			level_static_geom_rem_button.label="Удалить"
			level_static_geom_rem_button.x=button_x;
			level_static_geom_rem_button.y=nexty;
			level_static_geom_rem_button.width=button_width;
			container.addChild(level_static_geom_rem_button);
			nexty+=Math.max(level_static_geom_add_button.height,level_static_geom_rem_button.height)+smallgap;
			
			
			level_static_graphics_label=new Label();
			level_static_graphics_label.text="Статичная графика";
			level_static_graphics_label.x=largegap;
			level_static_graphics_label.y=nexty;
			level_static_graphics_label.width=control_width;
			container.addChild(level_static_graphics_label);
			nexty+=level_static_graphics_label.height+smallgap;
			
			level_static_graphics_list=new List();
			level_static_graphics_list.dataProvider=static_graphics_dp;
			level_static_graphics_list.buttonMode=false;
			level_static_graphics_list.x=largegap;
			level_static_graphics_list.y=nexty;
			level_static_graphics_list.width=control_width;
			level_static_graphics_list.height=list_height;
			container.addChild(level_static_graphics_list);
			nexty+=level_static_graphics_list.height+smallgap;
			
			level_static_graphics_add_button=new Button();
			level_static_graphics_add_button.label="Добавить"
			level_static_graphics_add_button.x=largegap;
			level_static_graphics_add_button.y=nexty;
			level_static_graphics_add_button.width=button_width;
			container.addChild(level_static_graphics_add_button);
			
			level_static_graphics_rem_button=new Button();
			level_static_graphics_rem_button.label="Удалить"
			level_static_graphics_rem_button.x=button_x;
			level_static_graphics_rem_button.y=nexty;
			level_static_graphics_rem_button.width=button_width;
			container.addChild(level_static_graphics_rem_button);
			nexty+=Math.max(level_static_graphics_add_button.height,level_static_graphics_rem_button.height)+smallgap;
			
			level_static_stick_label=new Label();
			level_static_stick_label.text="Статичные обл. липкости";
			level_static_stick_label.x=largegap;
			level_static_stick_label.y=nexty;
			level_static_stick_label.width=control_width;
			container.addChild(level_static_stick_label);
			nexty+=level_static_stick_label.height+smallgap;
			
			level_static_stick_list=new List();
			level_static_stick_list.dataProvider=static_stick_dp;
			level_static_stick_list.buttonMode=false;
			level_static_stick_list.x=largegap;
			level_static_stick_list.y=nexty;
			level_static_stick_list.width=control_width;
			level_static_stick_list.height=list_height;
			container.addChild(level_static_stick_list);
			nexty+=level_static_stick_list.height+smallgap;
			
			level_static_stick_add_button=new Button();
			level_static_stick_add_button.label="Добавить"
			level_static_stick_add_button.x=largegap;
			level_static_stick_add_button.y=nexty;
			level_static_stick_add_button.width=button_width;
			container.addChild(level_static_stick_add_button);
			
			level_static_stick_rem_button=new Button();
			level_static_stick_rem_button.label="Удалить"
			level_static_stick_rem_button.x=button_x;
			level_static_stick_rem_button.y=nexty;
			level_static_stick_rem_button.width=button_width;
			container.addChild(level_static_stick_rem_button);
			nexty+=Math.max(level_static_stick_add_button.height,level_static_stick_rem_button.height)+smallgap;
			level_panel.scrollerHeight=nexty+largegap;
			
			
			level_dynamic_label=new Label();
			level_dynamic_label.text="Динамические объекты";
			level_dynamic_label.x=largegap;
			level_dynamic_label.y=nexty;
			level_dynamic_label.width=control_width;
			container.addChild(level_dynamic_label);
			nexty+=level_dynamic_label.height+smallgap;
			
			level_dynamic_list=new List();
			level_dynamic_list.dataProvider=dynamic_dp;
			level_dynamic_list.buttonMode=false;
			level_dynamic_list.x=largegap;
			level_dynamic_list.y=nexty;
			level_dynamic_list.width=control_width;
			level_dynamic_list.height=list_height;
			container.addChild(level_dynamic_list);
			nexty+=level_dynamic_list.height+smallgap;
			
			level_dynamic_add_button=new Button();
			level_dynamic_add_button.label="Добавить"
			level_dynamic_add_button.x=largegap;
			level_dynamic_add_button.y=nexty;
			level_dynamic_add_button.width=button_width;
			container.addChild(level_dynamic_add_button);
			
			level_dynamic_rem_button=new Button();
			level_dynamic_rem_button.label="Удалить"
			level_dynamic_rem_button.x=button_x;
			level_dynamic_rem_button.y=nexty;
			level_dynamic_rem_button.width=button_width;
			container.addChild(level_dynamic_rem_button);
			nexty+=Math.max(level_dynamic_add_button.height,level_dynamic_rem_button.height)+smallgap;
			
			
			level_panel.scrollerHeight=nexty+largegap;
			editor_panel.container.addChild(level_panel);
			
			// ****************** Графика *********************
			
			graphics_panel=new ScrollerWindow(0xCCCCCC,0.2,0xCCCCCC,0.01,scroller_width);
			graphics_panel.width=width_with_scrollbars;
			graphics_panel.height=height;
			graphics_panel.x=0;
			graphics_panel.y=0;
			graphics_panel.visible=false;
			container=graphics_panel.container;
			nexty=0;
			
			graphics_info_label=new Label();
			graphics_info_label.text="Графика";
			graphics_info_label.x=largegap;
			graphics_info_label.y=nexty;
			graphics_info_label.width=control_width;
			container.addChild(graphics_info_label);
			nexty+=graphics_info_label.height+largegap;
			
			graphics_name_label=new Label();
			graphics_name_label.text="Название объекта";
			graphics_name_label.x=largegap;
			graphics_name_label.y=nexty;
			graphics_name_label.width=control_width;
			container.addChild(graphics_name_label);
			nexty+=graphics_name_label.height+smallgap;
			
			graphics_name_text=new TextInput();
			graphics_name_text.text="";
			graphics_name_text.x=largegap;
			graphics_name_text.y=nexty;
			graphics_name_text.width=control_width;
			container.addChild(graphics_name_text);
			nexty+=graphics_name_text.height+smallgap;
			
			graphics_res_label=new Label();
			graphics_res_label.text="Ресурс";
			graphics_res_label.x=largegap;
			graphics_res_label.y=nexty;
			graphics_res_label.width=control_width;
			container.addChild(graphics_res_label);
			nexty+=graphics_res_label.height+smallgap;
			
			graphics_res_name_label=new Label();
			graphics_res_name_label.text="[]";
			graphics_res_name_label.x=largegap;
			graphics_res_name_label.y=nexty;
			graphics_res_name_label.width=control_width;
			container.addChild(graphics_res_name_label);
			nexty+=graphics_res_name_label.height+smallgap;
			
			graphics_res_set_button=new Button();
			graphics_res_set_button.label="Выбрать";
			graphics_res_set_button.x=button_x;
			graphics_res_set_button.y=nexty;
			graphics_res_set_button.width=button_width;
			container.addChild(graphics_res_set_button);
			nexty+=graphics_res_set_button.height+smallgap;
			
			
			graphics_position_label=new Label();
			graphics_position_label.text="Положение";
			graphics_position_label.x=largegap;
			graphics_position_label.y=nexty;
			graphics_position_label.width=control_width;
			container.addChild(graphics_position_label);
			nexty+=graphics_position_label.height+smallgap;
			
			graphics_x_label=new Label();
			graphics_x_label.text="x:";
			graphics_x_label.x=largegap;
			graphics_x_label.y=nexty;
			graphics_x_label.width=biglabel_width;
			container.addChild(graphics_x_label);
			
			graphics_x_text=new Label();
			graphics_x_text.text="";
			graphics_x_text.x=bigtext_x;
			graphics_x_text.y=nexty;
			graphics_x_text.width=bigtext_width;
			graphics_x_text.height=graphics_x_label.height;
			container.addChild(graphics_x_text);
			nexty+=Math.max(graphics_x_label.height,graphics_x_text.height)+smallgap;
			
			graphics_y_label=new Label();
			graphics_y_label.text="y:";
			graphics_y_label.x=largegap;
			graphics_y_label.y=nexty;
			graphics_y_label.width=biglabel_width;
			container.addChild(graphics_y_label);
			
			graphics_y_text=new Label();
			graphics_y_text.text="";
			graphics_y_text.x=bigtext_x;
			graphics_y_text.y=nexty;
			graphics_y_text.width=bigtext_width;
			graphics_y_text.height=graphics_y_label.height;
			container.addChild(graphics_y_text);
			nexty+=Math.max(graphics_y_label.height,graphics_y_text.height)+smallgap;
			
			graphics_rot_label=new Label();
			graphics_rot_label.text="rot:";
			graphics_rot_label.x=largegap;
			graphics_rot_label.y=nexty;
			graphics_rot_label.width=biglabel_width;
			container.addChild(graphics_rot_label);
			
			graphics_rot_text=new Label();
			graphics_rot_text.text="";
			graphics_rot_text.x=bigtext_x;
			graphics_rot_text.y=nexty;
			graphics_rot_text.width=bigtext_width;
			graphics_rot_text.height=graphics_rot_label.height;
			container.addChild(graphics_rot_text);
			nexty+=Math.max(graphics_rot_label.height,graphics_rot_text.height)+smallgap;
			
			graphics_ok_button=new Button();
			graphics_ok_button.label="OK"
			graphics_ok_button.x=largegap;
			graphics_ok_button.y=nexty;
			graphics_ok_button.width=button_width;
			container.addChild(graphics_ok_button);
			
			graphics_cancel_button=new Button();
			graphics_cancel_button.label="Отмена"
			graphics_cancel_button.x=button_x;
			graphics_cancel_button.y=nexty;
			graphics_cancel_button.width=button_width;
			container.addChild(graphics_cancel_button);
			nexty+=Math.max(graphics_ok_button.height,graphics_cancel_button.height)+smallgap;
			
			
			graphics_panel.scrollerHeight=nexty+largegap;
			editor_panel.container.addChild(graphics_panel);
			
			
			// ****************** Геометрия *********************
			
			geom_panel=new ScrollerWindow(0xCCCCCC,0.2,0xCCCCCC,0.01,scroller_width);
			geom_panel.width=width_with_scrollbars;
			geom_panel.height=height;
			geom_panel.x=0;
			geom_panel.y=0;
			geom_panel.visible=false;
			container=geom_panel.container;
			nexty=0;
			
			geom_info_label=new Label();
			geom_info_label.text="Геометрия";
			geom_info_label.x=largegap;
			geom_info_label.y=nexty;
			geom_info_label.width=control_width;
			container.addChild(geom_info_label);
			nexty+=geom_info_label.height+largegap;
			
			geom_name_label=new Label();
			geom_name_label.text="Название объекта";
			geom_name_label.x=largegap;
			geom_name_label.y=nexty;
			geom_name_label.width=control_width;
			container.addChild(geom_name_label);
			nexty+=geom_name_label.height+smallgap;
			
			geom_name_text=new TextInput();
			geom_name_text.text="";
			geom_name_text.x=largegap;
			geom_name_text.y=nexty;
			geom_name_text.width=control_width;
			container.addChild(geom_name_text);
			nexty+=geom_name_text.height+smallgap;
			
			geom_material_label=new Label();
			geom_material_label.text="Свойства материала";
			geom_material_label.x=largegap;
			geom_material_label.y=nexty;
			geom_material_label.width=control_width;
			container.addChild(geom_material_label);
			nexty+=geom_material_label.height+smallgap;
			
			geom_friction_label=new Label();
			geom_friction_label.text="Трение:";
			geom_friction_label.x=largegap;
			geom_friction_label.y=nexty;
			geom_friction_label.width=biglabel_width;
			container.addChild(geom_friction_label);
			
			geom_friction_text=new TextInput();
			geom_friction_text.text="";
			geom_friction_text.x=bigtext_x;
			geom_friction_text.y=nexty;
			geom_friction_text.width=bigtext_width;
			geom_friction_text.height=geom_friction_label.height;
			container.addChild(geom_friction_text);
			nexty+=Math.max(geom_friction_label.height,geom_friction_text.height)+smallgap;
			
			geom_restitution_label=new Label();
			geom_restitution_label.text="Упругость:";
			geom_restitution_label.x=largegap;
			geom_restitution_label.y=nexty;
			geom_restitution_label.width=biglabel_width;
			container.addChild(geom_restitution_label);
			
			geom_restitution_text=new TextInput();
			geom_restitution_text.text="";
			geom_restitution_text.x=bigtext_x;
			geom_restitution_text.y=nexty;
			geom_restitution_text.width=bigtext_width;
			geom_restitution_text.height=geom_restitution_label.height;
			container.addChild(geom_restitution_text);
			nexty+=Math.max(geom_restitution_label.height,geom_restitution_text.height)+smallgap;
			
			geom_ok_button=new Button();
			geom_ok_button.label="OK"
			geom_ok_button.x=largegap;
			geom_ok_button.y=nexty;
			geom_ok_button.width=button_width;
			container.addChild(geom_ok_button);
			
			geom_cancel_button=new Button();
			geom_cancel_button.label="Отмена"
			geom_cancel_button.x=button_x;
			geom_cancel_button.y=nexty;
			geom_cancel_button.width=button_width;
			container.addChild(geom_cancel_button);
			nexty+=Math.max(geom_ok_button.height,geom_cancel_button.height)+smallgap;
			
			
			geom_panel.scrollerHeight=nexty+largegap;
			editor_panel.container.addChild(geom_panel);
			
			// ****************** Область липкости *********************
			
			stick_panel=new ScrollerWindow(0xCCCCCC,0.2,0xCCCCCC,0.01,scroller_width);
			stick_panel.width=width_with_scrollbars;
			stick_panel.height=height;
			stick_panel.x=0;
			stick_panel.y=0;
			stick_panel.visible=false;
			container=stick_panel.container;
			nexty=0;
			
			stick_info_label=new Label();
			stick_info_label.text="Область липкости";
			stick_info_label.x=largegap;
			stick_info_label.y=nexty;
			stick_info_label.width=control_width;
			container.addChild(stick_info_label);
			nexty+=stick_info_label.height+largegap;
			
			stick_name_label=new Label();
			stick_name_label.text="Название объекта";
			stick_name_label.x=largegap;
			stick_name_label.y=nexty;
			stick_name_label.width=control_width;
			container.addChild(stick_name_label);
			nexty+=stick_name_label.height+smallgap;
			
			stick_name_text=new TextInput();
			stick_name_text.text="";
			stick_name_text.x=largegap;
			stick_name_text.y=nexty;
			stick_name_text.width=control_width;
			container.addChild(stick_name_text);
			nexty+=stick_name_text.height+smallgap;
			
			stick_params_label=new Label();
			stick_params_label.text="Параметры";
			stick_params_label.x=largegap;
			stick_params_label.y=nexty;
			stick_params_label.width=control_width;
			container.addChild(stick_params_label);
			nexty+=stick_params_label.height+smallgap;
			
			stick_d_label=new Label();
			stick_d_label.text="Расстояние:";
			stick_d_label.x=largegap;
			stick_d_label.y=nexty;
			stick_d_label.width=biglabel_width;
			container.addChild(stick_d_label);
			
			stick_d_text=new TextInput();
			stick_d_text.text="";
			stick_d_text.x=bigtext_x;
			stick_d_text.y=nexty;
			stick_d_text.width=bigtext_width;
			stick_d_text.height=stick_d_label.height;
			container.addChild(stick_d_text);
			nexty+=Math.max(stick_d_label.height,stick_d_text.height)+smallgap;
			
			stick_k_label=new Label();
			stick_k_label.text="Сила:";
			stick_k_label.x=largegap;
			stick_k_label.y=nexty;
			stick_k_label.width=biglabel_width;
			container.addChild(stick_k_label);
			
			stick_k_text=new TextInput();
			stick_k_text.text="";
			stick_k_text.x=bigtext_x;
			stick_k_text.y=nexty;
			stick_k_text.width=bigtext_width;
			stick_k_text.height=stick_k_label.height;
			container.addChild(stick_k_text);
			nexty+=Math.max(stick_k_label.height,stick_k_text.height)+smallgap;
			
			stick_ok_button=new Button();
			stick_ok_button.label="OK"
			stick_ok_button.x=largegap;
			stick_ok_button.y=nexty;
			stick_ok_button.width=button_width;
			container.addChild(stick_ok_button);
			
			stick_cancel_button=new Button();
			stick_cancel_button.label="Отмена"
			stick_cancel_button.x=button_x;
			stick_cancel_button.y=nexty;
			stick_cancel_button.width=button_width;
			container.addChild(stick_cancel_button);
			nexty+=Math.max(stick_ok_button.height,stick_cancel_button.height)+smallgap;
			
			
			stick_panel.scrollerHeight=nexty+largegap;
			editor_panel.container.addChild(stick_panel);
			
			
			// ****************** Динамический объект *********************
			
			dynamic_panel=new ScrollerWindow(0xCCCCCC,0.2,0xCCCCCC,0.01,scroller_width);
			dynamic_panel.width=width_with_scrollbars;
			dynamic_panel.height=height;
			dynamic_panel.x=0;
			dynamic_panel.y=0;
			dynamic_panel.visible=false;
			container=dynamic_panel.container;
			nexty=0;
			
			dynamic_info_label=new Label();
			dynamic_info_label.text="Динамический объект";
			dynamic_info_label.x=largegap;
			dynamic_info_label.y=nexty;
			dynamic_info_label.width=control_width;
			container.addChild(dynamic_info_label);
			nexty+=dynamic_info_label.height+largegap;
			
			dynamic_name_label=new Label();
			dynamic_name_label.text="Название объекта";
			dynamic_name_label.x=largegap;
			dynamic_name_label.y=nexty;
			dynamic_name_label.width=control_width;
			container.addChild(dynamic_name_label);
			nexty+=dynamic_name_label.height+smallgap;
			
			dynamic_name_text=new TextInput();
			dynamic_name_text.text="";
			dynamic_name_text.x=largegap;
			dynamic_name_text.y=nexty;
			dynamic_name_text.width=control_width;
			container.addChild(dynamic_name_text);
			nexty+=dynamic_name_text.height+smallgap;
			
			dynamic_geom_label=new Label();
			dynamic_geom_label.text="Геометрия";
			dynamic_geom_label.x=largegap;
			dynamic_geom_label.y=nexty;
			dynamic_geom_label.width=control_width;
			container.addChild(dynamic_geom_label);
			nexty+=dynamic_geom_label.height+smallgap;
			
			dynamic_geom_list=new List();
			dynamic_geom_list.buttonMode=false;
			dynamic_geom_list.x=largegap;
			dynamic_geom_list.y=nexty;
			dynamic_geom_list.width=control_width;
			dynamic_geom_list.height=list_height;
			container.addChild(dynamic_geom_list);
			nexty+=dynamic_geom_list.height+smallgap;
			
			dynamic_geom_add_button=new Button();
			dynamic_geom_add_button.label="Добавить"
			dynamic_geom_add_button.x=largegap;
			dynamic_geom_add_button.y=nexty;
			dynamic_geom_add_button.width=button_width;
			container.addChild(dynamic_geom_add_button);
			
			dynamic_geom_rem_button=new Button();
			dynamic_geom_rem_button.label="Удалить"
			dynamic_geom_rem_button.x=button_x;
			dynamic_geom_rem_button.y=nexty;
			dynamic_geom_rem_button.width=button_width;
			container.addChild(dynamic_geom_rem_button);
			nexty+=Math.max(dynamic_geom_add_button.height,dynamic_geom_rem_button.height)+smallgap;
			
			
			dynamic_graphics_label=new Label();
			dynamic_graphics_label.text="Графика";
			dynamic_graphics_label.x=largegap;
			dynamic_graphics_label.y=nexty;
			dynamic_graphics_label.width=control_width;
			container.addChild(dynamic_graphics_label);
			nexty+=dynamic_graphics_label.height+smallgap;
			
			dynamic_graphics_list=new List();
			dynamic_graphics_list.buttonMode=false;
			dynamic_graphics_list.x=largegap;
			dynamic_graphics_list.y=nexty;
			dynamic_graphics_list.width=control_width;
			dynamic_graphics_list.height=list_height;
			container.addChild(dynamic_graphics_list);
			nexty+=dynamic_graphics_list.height+smallgap;
			
			dynamic_graphics_add_button=new Button();
			dynamic_graphics_add_button.label="Добавить"
			dynamic_graphics_add_button.x=largegap;
			dynamic_graphics_add_button.y=nexty;
			dynamic_graphics_add_button.width=button_width;
			container.addChild(dynamic_graphics_add_button);
			
			dynamic_graphics_rem_button=new Button();
			dynamic_graphics_rem_button.label="Удалить"
			dynamic_graphics_rem_button.x=button_x;
			dynamic_graphics_rem_button.y=nexty;
			dynamic_graphics_rem_button.width=button_width;
			container.addChild(dynamic_graphics_rem_button);
			nexty+=Math.max(dynamic_graphics_add_button.height,dynamic_graphics_rem_button.height)+smallgap;
			
			dynamic_stick_label=new Label();
			dynamic_stick_label.text="Области липкости";
			dynamic_stick_label.x=largegap;
			dynamic_stick_label.y=nexty;
			dynamic_stick_label.width=control_width;
			container.addChild(dynamic_stick_label);
			nexty+=dynamic_stick_label.height+smallgap;
			
			dynamic_stick_list=new List();
			dynamic_stick_list.buttonMode=false;
			dynamic_stick_list.x=largegap;
			dynamic_stick_list.y=nexty;
			dynamic_stick_list.width=control_width;
			dynamic_stick_list.height=list_height;
			container.addChild(dynamic_stick_list);
			nexty+=dynamic_stick_list.height+smallgap;
			
			dynamic_stick_add_button=new Button();
			dynamic_stick_add_button.label="Добавить"
			dynamic_stick_add_button.x=largegap;
			dynamic_stick_add_button.y=nexty;
			dynamic_stick_add_button.width=button_width;
			container.addChild(dynamic_stick_add_button);
			
			dynamic_stick_rem_button=new Button();
			dynamic_stick_rem_button.label="Удалить"
			dynamic_stick_rem_button.x=button_x;
			dynamic_stick_rem_button.y=nexty;
			dynamic_stick_rem_button.width=button_width;
			container.addChild(dynamic_stick_rem_button);
			nexty+=Math.max(dynamic_stick_add_button.height,dynamic_stick_rem_button.height)+2*largegap;
			
			dynamic_ok_button=new Button();
			dynamic_ok_button.label="OK"
			dynamic_ok_button.x=largegap;
			dynamic_ok_button.y=nexty;
			dynamic_ok_button.width=button_width;
			container.addChild(dynamic_ok_button);
			
			dynamic_cancel_button=new Button();
			dynamic_cancel_button.label="Отмена"
			dynamic_cancel_button.x=button_x;
			dynamic_cancel_button.y=nexty;
			dynamic_cancel_button.width=button_width;
			container.addChild(dynamic_cancel_button);
			nexty+=Math.max(dynamic_ok_button.height,dynamic_cancel_button.height)+smallgap;
			
			
			dynamic_panel.scrollerHeight=nexty+largegap;
			editor_panel.container.addChild(dynamic_panel);
			
			
			// ****************** Панель ресурсов *********************
			
			resource_panel=new ScrollerWindow(0xCCCCCC,0.2,0xCCCCCC,0.01,scroller_width);
			resource_panel.width=width_with_scrollbars;
			resource_panel.height=height;
			resource_panel.x=0;
			resource_panel.y=0;
			resource_panel.visible=false;
			container=resource_panel.container;
			nexty=0;
			
			resource_info_label=new Label();
			resource_info_label.text="Ресурсы:";
			resource_info_label.x=largegap;
			resource_info_label.y=nexty;
			resource_info_label.width=control_width;
			container.addChild(resource_info_label);
			nexty+=resource_info_label.height+largegap;
			
			resource_list=new List();
			resource_list.dataProvider=lib_dp;
			resource_list.buttonMode=false;
			resource_list.x=largegap;
			resource_list.y=nexty;
			resource_list.width=control_width;
			resource_list.height=list_height;
			container.addChild(resource_list);
			nexty+=resource_list.height+smallgap;
			
			resource_ok_button=new Button();
			resource_ok_button.label="OK"
			resource_ok_button.x=largegap;
			resource_ok_button.y=nexty;
			resource_ok_button.width=button_width;
			container.addChild(resource_ok_button);
			
			resource_cancel_button=new Button();
			resource_cancel_button.label="Отмена"
			resource_cancel_button.x=button_x;
			resource_cancel_button.y=nexty;
			resource_cancel_button.width=button_width;
			container.addChild(resource_cancel_button);
			nexty+=Math.max(resource_ok_button.height,resource_cancel_button.height)+smallgap;
			
			
			resource_panel.scrollerHeight=nexty+largegap;
			editor_panel.container.addChild(resource_panel);
			
			// *******************************************************
			
			stage.addChild(editor_panel);
			
			panel_stack=new Array();
			active_panel=level_panel;
			object_stack=new Array();
			active_object=level;
			active_panel.visible=true;
		}
		// ========================================================== //
		private function message():void
		{
			var messagewnd:EditorWindow;
			
			messagewnd=new ModalWindow(0xCCCCCC,0.1);
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
	}
}