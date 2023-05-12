import { IDrawable } from "./core/IDrawable";
import { IPower } from "./core/IPower";
import { Body, Box2D, Vec2 } from "./Box2D";
import { Particle, Vector } from "./Particle";

export class Jello implements IDrawable, IPower {
	ptCount: number;								//Количество частиц

	particles: Particle[];


	spring_list: Spring;						//Связый список активных связей
	spring_pool: Spring;						//Пул связей

	//Состояние желе
	jelloState: boolean;						//Желе/жидкость
	frozen: boolean;							//Можно ли менять длину связей и добавлять новые?

	//Общие параметры и просчитанные заранее данные
	spacing: number;		//Псевдорадиус
	imageRadius: number;	//Радиус изображения
	k: number;				//Сила дальнего давления
	k_near: number;		//Сила ближнего давления
	rest_density: number;	//Нулевая плотность
	r: number;				//Радиус частиц
	rsq: number;			//Квадрат радиуса
	rinv: number;			//Обратный радиус
	rinvhalf: number;		//Половина обратного радиуса

	max_springs: number;			//Максимальное число связей для вершины
	kspring: number;			//Сила пластичных связей
	stretch_speed: number;		//Скорость сжатия связей
	compress_speed: number;	//Скорость растяжения связей
	compress_treshold: number;	//Порог для сжатия связей
	stretch_treshold: number;	//Порог для растяжения связей
	viscosity_a: number;		//Параметр трения 1
	viscosity_b: number;		//Параметр трения 2

	activeParticles: Particle[];			//Активный кусок желе
	activeChanged: boolean;					//Произошло ли добавление/удаление ребра в активной группе?

	treshold: number;			//Минимальная прозрачность воды
	visible: boolean;			//Рисуем ли?

	offsetX: number;			//Смешение для корректировки прорисовки
	offsetY: number;

	// ========================================================== //
	constructor(
		readonly Box2D: Box2D,
		particles: Body[],
		spacing: number = 20,
		imageRadius: number = 30,
		rest_density: number = 1,
		treshold: number = 0xA0000000,
		visible: boolean = true,
		k: number = 0.02,
		k_near: number = 2,
		kspring: number = 0.1,
		stretch_speed: number = 0.3,
		stretch_treshold: number = 0.3,
		compress_speed: number = 0.1,
		compress_treshold: number = 0.1,
		viscosity_a: number = 0.5,
		viscosity_b: number = 0.01,
		max_springs: number = 15
	) {
		this.spacing = spacing;
		this.r = spacing * 1.25;
		this.rsq = this.r * this.r;
		this.rinv = 1 / this.r;
		this.rinvhalf = 0.5 * this.rinv;
		this.activeChanged = false;

		this.jelloState = true;
		this.frozen = false;

		this.max_springs = max_springs;
		this.kspring = kspring;

		this.stretch_speed = stretch_speed;
		this.stretch_treshold = stretch_treshold;

		this.compress_speed = compress_speed;
		this.compress_treshold = compress_treshold;

		this.viscosity_a = viscosity_a;
		this.viscosity_b = viscosity_b;

		this.k = k;
		this.k_near = k_near;
		this.spacing = spacing;
		this.imageRadius = imageRadius;
		this.rest_density = rest_density;

		this.treshold = treshold;
		this.visible = visible;

		this.spring_list = new Spring();
		this.spring_pool = new Spring();

		this.offsetX = 0;
		this.offsetY = 0;

		//canvas.stage.addEventListener(KeyboardEvent.KEY_DOWN,keyDown);
		//particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
		//particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);


		this.particles = particles.map<Particle>((body, i) => ({
			body,
			ij: [],
			ns: [],
			nsd: [],
			nsq1: [],
			nsq2: [],
			spring_ij: this.createArrayOf(() => null, i),
			power: Vector.zero,
			press: 0,
			press_near: 0,
			pt_springs: 0,
			pt_state: 0,
			p: Vector.zero,
			ro: 0,
			ro_near: 0,
			v: Vector.zero,
			activeGroup: false,
			groupqueue: 0,
		}));
		this.ptCount = this.particles.length;
		this.activeParticles = this.particles;
		if (this.ptCount > 0) {
			this.particles[0].activeGroup = true;
		}

		//Возращаем в пул лишнее
		let spring: Spring | null = this.spring_pool.next;
		let j = 0;
		while (spring) {
			j++;
			spring = spring.next;
		}

		spring = this.spring_list.next;
		while (spring) {
			j++;
			if (!spring.next) {
				spring.next = this.spring_pool.next;
				this.spring_pool.next = this.spring_list.next;
				break;
			}
			spring = spring.next;
		}
		this.spring_list.next = null;

		j = max_springs * this.ptCount * 0.5 - j;
		for (let i = 0; i < j; i++) {
			this.spring_pool.next = new Spring(this.spring_pool.next);
		}
	}

	createArrayOf<T>(factory: (index: number) => T, count: number = this.ptCount) {
		return Array(count).fill(null).map((_, index) => factory(index));
	}

	// ========================================================== //
	// function keyDown(event: KeyboardEvent): void {
	// 	const spring: Spring;
	// 	const i: number;
	// 	const j: number;
	// 	const new_state: number;
	// 	if (event.keyCode === 81)		//липкость/упругость
	// 	{
	// 		if (jelloState)			//Меняем липкость и упругость
	// 		{
	// 			frozen = !frozen;
	// 			new_state = frozen ? 1 : 0;
	// 		}
	// 		else					//Переходим из воды в желе
	// 		{
	// 			frozen = false;
	// 			new_state = 0;
	// 		}

	// 		const dx: number;
	// 		const dy: number;
	// 		const vec1: b2Vec2;
	// 		const vec2: b2Vec2;
	// 		const d: number;
	// 		const smallr: number = 0.01 * r;
	// 		const smallrsq: number = smallr * smallr;
	// 		const sqrt: Function = Math.sqrt;

	// 		for (i = 0; i < ptCount; i++)			//Переводим активные частички в новое состояние
	// 			if (activeGroup[i])
	// 				pt_state[i] = new_state;

	// 		if (frozen)						//На всякий случай "ослабляем" короткие связи и укорачиваем длинные
	// 		{
	// 			spring = spring_list.next;
	// 			while (spring) {
	// 				i = spring.i;
	// 				j = spring.j;
	// 				if (activeGroup[i] || activeGroup[j]) {
	// 					vec1 = pt[i].GetPosition();
	// 					vec2 = pt[j].GetPosition();
	// 					dx = vec1.x - vec2.x;
	// 					dy = vec1.y - vec2.y;
	// 					d = dx * dx + dy * dy;
	// 					if (d > rsq)
	// 						spring.l = r;
	// 					else if (d < smallrsq)
	// 						spring.l = smallr;
	// 					else
	// 						spring.l = sqrt(d);
	// 				}
	// 				spring = spring.next;
	// 			}
	// 		}
	// 	}
	// 	else if (event.keyCode === 69)		//становимся водичкой
	// 	{
	// 		if (jelloState)				//из желе в воду
	// 		{
	// 			frozen = false;

	// 			const prev: Spring;
	// 			spring = spring_list.next;
	// 			prev = spring_list;
	// 			while (spring) {
	// 				i = spring.i;
	// 				j = spring.j;
	// 				if (activeGroup[i] || activeGroup[j]) {
	// 					prev.next = spring.next;
	// 					spring_ij[i][j] = null;
	// 					spring.next = spring_pool.next;
	// 					spring_pool.next = spring;
	// 					spring = prev.next;
	// 					continue;
	// 				}
	// 				prev = spring;
	// 				spring = spring.next;
	// 			}
	// 			for (i = 0; i < ptCount; i++)			//Переводим активные частички в новое состояние
	// 				if (activeGroup[i]) {
	// 					pt_state[i] = 2;
	// 					pt_springs[i] = 0;
	// 				}
	// 		}
	// 		else {
	// 			for (i = 0; i < ptCount; i++)			//Переводим активные частички в новое состояние
	// 				if (activeGroup[i])
	// 					pt_state[i] = 0;
	// 		}
	// 		jelloState = !jelloState;
	// 	}
	// }

	applyPower(): void {

		const sector_yx: number[][] = [];
		const sector_yxi: number[][][] = [];

		const sector_y: number[] = [];

		for (let i = 0; i < this.ptCount; i++) {
			const particle = this.particles[i];
			const vec1 = Vector.fromB2D(particle.body.GetPosition());

			const pf = vec1.mul(this.rinvhalf);

			const s1 = Math.floor(pf.x - 0.5);
			const s2 = Math.floor(pf.x + 0.5);

			const dy1 = pf.y + 0.5;
			for (let y1 = pf.y - 0.5; y1 <= dy1; y1++) {
				const q1 = Math.floor(y1);
				const j = sector_y.indexOf(q1);

				let a: number[];
				let b: number[][];
				if (j < 0) {
					a = [];
					b = [];
					sector_y.push(q1);
					sector_yx.push(a);
					sector_yxi.push(b);
				} else {
					a = sector_yx[j];
					b = sector_yxi[j];
				}

				const j2 = a.indexOf(s1);
				let c: number[];
				if (j2 < 0) {
					a.push(s1);
					c = [];
					b.push(c);
				} else {
					c = b[j2];
				}
				c.push(i);

				const j3 = a.indexOf(s2);
				if (j3 < 0) {
					a.push(s2);
					c = [];
					b.push(c);
				} else {
					c = b[j3];
				}
				c.push(i);

			}

			particle.ns = [];
			particle.nsq1 = [];
			particle.nsq2 = [];
			particle.nsd = [];

			particle.ro = 0;
			particle.ro_near = 0;
			particle.power = Vector.zero;
			particle.p = vec1;

			particle.v = Vector.fromB2D(particle.body.GetLinearVelocity());

			particle.ij = this.createArrayOf(() => 0, i);
		}

		this.activeChanged = false;

		let spring: Spring | null = null;
		const gli = sector_yxi.length;
		for (let gi = 0; gi < gli; gi++) {
			const b = sector_yxi[gi];
			const glj = b.length;
			for (let gj = 0; gj < glj; gj++) {
				const c = b[gj];
				const glc = c.length - 1;
				for (let ci = 0; ci <= glc; ci++) {
					const i = c[ci];
					const particleI = this.particles[i];
					let s4 = particleI.ro;
					let s5 = particleI.ro_near;
					let v = particleI.v;
					let z = particleI.pt_springs;
					let pt_statei = particleI.pt_state;

					for (let cj = 0; cj < ci; cj++) {
						const j = c[cj];
						const particleJ = this.particles[j];
						if (particleI.ij[j] === 0) {
							let dv = particleJ.p.sub(particleI.p);
							let qd = dv.x * dv.x;
							if (qd < this.rsq) {
								qd += dv.y * dv.y;
								if (qd < this.rsq) {
									let spring: Spring | null = null;

									const d = Math.sqrt(qd);
									if (((!this.frozen) && (this.jelloState) && (particleI.activeGroup || particleJ.activeGroup)) ||		//слипание двух активных кусков/слипание активного и неактивного
										((pt_statei === 0) && (particleJ.pt_state === 0))) {					//слипание двух неактивных желе
										if (particleI.spring_ij[j]) {
											spring = particleI.spring_ij[j];
										} else if (z < this.max_springs) {
											if (particleJ.pt_springs < this.max_springs) {
												spring = this.spring_pool.next;
												if (spring) {
													this.spring_pool.next = spring.next;
													spring.next = this.spring_list.next;
													spring.i = i;
													spring.j = j;
													spring.l = d;
													particleI.spring_ij[j] = spring;
													this.spring_list.next = spring;
													z++;
													particleJ.pt_springs++;
													particleJ.pt_state = 0;
													pt_statei = 0;
													if (particleI.activeGroup) {
														if (!particleJ.activeGroup) {
															this.activeChanged = true;
														}
													} else if (particleJ.activeGroup) {
														this.activeChanged = true;
													}
												}
											}
										}
									}


									if (spring) {
										spring.d = d;
										if (pt_statei === 0) {
											const q1 = spring.l;
											let q2 = q1 * this.stretch_treshold;
											let q3 = d - q1;
											if (q3 > q2) {
												spring.l += q1 * this.rinv * this.stretch_speed * (q3 - q2);
											} else {
												q2 = q1 * this.compress_treshold;
												q3 = d - q1;
												if (q3 < -q2) {
													spring.l += q1 * this.rinv * this.compress_speed * (q3 + q2);
												}
											}
										}
									}

									if (d > 0.01) {
										particleI.ns.push(j);

										const q1 = 1 - d * this.rinv;
										const q2 = q1 * q1;
										const q3 = q2 * q1;
										s4 += q2;
										s5 += q3;
										particleJ.ro += q2;
										particleJ.ro_near += q3;
										particleI.nsq1.push(q1);
										particleI.nsq2.push(q2);
										
										dv = dv.mul(1 / d);
										if (spring) {											
											spring.dv = dv;
										}
										particleI.nsd.push(dv);

										const s3 = v.sub(particleJ.v).dot(dv);
										if (s3 > 0) {
											const s4 = (s3 > 100) ? 100 : s3
											const s1 = q1 * (this.viscosity_a + this.viscosity_b * s4) * s4;
											dv = dv.mul(s1);
											v = v.sub(dv);
											particleJ.v = particleJ.v.add(dv);
										}
										particleI.ij[j] = 1;
									} else {
										particleI.ij[j] = -1;
									}
								} else {
									particleI.ij[j] = -1;
								}
							} else {
								particleI.ij[j] = -1;
							}
						}
					}
					particleI.ro = s4;
					particleI.ro_near = s5;
					particleI.pt_springs = z;
					particleI.v = v;
					particleI.pt_state = pt_statei;
				}
			}
		}

		spring = this.spring_list.next;
		let prev = this.spring_list;
		while (spring) {
			const i = spring.i;
			const j = spring.j;
			const particleI = this.particles[i];
			const particleJ = this.particles[j];
			let s1 = spring.l;
			if (s1 > this.r) {
				prev.next = spring.next;
				particleI.spring_ij[j] = null;
				spring.next = this.spring_pool.next;
				this.spring_pool.next = spring;
				spring = prev.next;
				particleI.pt_springs--;
				particleJ.pt_springs--;
				this.activeChanged ||= particleI.activeGroup || particleJ.activeGroup;
				continue;
			} else {
				let d = spring.d;
				let dv: Vector;
				if (d < 0) {
					dv = particleJ.p.sub(particleI.p);
					d = dv.length;
					if (d > 0.01) {
						const q1 = 1 / d;
						dv = dv.mul(q1);
					}
					if (particleI.pt_state === 1) {
						if ((d > 4 * this.r) || ((d > 2 * this.r) && ((particleI.pt_springs < 5) || (particleJ.pt_springs < 5)))) {
							prev.next = spring.next;
							particleI.spring_ij[j] = null;
							spring.next = this.spring_pool.next;
							this.spring_pool.next = spring;
							spring = prev.next;
							particleI.pt_springs--;
							particleJ.pt_springs--;
							this.activeChanged ||= particleI.activeGroup || particleJ.activeGroup;
							continue;
						}
					} else {
						const s2 = s1 * this.stretch_treshold;
						const s3 = d - s1;
						if (s3 > s2) {
							spring.l += s1 * this.rinv * this.stretch_speed * (s3 - s2);
						}
						s1 = spring.l;
						if (s1 > this.r) {
							prev.next = spring.next;
							particleI.spring_ij[j] = null;
							spring.next = this.spring_pool.next;
							this.spring_pool.next = spring;
							spring = prev.next;
							particleI.pt_springs--;
							particleJ.pt_springs--;
							this.activeChanged ||= particleI.activeGroup || particleJ.activeGroup;
							continue;
						}
					}
				} else {
					dv = spring.dv;
					spring.d = -1;
				}
				if (d > 0.01) {
					let q1: number;
					if (particleI.pt_state === 1) {
						q1 = this.kspring * (s1 - d);// *(1-s1*rinv)
					} else {
						q1 = 2 * this.kspring * (s1 - d);
					}
					dv = dv.mul(q1);
					particleJ.power = particleJ.power.add(dv);
					particleI.power = particleI.power.sub(dv);
				}
			}
			prev = spring;
			spring = spring.next;
		}

		if (this.activeChanged) {
			if (this.jelloState) {
				const groups: number[][] = [];
				const groupid = this.createArrayOf(() => 0);
				let s = 0;
				for (let g = 1, j = 0; j < this.ptCount; j = g++) {
					const particleJ = this.particles[j];
					if (s < this.ptCount) {
						if (groupid[j] === 0) {
							if (particleJ.activeGroup) {
								const group: number[] = [];
								let grouphead = 1;
								let groupend = 0;
								this.particles[0].groupqueue = j;
								groupid[j] = g;
								group.push(j);
								while (groupend < grouphead) {
									const i = this.particles[groupend].groupqueue;
									groupend++;

									for (let m = 0; m < i; m++) {
										if (this.particles[i].spring_ij[m]) {
											if (groupid[m] === 0) {
												groupid[m] = g;
												group.push(m);
												this.particles[grouphead].groupqueue = m;
												grouphead++;
											}
										}
									}
									for (let m = i + 1; m < this.ptCount; m++) {
										if (groupid[m] === 0) {
											if (this.particles[m].spring_ij[i]) {
												groupid[m] = g;
												group.push(m);
												this.particles[grouphead].groupqueue = m;
												grouphead++;
											}
										}
									}
									if (grouphead === this.ptCount) {
										break;
									}
								}
								s += grouphead;
								groups.push(group);
							}
						}
					}
					particleJ.activeGroup = false;
				}

				const l = groups.length;
				let j = 0;
				let ml = groups[0].length;
				for (let i = 1; i < l; i++) {
					s = groups[i].length;
					if (s > ml) {
						j = i;
						ml = s;
					}
				}

				const group = groups[j];

				this.activeParticles = this.createArrayOf(i => this.particles[group[i]], ml);

				for (let i = 0; i < ml; i++) {
					const s = group[i];
					this.particles[s].activeGroup = true;
				}
			} else {
				this.activeParticles = this.particles;
			}
		}

		for (const particle of this.particles) {
			particle.press = this.k * (particle.ro - this.rest_density);
			particle.press_near = this.k_near * particle.ro_near;
		}

		for (const particle of this.particles) {
			let dv = Vector.zero;

			for (let j = 0; j < particle.ns.length; j++) {
				const particleZ = this.particles[particle.ns[j]];

				const dn = (particle.press + particleZ.press) * particle.nsq1[j] +
					(particle.press_near + particleZ.press_near) * particle.nsq2[j];

				const q = particle.nsd[j].mul(dn);

				dv = dv.add(q);
				particleZ.power = particleZ.power.add(q);
			}

			particle.power = particle.power.sub(dv);
		}

		for (const particle of this.particles) {
			const dv = particle.power;
			const d = dv.length;
			if (d > 2) {
				dv.mul(2 / d)
					.asB2D(this.Box2D, v => {
						particle.body.ApplyForceToCenter(v, true);
					});
			} else if (d > 0.09) {
				dv
					.asB2D(this.Box2D, v => {
						particle.body.ApplyForceToCenter(v, true);
					});
			}

			particle.v
				.asB2D(this.Box2D, v => {
					particle.body.SetLinearVelocity(v);
				});

			new Vector(0, -0.06 * (Math.sin(cntr / 50)))
				.asB2D(this.Box2D, v => {
					particle.body.ApplyForceToCenter(v, true);
				});
		}

		cntr++;
	}

	draw(ctx: CanvasRenderingContext2D): void {
		let spring = this.spring_list.next;
		while (spring) {
			ctx.beginPath();
			const p1 = this.particles[spring.i].body.GetPosition();
			const p2 = this.particles[spring.j].body.GetPosition();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();
			spring = spring.next;
		}

		for (const particle of this.particles) {
			const p = particle.body.GetPosition();
			ctx.beginPath();
			ctx.ellipse(p.x, p.y, 1, 1, 0, 0, 2 * Math.PI);
			ctx.stroke();
		}


		// SG
		// const bmp: BitmapData = canvas.bitmapData;
		// const w: unumber = canvas.width;
		// const h: unumber = canvas.height;
		// bmp.lock();
		// bmp.fillRect(new Rectangle(0, 0, w, h), 0);
		// const i: number;
		// const p: b2Body;
		// const pnt: Point;
		// const m: Matrix;
		// m = new Matrix();
		// const r: number;
		// const r1: Rectangle = new Rectangle(0, 0, 2 * this.imageRadius, 2 * this.imageRadius);
		// pnt = new Point(0, 0);
		// for (i = 0; i < this.ptCount; i++) {
		// 	p = particle.pt;
		// 	pnt.x = particle.px - this.imageRadius + this.offsetX;
		// 	pnt.y = particle.py - this.imageRadius + this.offsetY;
		// 	bmp.copyPixels(p.GetUserData() as BitmapData, r1, pnt, null, null, true);
		// }
		// const rect: Rectangle = new Rectangle(0, 0, w, h);
		// bmp.threshold(bmp, rect, new Point(0, 0), "<", this.treshold);

		/*for (i=0; i<ptCount; i++)
		{
			if(activeGroup[i])
				bmp.setPixel(px[i]+offsetX,py[i]+offsetY,0xFF0000);
			if(pt_state[i]==0)
				bmp.setPixel(px[i]+offsetX+2,py[i]+offsetY,0x00FF00);
			if(pt_state[i]==1)
				bmp.setPixel(px[i]+offsetX-2,py[i]+offsetY,0x0000FF);
			if(pt_state[i]==2)
				bmp.setPixel(px[i]+offsetX,py[i]+offsetY+2,0xFFFFFF);
			
		}
		
		bmp.draw(sh);
		*/
		//bmp.threshold(bmp,rect, new Point(0, 0), ">", 0,0xFF000000+_waterColor);
		//bmp.colorTransform(rect,new ColorTransform(1,1,1,1,0,0,0,255));


		//SG bmp.unlock();
	}
}

//Пластичная связь
export class Spring {
	d: number = 0;
	dv: Vector = Vector.zero;
	l: number;
	i: number;
	j: number;
	next: Spring | null;

	constructor(
		next: Spring | null = null,
		i: number = -1,
		j: number = -1,
		l: number = -1
	) {
		this.i = i;
		this.j = j;
		this.next = next;
		this.l = l;
	}
}

let cntr = 0;
