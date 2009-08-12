package snuffly.test
{
	import flash.utils.Timer;
	import flash.events.TimerEvent;
	import flash.display.Sprite;
	import flash.text.TextField;
	import flash.events.Event;
	import flash.display.Graphics;
	import flash.system.System;
	import flash.text.TextFormat;
	import flash.display.Stage;
	
	public class TestFPS extends Sprite
	{
		private var fps:TextField;
		private var physfps:TextField;
		private var memory:TextField;
		
		private var fpsTimer:Timer;
		private var fpsCounter:uint = 0;
		private var physfpsCounter:uint = 0;
		private var fpsInterval:int;
		
		// =============================================================================== //
		public function TestFPS(t:Timer,param_int:int = 1000)
		{
			initFields();
			initEventListeners();
			
			fpsInterval = param_int;
			
			fpsTimer = new Timer(fpsInterval);
			fpsTimer.addEventListener(TimerEvent.TIMER, updateMeters);
			t.addEventListener(TimerEvent.TIMER, updatePhys);
			fpsTimer.start();
		}
		// =============================================================================== //
		private function initEventListeners():void
		{
			addEventListener(Event.ADDED_TO_STAGE, initMeter);
			addEventListener(Event.ENTER_FRAME, updateFields);
		}
		// =============================================================================== //
		private function initMeter(e:Event):void
		{
			graphics.beginFill(0xcccccc, .7);
			graphics.drawRect(5, 5, 155, 13);
			graphics.endFill();			
		}
		// =============================================================================== //
		private function initFields():void
		{
			var meter_tf:TextFormat = new TextFormat("Arial", 10, 0x000000);
			
			fps = new TextField();
			fps.defaultTextFormat = meter_tf;
			fps.selectable = false;
			fps.mouseEnabled = false;
			fps.x = 10;
			fps.y = 3;
			addChild(fps);
			
			physfps = new TextField();
			physfps.defaultTextFormat = meter_tf;
			physfps.selectable = false;
			physfps.mouseEnabled = false;
			physfps.x = 45;
			physfps.y = 3;
			addChild(physfps);
			
			memory = new TextField();
			memory.defaultTextFormat = meter_tf;
			memory.selectable = false;
			memory.mouseEnabled = false;
			memory.x = 90;
			memory.y = 3;
			addChild(memory);
		}
		// =============================================================================== //
		private function updateFields(e:Event):void
		{
			fpsCounter++;
		}
		// =============================================================================== //
		private function updatePhys(e:Event):void
		{
			physfpsCounter++;
		}
		// =============================================================================== //
		private function updateMeters(e:TimerEvent):void
		{	
			fps.text = Math.round(fpsCounter* 1000 / fpsInterval) + " fps";
			physfps.text = Math.round(physfpsCounter* 1000 / fpsInterval) + " pfps";
			memory.text = Math.round(System.totalMemory * 0.0009765625) + " Kb";
			
			fpsCounter = 0;
			physfpsCounter = 0;
		}
		// =============================================================================== //
	}
}
