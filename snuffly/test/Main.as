package snuffly.test
{
	import fl.controls.TextArea;
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
	import snuffly.test.TestParticleSystem;
	
	public class Main extends MovieClip
	{
		private var canvas:Shape;
		private var water:Shape;
		private var images:Sprite;
		private var fluidbmp:Bitmap;
		private var testFPS:TestFPS;
		
		private var exp:TestParticleSystem;
		
		private var drawAfter:int;

		private var _period:Number = 10;
		private var _beforeTime:int = 0;
		private var _afterTime:int = 0;
		private var _timeDiff:int = 0;
		private var _sleepTime:int = 0;
		private var _overSleepTime:int = 0;
		private var _excess:int = 0;

		// ========================================================== //
		public function Main():void
		{
			var t:Timer = new Timer(_period);
			var tf:TextArea;
			drawAfter=0;
			images=new Sprite();
			water= new Shape();
			canvas= new Shape();
			fluidbmp= new Bitmap(new BitmapData(stage.stageWidth,stage.stageHeight));
			testFPS = new TestFPS(t);
			testFPS.x = 370;
			
			addChild(canvas);
			addChild(images);
			addChild(water);
			addChild(fluidbmp);
			addChild(testFPS);
			
			stage.frameRate = 24;
			
			exp=new TestParticleSystem(	function():void {
											canvas.graphics.clear();
											water.graphics.clear();
										},
										canvas,water,fluidbmp,images);
			
			addEventListener(Event.ENTER_FRAME, function():void {
											//if(getTimer()>drawAfter)
											//{
												exp.draw();
												//drawAfter+=18;
											//}
										});
										
			t.addEventListener(TimerEvent.TIMER, function():void {
											/*_beforeTime = getTimer();
											_overSleepTime = (_beforeTime - _afterTime) - _sleepTime;
											*/
											//CSVDebug.tick();
											exp.integrate();
											/*
											_afterTime = getTimer();
											_timeDiff = _afterTime - _beforeTime;
											_sleepTime = (_period - _timeDiff) - _overSleepTime;        
											if(_sleepTime <= 0)
												_sleepTime = 2;
											
											t.reset();
											t.delay = _sleepTime;
											t.start();*/
										});
			
			stage.addEventListener(KeyboardEvent.KEY_DOWN, function(e:KeyboardEvent):void {
											if(e.keyCode==Keyboard.F1)
												if(t.running)
													t.stop();
												else
												{
													//if(tf)
													//{						
													//	stage.removeChild(tf);
													//	tf=null;
													//}
													t.start();
												}
											/*if(e.keyCode==Keyboard.F2)
												CSVDebug.start();
											if(e.keyCode==Keyboard.F3)
											{
												t.stop();
												var s:String=CSVDebug.getText();
												if(s=="")
													t.start();
												else
												{
													tf=new TextArea();
													stage.addChild(tf);
													tf.text=s;
													tf.visible=true;
												}
											}*/
										});
			exp.start();
			t.start();
		}
		// ========================================================== //
	}
}	