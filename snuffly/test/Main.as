package snuffly.test
{
	import flash.geom.*;
	import flash.display.Shape;
	import flash.display.Sprite;
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.events.Event;
	import flash.events.KeyboardEvent;
	import flash.events.TimerEvent;
	import flash.ui.Keyboard;
	import flash.display.MovieClip;
	import flash.utils.*;
	import snuffly.test.TestLevel;
	import snuffly.game.core.Level;
	
	public class Main extends MovieClip
	{
		private var container:Sprite;
		
		private var fluidbmp:Bitmap;
		
		private var testFPS:TestFPS;
		
		private var level:Level;

		// ========================================================== //
		public function Main():void
		{
			var gametimer:Timer = new Timer(10);
			container=new Sprite();
			fluidbmp= new Bitmap(new BitmapData(stage.stageWidth,stage.stageHeight));
			testFPS = new TestFPS(gametimer);
			testFPS.x = 370;
			
			addChild(container);
			//container.
			addChild(fluidbmp);
			fluidbmp.x=0;
			fluidbmp.y=0;
			fluidbmp.visible=true;
			addChild(testFPS);
			
			stage.frameRate = 24;
			
			level=new TestLevel(container,fluidbmp);
			
			addEventListener(Event.ENTER_FRAME, function():void {
											level.draw();
										});
										
			gametimer.addEventListener(TimerEvent.TIMER, function():void {
											level.step();
										});
			
			stage.addEventListener(KeyboardEvent.KEY_DOWN, function(e:KeyboardEvent):void {
											if(e.keyCode==Keyboard.F1)
												if(gametimer.running)
													gametimer.stop();
												else
													gametimer.start();
										});
			gametimer.start();
		}
		// ========================================================== //
	}
}	