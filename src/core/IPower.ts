import { Vector } from "../Particle";

export type IPower = {
	applyForces(controls: Controls, dt: number): void;
};

export type Controls = {
	spins: 'left' | 'right' | 'none';
	left: boolean;
	right: boolean;
	down: boolean;
	up: boolean;
	turnFluid: boolean;
	turnElastic: boolean;
	turnJello: boolean;
	soft: boolean;
	gravity: Vector;
};
