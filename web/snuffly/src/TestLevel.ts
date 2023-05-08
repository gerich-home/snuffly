import { AABB, Body, BodyDef, Box2D, CircleShape, World } from "./Box2D";
import { CMCalculator } from "./CMCalculator";
import { Jello } from "./Jello";
import { IDrawable } from "./core/IDrawable";
import { IPower } from "./core/IPower";

const pixelScale = 30;

export class TestLevel {
	readonly world: World;
	readonly powers: IPower[];
	readonly drawables: IDrawable[];
	readonly velocityIterations = 2;
	readonly positionIterations = 2;

	constructor(
		Box2D: Box2D
	) {
		this.world = this.createBox2DWorld(Box2D);
		const jello = this.createJello(Box2D, this.world, 100, 20, 8);
		const cmCalc = new CMCalculator(jello.pt);

		this.drawables = [
			jello
		];

		this.powers = [
			jello,
			cmCalc,
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

	createJello(Box2D: Box2D, world: World, count: number = 200, r: number = 20, b2r: number = 1, m: number = 0.01, friction: number = 1, restitution: number = 0.1, rest_density: number = 1, xmin: number = 100, ymin: number = 0, xmax: number = 450, ymax: number = 200): Jello {
		const jellopt: Body[] = [];


		const density: number = m / (Math.PI * b2r * b2r);
		//let bmp1: BitmapData = FluidParticle.drawBubble(1.5 * r, 0xFFEE00);
		//let bmp2: BitmapData = FluidParticle.drawBubble(1.5 * r, 0xFF7700);

		for (let i = 0; i < count; i++) {
			const bodyDef = new Box2D.b2BodyDef();
			bodyDef.fixedRotation = true;
			//bodyDef.userData = ((unumber(Math.random() * 2) === 0) ? bmp1 : bmp2);
			bodyDef.position.x = xmin + (xmax - xmin) * Math.random();
			bodyDef.position.y = ymin + (ymax - ymin) * Math.random();
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
		const gravity = new Box2D.b2Vec2(0.0, 0.2 * pixelScale);

		const world = new Box2D.b2World(gravity);

		let dynamicBodies: Body[] = [];

		let i: number;

		//Земля
		const bodyDef = new Box2D.b2BodyDef();
		bodyDef.position.Set(10 * pixelScale, 15 * pixelScale);
		//bodyDef.userData = new Ground();
		//bodyDef.userData.width = 512 * 3//2 * 30 * pixelScale; 
		//bodyDef.userData.height = 256//2 * 3 * pixelScale; 
		//bodyDef.userData.x = 10 * pixelScale;
		//bodyDef.userData.y = 15 * pixelScale;
		//container.addChild(bodyDef.userData);
		const boxDef = new Box2D.b2PolygonShape();
		boxDef.SetAsBox(256 * 3/*30*pixelScale*/, 128/*3*pixelScale*/);
		const boxFixtureDef = new Box2D.b2FixtureDef();
		boxFixtureDef.shape = boxDef;
		boxFixtureDef.friction = 0.5;
		boxFixtureDef.density = 0;
		const body = world.CreateBody(bodyDef);
		body.CreateFixture(boxFixtureDef);

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

	step(dt: number): void {
		for (const power of this.powers) {
			power.applyPower();
		}

		this.world.Step(dt, this.velocityIterations, this.positionIterations);
	}

	draw(ctx: CanvasRenderingContext2D): void {
		for (const drawable of this.drawables) {
			drawable.draw(ctx);
		}
	}
}