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
	import flash.text.TextSnapshot;
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
			scrollbar.x=realWidth-scrollbar_width;
			scrollbar.y=0;
			scrollbar.width=scrollbar_width;
			scrollbar.height=realHeight;
			scrollbar.minScrollPosition=0;
			scrollbar.height=realHeight;
			if(scroller_height>realHeight)
			{
				scrollbar.enabled=true;
				scrollbar.maxScrollPosition=scroller_height-realHeight;
			}
			else
				scrollbar.enabled=false;
			scrollbar.scrollPosition=0;
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
			window_container.addChild(scroller);
			window_container.addChild(scroller_mask);
			window_container.addChild(scrollbar);
		}
		// ========================================================== //
		protected override function onRemovedFromStage(e:Event):void
		{
			super.onRemovedFromStage(e);
			window_container.removeChild(scroller);
			window_container.removeChild(scroller_mask);
			window_container.removeChild(scrollbar);
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
			if(scrollbar.enabled)
			{
				scrollbar.scrollPosition-=e.delta*5;
				scroller.y=-scrollbar.scrollPosition;
			}
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
			scrollbar.height=realHeight;
			if(scroller_height>realHeight)
			{
				scrollbar.enabled=true;
				scrollbar.maxScrollPosition=scroller_height-realHeight;
				scrollbar.scrollPosition=-scroller.y;
				scroller.y=-scrollbar.scrollPosition;
			}
			else
				scrollbar.enabled=false;
		}
		// ========================================================== //
		public function get scrollerWidth():Number
		{
			return width-scrollbar_width;
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
		public override function get container():DisplayObjectContainer
		{
			return scroller;
		}
		// ========================================================== //
	}
}