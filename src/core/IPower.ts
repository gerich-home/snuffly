export type IPower = {
	applyPower(controls: Controls): void;
};


export type Controls = {
	spinPower: number;
	left: boolean;
	right: boolean;
	down: boolean;
	up: boolean;
	turnFluid: boolean;
	turnElastic: boolean;
	turnJello: boolean;
	gx: number;
	gy: number;
};
