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
	public class ScrollerWindow extends EditorWindow
	{
		protected var scrollerColor:int;
		protected var scrollerAlpha:Number;
		protected var scrollbar:ScrollBar;
		protected var scroller:Sprite;
		protected var scroller_mask:Sprite;
		protected var scrollbar_width:Number;
		protected var scroller_height:Number;
		// ========================================================== //
		public function ScrollerWindow(bgColor:int=0xCCCCCC,bgAlpha:Number=1,scrollerColor:int=0xCCCCCC,scrollerAlpha:Number=0.01,scrollbar_width:Number=17):void
		{
			super(bgColor,bgAlpha);
			this.scrollerColor=scrollerColor;
			this.scrollerAlpha=scrollerAlpha;
			this.scrollbar_width=scrollbar_width;
			this.scroller_height=0;
			scroller_mask = new Sprite();
			scrollbar=new ScrollBar();
			scroller = new Sprite();
		}
		// ========================================================== //
		protected override function onAddedToStage(e:Event):void
		{
			super.onAddedToStage(e);
			scrollbar.x=width-scrollbar_width;
			scrollbar.y=0;
			scrollbar.width=scrollbar_width;
			scrollbar.height=height;
			scrollbar.enabled=true;
			scrollbar.minScrollPosition=0;
			scrollbar.pageSize=5;
			scrollbar.pageScrollSize=5;
			scrollbar.lineScrollSize=5;
			scrollbar.addEventListener(Event.SCROLL,onScroll);
			scroller.addEventListener(MouseEvent.MOUSE_WHEEL,onMouseWheel);
			scroller.x=0;
			scroller.y=0;
			scroller_mask.x=0;
			scroller_mask.y=0;
			scroller.mask=scroller_mask;
			super.addChild(scroller);
			super.addChild(scroller_mask);
			super.addChild(scrollbar);
		}
		// ========================================================== //
		protected override function onRemovedFromStage(e:Event):void
		{
			super.onRemovedFromStage(e);
			super.removeChild(scroller);
			super.removeChild(scroller_mask);
			super.removeChild(scrollbar);
			scroller.mask=null;
			scrollbar.removeEventListener(Event.SCROLL,onScroll);
			scroller.removeEventListener(MouseEvent.MOUSE_WHEEL,onMouseWheel);
		}
		// ========================================================== //
		protected function onScroll(e:ScrollEvent):void
		{
			scroller.y=-scrollbar.scrollPosition;
		}
		// ========================================================== //
		protected function onMouseWheel(e:MouseEvent):void
		{
			scrollbar.scrollPosition-=e.delta*5;
			scroller.y=-scrollbar.scrollPosition;
		}
		// ========================================================== //
		protected override function redraw():void
		{
			super.redraw();
			var g:Graphics=scroller.graphics
			g.clear();
			g.beginFill(scrollerColor,scrollerAlpha);
			g.drawRect(0,0,realWidth-scrollbar_width,scroller_height);
			g.endFill();
			g=scroller_mask.graphics
			g.clear();
			g.beginFill(scrollerColor,scrollerAlpha);
			g.drawRect(0,0,realWidth-scrollbar_width,scroller_height);
			g.endFill();
			if(scroller_height>height)
			{
				scrollbar.enabled=true;
				scrollbar.maxScrollPosition=scroller_height-height;
			}
			else
				scrollbar.enabled=false;
		}
		// ========================================================== //
		public function get scrollerHeight():Number
		{
			return scroller_height;
		}
		// ========================================================== //
		public function set scrollerHeight(value:Number):void
		{
			scroller_height=value;
			redraw();
		}
		// ========================================================== //
		public override function addChild(child:DisplayObject):DisplayObject
		{
			return scroller.addChild(child);
		}
		// ========================================================== //
		public override function addChildAt(child:DisplayObject, index:int):DisplayObject
		{
			return scroller.addChildAt(child,index);
		}
		// ========================================================== //
		public override function areInaccessibleObjectsUnderPoint(point:Point):Boolean
		{
			return scroller.areInaccessibleObjectsUnderPoint(point);
		}
		// ========================================================== //
		public override function contains(child:DisplayObject):Boolean
		{
			return scroller.contains(child);
		}
		// ========================================================== //
		public override function getChildAt(index:int):DisplayObject
		{
			return scroller.getChildAt(index);
		}
		// ========================================================== //
		public override function getChildByName(name:String):DisplayObject
		{
			return scroller.getChildByName(name);
		}
		// ========================================================== //
		public override function getChildIndex(child:DisplayObject):int
		{
			return scroller.getChildIndex(child);
		}
		// ========================================================== //
		public override function getObjectsUnderPoint(point:Point):Array
		{
			return scroller.getObjectsUnderPoint(point);
		}
		// ========================================================== //
		public override function removeChild(child:DisplayObject):DisplayObject
		{
			return scroller.removeChild(child);
		}
		// ========================================================== //
		public override function removeChildAt(index:int):DisplayObject
		{
			return scroller.removeChildAt(index);
		}
		// ========================================================== //
		public override function setChildIndex(child:DisplayObject, index:int):void
		{
			scroller.setChildIndex(child,index);
		}
		// ========================================================== //
		public override function swapChildren(child1:DisplayObject, child2:DisplayObject):void
		{
			scroller.swapChildren(child1,child2);
		}
		// ========================================================== //
		public override function swapChildrenAt(index1:int, index2:int):void
		{
			scroller.swapChildrenAt(index1,index2);
		}
		// ========================================================== //
	}
}