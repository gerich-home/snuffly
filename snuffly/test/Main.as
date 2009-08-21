package snuffly.test
{
	import flash.geom.*;
	import flash.display.Shape;
	import flash.display.Sprite;
	import flash.display.Bitmap;
	import flash.display.BitmapData;
	import flash.events.*;
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
			
			addChild(fluidbmp);
			addChild(container);
			container.mouseEnabled=false;
			addChild(testFPS);
			testFPS.mouseEnabled=false;
			
			stage.focus = container;
			stage.stageFocusRect=false;
			stage.frameRate = 31;
			
			level=new TestLevel(container,fluidbmp);
			
			stage.addEventListener(FocusEvent.FOCUS_OUT, function(e:Event):void {
											if(e.target==container)
												stage.focus = container;
										});
			
						
			gametimer.addEventListener(TimerEvent.TIMER, function starter():void {
										gametimer.removeEventListener(TimerEvent.TIMER,starter);
										level.step();
										gametimer.addEventListener(TimerEvent.TIMER, function():void {
																		level.step();
																	});
										addEventListener(Event.ENTER_FRAME, function():void {
																		level.draw();
																	});
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