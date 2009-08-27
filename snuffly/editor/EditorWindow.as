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
	public class EditorWindow extends Sprite
	{
		protected var bgColor:int;
		protected var bgAlpha:Number;
		protected var window_container:Sprite;
		protected var mask_sprite:Sprite;
		protected var offsetX:Number;
		protected var offsetY:Number;
		protected var realWidth:Number;
		protected var realHeight:Number;
		protected var startX:Number;
		protected var startY:Number;
		protected var draggingX:Number;
		protected var draggingY:Number;
		protected var startStageWidth:Number;
		protected var startStageHeight:Number;
		// ========================================================== //
		public function EditorWindow(bgColor:int=0xCCCCCC,bgAlpha:Number=1):void
		{
			this.startX=super.x;
			this.startY=super.y;
			this.offsetX=0;
			this.offsetY=0;
			this.draggingX=0;
			this.draggingY=0;
			this.realWidth=0;
			this.realHeight=0;
			startStageWidth=0;
			startStageHeight=0;
			this.bgColor=bgColor;
			this.bgAlpha=bgAlpha;
			window_container = new Sprite();
			mask_sprite = new Sprite();
			this.addEventListener(Event.ADDED_TO_STAGE,onAddedToStage);
			this.addEventListener(Event.REMOVED_FROM_STAGE,onRemovedFromStage);
		}
		// ========================================================== //
		protected function onAddedToStage(e:Event):void
		{
			window_container.mask=mask_sprite;
			super.addChild(mask_sprite);
			super.addChild(window_container);
			var scaleMode:String=stage.scaleMode;
			stage.scaleMode=StageScaleMode.SHOW_ALL;
			startStageWidth=stage.stageWidth;
			startStageHeight=stage.stageHeight;
			stage.scaleMode=scaleMode;
			offsetX=(startStageWidth-stage.stageWidth)*0.5;
			offsetY=(startStageHeight-stage.stageHeight)*0.5;
			super.x=startX+offsetX;
			super.y=startY+offsetY;
			redraw();
			stage.addEventListener(Event.RESIZE,onResize);
		}
		// ========================================================== //
		protected function onRemovedFromStage(e:Event):void
		{
			super.removeChild(window_container);
			super.removeChild(mask_sprite);
			window_container.mask=null;
			stage.removeEventListener(Event.RESIZE,onResize);
		}
		// ========================================================== //
		protected function onResize(e:Event):void
		{
			startX=super.x-offsetX;
			startY=super.y-offsetY;
			offsetX=(startStageWidth-stage.stageWidth)*0.5;
			offsetY=(startStageHeight-stage.stageHeight)*0.5;
			super.x=startX+offsetX;
			super.y=startY+offsetY;
			dispatchEvent(new Event(Event.RESIZE));
		}
		// ========================================================== //
		protected function redraw():void
		{
			graphics.clear();
			graphics.beginFill(bgColor,bgAlpha);
			graphics.drawRect(0,0,realWidth,realHeight);
			graphics.endFill();
			var g:Graphics=mask_sprite.graphics
			g.clear();
			g.beginFill(0x000000);
			g.drawRect(0,0,realWidth,realHeight);
			g.endFill();
		}
		// ========================================================== //
		public override function get width():Number
		{
			return super.width;
		}
		// ========================================================== //
		public override function set width(value:Number):void
		{
			realWidth=value;
			redraw();
		}
		// ========================================================== //
		public override function get height():Number
		{
			return super.height;
		}
		// ========================================================== //
		public override function set height(value:Number):void
		{
			realHeight=value;
			redraw();
		}
		// ========================================================== //
		public override function get x():Number
		{
			return super.x;
		}
		// ========================================================== //
		public override function set x(value:Number):void
		{
			if(stage)
			{
				startX=value-offsetX;
				super.x=value;
			}
			else
				startX=value;
			trace(1);
		}
		// ========================================================== //
		public override function get y():Number
		{
			return super.y;
		}
		// ========================================================== //
		public override function set y(value:Number):void
		{
			if(stage)
			{
				startY=value-offsetY;
				super.y=value;
			}
			else
				startY=value;
		}
		// ========================================================== //
		protected function _addChild(child:DisplayObject):DisplayObject
		{
			return super.addChild(child);
		}
		// ========================================================== //
		protected function _removeChild(child:DisplayObject):DisplayObject
		{
			return super.removeChild(child);
		}
		// ========================================================== //
		public override function startDrag(lockCenter:Boolean=false, bounds:Rectangle=null):void
		{
			draggingX=stage.mouseX-super.x;
			draggingY=stage.mouseY-super.y;
			stage.addEventListener(MouseEvent.MOUSE_MOVE,onDragging);
		}
		// ========================================================== //
		public override function stopDrag():void
		{
			stage.removeEventListener(MouseEvent.MOUSE_MOVE,onDragging);
		}
		// ========================================================== //
		protected function onDragging(e:MouseEvent):void
		{
			x=e.stageX-draggingX;
			y=e.stageY-draggingY;
		}
		// ========================================================== //
		public override function addChild(child:DisplayObject):DisplayObject
		{
			return window_container.addChild(child);
		}
		// ========================================================== //
		public override function addChildAt(child:DisplayObject, index:int):DisplayObject
		{
			return window_container.addChildAt(child,index);
		}
		// ========================================================== //
		public override function areInaccessibleObjectsUnderPoint(point:Point):Boolean
		{
			return window_container.areInaccessibleObjectsUnderPoint(point);
		}
		// ========================================================== //
		public override function contains(child:DisplayObject):Boolean
		{
			return window_container.contains(child);
		}
		// ========================================================== //
		public override function getChildAt(index:int):DisplayObject
		{
			return window_container.getChildAt(index);
		}
		// ========================================================== //
		public override function getChildByName(name:String):DisplayObject
		{
			return window_container.getChildByName(name);
		}
		// ========================================================== //
		public override function getChildIndex(child:DisplayObject):int
		{
			return window_container.getChildIndex(child);
		}
		// ========================================================== //
		public override function getObjectsUnderPoint(point:Point):Array
		{
			return window_container.getObjectsUnderPoint(point);
		}
		// ========================================================== //
		public override function removeChild(child:DisplayObject):DisplayObject
		{
			return window_container.removeChild(child);
		}
		// ========================================================== //
		public override function removeChildAt(index:int):DisplayObject
		{
			return window_container.removeChildAt(index);
		}
		// ========================================================== //
		public override function setChildIndex(child:DisplayObject, index:int):void
		{
			window_container.setChildIndex(child,index);
		}
		// ========================================================== //
		public override function swapChildren(child1:DisplayObject, child2:DisplayObject):void
		{
			window_container.swapChildren(child1,child2);
		}
		// ========================================================== //
		public override function swapChildrenAt(index1:int, index2:int):void
		{
			window_container.swapChildrenAt(index1,index2);
		}
		// ========================================================== //
	}
}