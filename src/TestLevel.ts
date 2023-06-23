import { Body, Box2D, World } from "./Box2D";
import { Jello } from "./Jello";
import { IDrawable } from "./core/IDrawable";
import { Controls, IPower } from "./core/IPower";
import { scale } from "./scale";


export class TestLevel {
	readonly world: World;
	readonly powers: IPower[];
	readonly drawables: IDrawable[];
	readonly velocityIterations = 2;
	readonly positionIterations = 2;
	readonly stepsPerDrawFrame = 10;
	readonly particleRadius = 8 / scale;
	currentTime: number = 0;

	constructor(
		public readonly Box2D: Box2D,
		public readonly width: number,
		public readonly height: number,
		public readonly isMobile: boolean
	) {
		this.world = this.createBox2DWorld(Box2D);
		const jello = this.createJello(Box2D, this.world);
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

	createJello(Box2D: Box2D, world: World): Jello {
		const particles: Body[] = [];

		const count = 100;
		const r = 25 / scale;
		const particleMass = 0.01;
		const friction = 1;
		const restitution = 0.1;
		const restDensity = 1;

		const {particleRadius} = this;

		const jelloDensity = particleMass / (Math.PI * particleRadius * particleRadius);
		//let bmp1: BitmapData = FluidParticle.drawBubble(1.5 * r, 0xFFEE00);
		//let bmp2: BitmapData = FluidParticle.drawBubble(1.5 * r, 0xFF7700);

		for (let i = 0; i < count; i++) {
			const bodyDef = new Box2D.b2BodyDef();
			bodyDef.fixedRotation = true;
			bodyDef.position.x = particleRadius + (this.width - 2 * particleRadius) * Math.random();
			bodyDef.position.y = particleRadius + (this.height - 2 * particleRadius) * Math.random();
			bodyDef.type = 2;

			const circleDef = new Box2D.b2CircleShape();
			circleDef.m_radius = particleRadius;

			const circleFixtureDef = new Box2D.b2FixtureDef();

			circleFixtureDef.shape = circleDef;
			circleFixtureDef.friction = friction;
			circleFixtureDef.density = jelloDensity;
			circleFixtureDef.restitution = restitution;
			circleFixtureDef.filter.groupIndex = -1;		//игнорируем другие частицы

			const body = world.CreateBody(bodyDef);
			body.CreateFixture(circleFixtureDef);
			particles.push(body);
		}

		return new Jello({
			Box2D,
			particles,
			r,
			restDensity,
			k: 0.02 / scale,
			kNear: 2 / scale,
			kSpringStrong: 0.1,
			kSpringSoft: 0.02,
			softSpringStretchSpeed: 0.1,
			softSpringStretchTreshold: 0.5 / scale,
			softSpringCompressSpeed: 3,
			softSpringCompressTreshold: 0.2 / scale,
			viscosityA: 0.5,
			viscosityB: 0.01,
			maxParticleSpringsCount: 15,
			controlPower: 0.2 / scale,
			compressPower: 0.01,
			activeSpinningCompressPower: 0.002,
			spinPower: 0.003,
			maxCollisionVelocity: 100 / scale,
			minNeighborDistance: 0.01 / scale,
			maxSoftSpringCurrentLength: 1.2 * r,
			maxStrongSpringCurrentLength: 2 * r,
		});
	}

	// ========================================================== //
	private createBox2DWorld(Box2D: Box2D): World {
		const gravity = this.isMobile ?
			new Box2D.b2Vec2(0, 0) :
			new Box2D.b2Vec2(0, 9 / scale);

		const world = new Box2D.b2World(gravity);

		let dynamicBodies: Body[] = [];

		let i: number;

		const wall_size = 10 / scale;
		
		const {particleRadius: particleRadiusInMeters} = this;

		{
			// Левая стена
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(-wall_size - particleRadiusInMeters, this.height / 2);
			boxDef.SetAsBox(wall_size, this.height / 2 + wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}
		{
			// Потолок
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(this.width / 2, -wall_size - particleRadiusInMeters);
			boxDef.SetAsBox(this.width / 2 + wall_size, wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}

		{
			// Правая стена
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(this.width + wall_size + particleRadiusInMeters, this.height / 2);
			boxDef.SetAsBox(wall_size, this.height / 2 + wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}

		{
			// Пол
			const bodyDef = new Box2D.b2BodyDef();
			const boxDef = new Box2D.b2PolygonShape();
			bodyDef.position.Set(this.width / 2, this.height + wall_size + particleRadiusInMeters);
			boxDef.SetAsBox(this.width / 2 + wall_size, wall_size);
			const boxFixtureDef = new Box2D.b2FixtureDef();
			boxFixtureDef.shape = boxDef;
			boxFixtureDef.friction = 0.5;
			boxFixtureDef.density = 0;
			const body = world.CreateBody(bodyDef);
			body.CreateFixture(boxFixtureDef);
		}

		return world;
	}

	step(newCurrentTime: number, controls: Controls): void {
		const frameTimeMs = 1000 / 60; // 16.7 ms
		const timeReservedForDrawMs = 1.4;
		const timeToCalculatePhysics = frameTimeMs - timeReservedForDrawMs;

		const timeDiff = Math.min(newCurrentTime - this.currentTime, frameTimeMs * 10);

		const numSteps = 10;
		const dt = 0.01 * timeDiff / numSteps;

		for (let step = 0; step < numSteps; step++) {
			for (const power of this.powers) {
				power.applyForces(controls, dt);
			}

			this.world.Step(dt, this.velocityIterations, this.positionIterations);
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