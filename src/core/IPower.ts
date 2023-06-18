import { Vector } from "../Particle";

export type IPower = {
	applyForces(controls: Controls): void;
};

export type Controls = {
	spins: boolean;
	left: boolean;
	right: boolean;
	down: boolean;
	up: boolean;
	turnFluid: boolean;
	turnElastic: boolean;
	turnJello: boolean;
	gravity: Vector;
};
