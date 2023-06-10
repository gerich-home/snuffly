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
	public class ModalWindow extends EditorWindow
	{
		protected var outerColor:int;
		protected var outerAlpha:Number;
		protected var outerBg:Sprite;
		// ========================================================== //
		public function ModalWindow(bgColor:int=0xCCCCCC,bgAlpha:Number=1,outerColor:int=0xCCCCCC,outerAlpha:Number=0.2):void
		{
			super(bgColor,bgAlpha);
			this.outerColor=outerColor;
			this.outerAlpha=outerAlpha;
			outerBg = new Sprite();
		}
		// ========================================================== //
		protected override function onAddedToStage(e:Event):void
		{
			addChild(outerBg);
			super.onAddedToStage(e);
			outerBg.x=-startX;
			outerBg.y=-startY;
		}
		// ========================================================== //
		protected override function onRemovedFromStage(e:Event):void
		{
			super.onRemovedFromStage(e);
			removeChild(outerBg);
		}
		// ========================================================== //
		protected override function onResize(e:Event):void
		{
			super.onResize(e);
			outerBg.x=-startX;
			outerBg.y=-startY;
			redrawOuter();
		}
		// ========================================================== //
		protected override function onDragging(e:MouseEvent):void
		{
			x=e.stageX-draggingX;
			y=e.stageY-draggingY;
			outerBg.x=-startX;
			outerBg.y=-startY;
		}
		// ========================================================== //
		protected override function redraw():void
		{
			super.redraw();
			if(stage)
			{
				redrawOuter();
			}
		}
		// ========================================================== //
		protected function redrawOuter():void
		{
			var g:Graphics=outerBg.graphics
			g.clear();
			g.beginFill(outerColor,outerAlpha);
			g.drawRect(0,0,stage.stageWidth,stage.stageHeight);
			g.endFill();
		}
		// ========================================================== //
	}
}