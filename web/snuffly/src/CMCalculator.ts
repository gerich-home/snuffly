import { Body } from "./Box2D";
import { IPower } from "./core/IPower";

export class CMCalculator implements IPower {
	private _cx: number = 0;
	private _cy: number = 0;

	private _vx: number = 0;
	private _vy: number = 0;

	constructor(
		private readonly pt: Body[]
	) {
	}

	get cx() { return this._cx; }
	get cy() { return this._cy; }
	
	get vx() { return this._vx; }
	get vy() { return this._vy; }

	applyPower(): void {
		let cx = 0;
		let cy = 0;
		for (const p of this.pt) {
			const vec = p.GetPosition();
			cx += vec.x;
			cy += vec.y;
		}

		let vx = 0;
		let vy = 0;
		for (const p of this.pt) {
			const vec = p.GetLinearVelocity();
			vx += vec.x;
			vy += vec.y;
		}

		const ptCountInv = 1 / this.pt.length;
		this._cx = cx * ptCountInv;
		this._cy = cy * ptCountInv;
		this._vx = vx * ptCountInv;
		this._vy = vy * ptCountInv;
	}
}
