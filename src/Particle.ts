import { Body, Box2D, Vec2 } from "./Box2D";

export type Vector = {
	readonly x: number;
	readonly y: number;
};

export const zero: Vector = {
	x: 0,
	y: 0
};

export function fromB2D(v: Vec2) {
	return {
		x: v.x,
		y: v.y
	};
}

export function asB2D<T>(box2d: Box2D, v: Vector, action: (b2v: Vec2) => T): T {
	let b2v: Vec2 | null = null;
	try{
		b2v = new box2d.b2Vec2(v.x, v.y);
		return action(b2v);
	}
	finally {
		if (b2v) {
			box2d.destroy(b2v);
		}
	}
}

export function len(v: Vector) {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function len2(v: Vector) {
	return v.x * v.x + v.y * v.y;
}

export function mul(p: Vector, a: number): Vector {
	return {
		x: p.x * a,
		y: p.y * a,
	};
}

export function add(v1: Vector, v2: Vector): Vector {
	return {
		x: v1.x + v2.x,
		y: v1.y + v2.y,
	};
}

export function sub(v1: Vector, v2: Vector): Vector {
	return {
		x: v1.x - v2.x,
		y: v1.y - v2.y,
	};
}

export function dot(v1: Vector, v2: Vector): number {
	return v1.x * v2.x + v1.y * v2.y;
}

 //Состояние частицы(0-липкая, 1-упругая, 2-жидкая)
export enum ParticleState {
	Sticky = 0,
	Elastic = 1,
	Fluid = 2,
};

export type Particle = {
	readonly body: Body;
	readonly index: number;
	readonly spring_ij: Map<number, Spring>;

	pt_springs: number;

	group: ParticleGroup;
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
export type Spring = {
	readonly i: number;
	readonly j: number;
	next: Spring | null;
	unit_direction_to_j: Vector;
	rest_length: number;
	current_length: number;
};

export type ParticleGroup = {
	particles: Set<number>;
	state: {
		readonly type: ParticleState;
		
		//Состояние желе
		readonly jelloState: boolean;						//Желе/жидкость
		readonly frozen: boolean;							//Можно ли менять длину связей и добавлять новые?
	};
};
