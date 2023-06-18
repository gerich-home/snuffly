import { AABB, Body, BodyDef, Box2D, CircleShape, World } from "./Box2D";
import { CMCalculator } from "./CMCalculator";
import { Jello } from "./Jello";
import { IDrawable } from "./core/IDrawable";
import { Controls, IPower } from "./core/IPower";

const b2r = 8;

export class TestLevel {
	readonly world: World;
	readonly powers: IPower[];
	readonly drawables: IDrawable[];
	readonly velocityIterations = 2;
	readonly positionIterations = 2;
	readonly stepsPerDrawFrame = 10;
	currentTime: number = 0;

	constructor(
		public readonly Box2D: Box2D,
		public readonly width: number,
		public readonly height: number,
		public readonly isMobile: boolean
	) {
		this.world = this.createBox2DWorld(Box2D);
		const jello = isMobile ?
			this.createJello(Box2D, this.world, 100, 20) :
			this.createJello(Box2D, this.world, 200, 40);
		//const cmCalc = new CMCalculator(jello.particles);

		this.drawables = [
			jello
		];

		this.powers = [
			jello,
			//cmCalc,
			//SG addPower(new KeyboardPower(jello,cmCalc,container,0.5*0.01,0.01,0.1*0.01,0.1*0.01,0.12*0.01*pixelScale,0.3*0.01*pixelScale,0.3*0.01*pixelScale));
		];

		//addPower(new MousePower(currentGroup,60,3*0.01*pixelScale,container));
		/*
		let spriteCenterX: number = 0.5 * container.stage.stageWidth;
		let spriteCenterY: number = 0.5 * container.stage.stageHeight;
		let atannorm: number = 2 / Math.PI;
		addDrawable(new CameraControl(cmCalc,
			function (cmX: number, cmY: number) {
				let offsetX: number = 0.05 * (spriteCenterX - cmX - jello.offsetX);
				let offsetY: number = 0.05 * (spriteCenterY - cmY - jello.offsetY);
				//let atanX:number=Math.abs(Math.atan(offsetX*0.2)*atannorm);
				//let atanY:number=Math.abs(Math.atan(offsetY*0.2)*atannorm);
				//offsetX*=0.01+atanX*0.09;
				//offsetY*=0.01+atanY*0.09;
				jello.offsetX += offsetX;
				jello.offsetY += offsetY;
				container.x = jello.offsetX;
				container.y = jello.offsetY;
			}));
		*/
	}

	createJello(Box2D: Box2D, world: World, count: number = 200, r: number = 20, m: number = 0.01, friction: number = 1, restitution: number = 0.1, rest_density: number = 1, xmin: number = 0, ymin: number = 0, xmax: number = this.width, ymax: number = this.height): Jello {
		const jellopt: Body[] = [];


		const density: number = m / (Math.PI * b2r * b2r);
		//let bmp1: BitmapData = FluidParticle.drawBubble(1.5 * r, 0xFFEE00);
		//let bmp2: BitmapData = FluidParticle.drawBubble(1.5 * r, 0xFF7700);

		for (let i = 0; i < count; i++) {
			const bodyDef = new Box2D.b2BodyDef();
			bodyDef.fixedRotation = true;
			//bodyDef.userData = ((unumber(Math.random() * 2) === 0) ? bmp1 : bmp2);
			bodyDef.position.x = b2r + (this.width - 2 * b2r) * Math.random();
			bodyDef.position.y = b2r + (this.height - 2 * b2r) * Math.random();
			bodyDef.type = 2;

			const circleDef = new Box2D.b2CircleShape();
			circleDef.m_radius = b2r;

			const circleFixtureDef = new Box2D.b2FixtureDef();

			circleFixtureDef.shape = circleDef;
			circleFixtureDef.friction = friction;
			circleFixtureDef.density = density;
			circleFixtureDef.restitution = restitution;
			circleFixtureDef.filter.groupIndex = -1;		//игнорируем другие частицы

			const body = world.CreateBody(bodyDef);
			body.CreateFixture(circleFixtureDef);
			jellopt.push(body);
		}

		return new Jello(Box2D, jellopt, r, 1.5 * r, rest_density, 0xB << 30);
	}

	// ========================================================== //
	private createBox2DWorld(Box2D: Box2D): World {
		const gravity = this.isMobile ?
			new Box2D.b2Vec2(0, 0) :
			new Box2D.b2Vec2(0, 6);

		const world = new Box2D.b2World(gravity);

		let dynamicBodies: Body[] = [];

		let i: number;

		const wall_size = 10;

		{
			//Земля
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(-wall_size, -wall_size);
			boxDef.SetAsBox(wall_size, this.height + 2 * wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}
		{
			//Земля
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(-wall_size, -wall_size);
			boxDef.SetAsBox(this.width + 2 * wall_size, wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}

		{
			//Земля
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(-wall_size, this.height);
			boxDef.SetAsBox(this.width + 2 * wall_size, wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}

		{
			//Земля
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(this.width, -wall_size);
			boxDef.SetAsBox(wall_size, this.height + 2 * wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}

		// SG
		// bodyDef = new b2BodyDef();
		// bodyDef.position.Set(-1 * pixelScale, 6 * pixelScale);
		// boxDef = new b2PolygonDef();
		// boxDef.SetAsBox(209/*30*pixelScale*/, 55/*3*pixelScale*/);
		// boxDef.friction = 0.5;
		// boxDef.density = 0;
		// //bodyDef.userData = new Wall();
		// //bodyDef.userData.width = 418;
		// //bodyDef.userData.height = 110;
		// //bodyDef.userData.x = -1 * pixelScale;
		// //bodyDef.userData.y = 6 * pixelScale;
		// container.addChild(bodyDef.userData);
		// body = world.CreateBody(bodyDef);
		// body.CreateShape(boxDef);
		// body.SetMassFromShapes();


		// SG
		// bodyDef = new b2BodyDef();
		// bodyDef.position.Set(17 * pixelScale, -3 * pixelScale);
		// boxDef = new b2PolygonDef();
		// boxDef.SetAsBox(209/*30*pixelScale*/, 55/*3*pixelScale*/);
		// boxDef.friction = 0.5;
		// boxDef.density = 0;
		// bodyDef.userData = new Wall();
		// bodyDef.userData.width = 418;
		// bodyDef.userData.height = 110;
		// bodyDef.userData.x = 17 * pixelScale;
		// bodyDef.userData.y = -3 * pixelScale;
		// container.addChild(bodyDef.userData);
		// body = world.CreateBody(bodyDef);
		// body.CreateShape(boxDef);
		// body.SetMassFromShapes();

		// SG
		// let sizeX: number;
		// let sizeY: number;
		// for (i = 0; i < 2; i++) {
		// 	bodyDef = new b2BodyDef();
		// 	sizeX = (Math.random() + 0.5) * pixelScale;
		// 	sizeY = (Math.random() + 0.5) * pixelScale;
		// 	bodyDef.position.x = (Math.random() * 15 + 5) * pixelScale;
		// 	bodyDef.position.y = (Math.random() * 10) * pixelScale - sizeY - 128;
		// 	bodyDef.angle = Math.random() * 2 * Math.PI;
		// 	boxDef = new b2PolygonDef();
		// 	boxDef.SetAsBox(sizeX, sizeY);
		// 	boxDef.density = 0.08 / (pixelScale * pixelScale);
		// 	boxDef.friction = 0.5;
		// 	boxDef.restitution = 0.2;
		// 	bodyDef.userData = new Box();
		// 	bodyDef.userData.width = sizeX * 2;
		// 	bodyDef.userData.height = sizeY * 2;
		// 	container.addChild(bodyDef.userData);
		// 	body = world.CreateBody(bodyDef);
		// 	body.CreateShape(boxDef);
		// 	body.SetMassFromShapes();
		// 	dynamicBodies.push(body);
		// }

		// SG
		// //Мячи
		// let r: number;
		// for (i = 0; i < 2; i++) {
		// 	bodyDef = new b2BodyDef();
		// 	r = (Math.random() + 0.5) * pixelScale;
		// 	bodyDef.position.x = (Math.random() * 15 + 5) * pixelScale;
		// 	bodyDef.position.y = (Math.random() * 10) * pixelScale - r - 128;
		// 	bodyDef.angle = Math.random() * 2 * Math.PI;
		// 	circleDef = new b2CircleDef();
		// 	circleDef.radius = r;
		// 	circleDef.density = 0.03 / (pixelScale * pixelScale);
		// 	circleDef.friction = 0.5;
		// 	circleDef.restitution = 0.2;
		// 	bodyDef.userData = new Ball();
		// 	bodyDef.userData.width = r * 2;
		// 	bodyDef.userData.height = r * 2;
		// 	container.addChild(bodyDef.userData);
		// 	body = world.CreateBody(bodyDef);
		// 	body.CreateShape(circleDef);
		// 	body.SetMassFromShapes();
		// 	dynamicBodies.push(body);
		// }
		// dynamicBodiesGroup = new ParticleGroup(dynamicBodies);
		// addDrawable(new BodyDrawerXYRot(dynamicBodiesGroup));

		return world;
	}

	step(newCurrentTime: number, controls: Controls): void {
		const frameTimeMs = 1000 / 60; // 16.7 ms
		const timeReservedForDrawMs = 1.4;
		const timeToCalculatePhysics = frameTimeMs - timeReservedForDrawMs;
		
		const timeDiff = Math.min(newCurrentTime - this.currentTime, frameTimeMs * 10);

		const numSteps = 10;
		const dt = timeDiff / numSteps;


		for (let step = 0; step < numSteps; step++) {
			for (const power of this.powers) {
				power.applyPower(controls);
			}

			this.world.Step(0.01 * dt, this.velocityIterations, this.positionIterations);
		}

		this.currentTime = newCurrentTime;

		/*

		const maxDt = (timeToCalculatePhysics) / this.stepsPerDrawFrame;
		const timeDiff = newCurrentTime - this.currentTime;
		const numStepsNeeded = Math.ceil(timeDiff / maxDt);

		const numSteps = Math.min(numStepsNeeded, this.stepsPerDrawFrame);
		const dt = Math.min(3 * frameTimeMs, timeDiff) / numSteps;

		for (let step = 0; step < numSteps; step++) {
			for (const power of this.powers) {
				power.applyPower(controls);
			}
	
			this.world.Step(dt / 100, this.velocityIterations, this.positionIterations);
		}
		*/
	}

	/*
	step(newCurrentTime: number, controls: Controls): void {
		const maxDt = 1;
		const timeDiff = newCurrentTime - this.currentTime;
		
		const maxNumSteps = 10; // skip game frames if trying to simulate too much frames (60 FPS -> 16.7 ms per animation frame -> 8 physics frames if one takes up to 2ms to calculate)
		const maxAllowedDt = (1 / 60) / maxNumSteps;
		const numStepsNeeded = Math.min(Math.ceil(timeDiff / maxDt), maxNumSteps);
		const dt = 0.01 * Math.min(timeDiff / numStepsNeeded, maxAllowedDt);

		for (let step = 0; step < numStepsNeeded; step++) {
			for (const power of this.powers) {
				power.applyPower(controls);
			}
	
			this.world.Step(dt, this.velocityIterations, this.positionIterations);
		}

		this.currentTime = newCurrentTime;
	}
	*/

	draw(ctx: CanvasRenderingContext2D): void {
		for (const drawable of this.drawables) {
			drawable.draw(ctx);
		}
	}
}