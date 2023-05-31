import { Body, Box2D, Vec2 } from "./Box2D";

export class Vector {
	constructor(
		public readonly x: number,
		public readonly y: number
	) {}

	static readonly zero = new Vector(0, 0);

	static fromB2D(v: Vec2) {
		return new Vector(
			v.x,
			v.y
		);
	}

	asB2D<T>(box2d: Box2D, action: (v: Vec2) => T): T {
		let v: Vec2 | null = null;
		try{
			v = new box2d.b2Vec2(this.x, this.y);
			return action(v);
		}
		finally {
			if (v) {
				box2d.destroy(v);
			}
		}
	}

	get length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	
	get length2() {
		return this.x * this.x + this.y * this.y;
	}

	mul(a: number): Vector {
		return new Vector(
			this.x * a,
			this.y * a,
		);
	}

	add(v: Vector): Vector {
		return new Vector(
			this.x + v.x,
			this.y + v.y,
		);
	}

	sub(v: Vector): Vector {
		return new Vector(
			this.x - v.x,
			this.y - v.y,
		);
	}

	dot(v: Vector): number {
		return this.x * v.x + this.y * v.y;
	}
};

 //Состояние частицы(0-липкая, 1-упругая, 2-жидкая)
export enum ParticleState {
	Sticky = 0,
	Elastic = 1,
	Fluid = 2,
};

export type Particle = {
	readonly body: Body; //Частицы желе
	readonly index: number;
	readonly spring_ij: Map<number, (null | Spring)>; //Связь между частицами i и j

	pt_springs: number; //Число связей у частицы
	pt_state: ParticleState;

	group: number; //Входит ли i-ая точка в активный кусок желе?
};

//Соседи i-ой частицы с номерами меньше i
export type NeighborsData = {
	neighbors: Neighbor[][];
	neighbors_map: Map<number, Neighbor>[];
};

export type Neighbor = {
	j: number,
	distance_between_particles: number;
	q1: number; // для SPH модели
	q2: number; // для SPH модели
	unit_direction: Vector; // вектор к соседней частице
};


//Пластичная связь
export class Spring {
	constructor(
		public readonly i: number,
		public readonly j: number,
		public next: Spring | null,
		public unit_direction_to_j: Vector,
		public rest_length: number,
		public current_length: number
	) {
	}
}
