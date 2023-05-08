﻿import { IDrawable } from "./core/IDrawable";
import { IPower } from "./core/IPower";
import { Body, Box2D } from "./Box2D";
import { Particle } from "./Particle";

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
			nsdx: [],
			nsdy: [],
			nsq1: [],
			nsq2: [],
			spring_ij: this.createArrayOf(() => null, i),
			powerx: 0,
			powery: 0,
			press: 0,
			press_near: 0,
			pt_springs: 0,
			pt_state: 0,
			px: 0,
			py: 0,
			ro: 0,
			ro_near: 0,
			vx: 0,
			vy: 0,
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
		const sqrt: Function = Math.sqrt;
		const floor: Function = Math.floor;
		const min: Function = Math.min;

		const sector_y: number[] = [];
		const sector_yx: number[][][] = [];
		const sector_yxi: number[][][] = [];

		for (let i = 0; i < this.ptCount; i++) {
			const particle = this.particles[i];
			const p = particle.body;
			const vec1 = p.GetPosition();
			const pxf = vec1.x * this.rinvhalf;
			const pyf = vec1.y * this.rinvhalf;

			const s1 = floor(pxf - 0.5);
			const s2 = floor(pxf + 0.5);

			const dy1 = pyf + 0.5;
			for (let y1 = pyf - 0.5; y1 <= dy1; y1++) {
				const q1 = floor(y1);
				const j = sector_y.indexOf(q1);

				let a: number[][];
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
			particle.nsdx = [];
			particle.nsdy = [];

			particle.ro = 0;
			particle.ro_near = 0;
			particle.powerx = 0;
			particle.powery = 0;
			particle.px = vec1.x;
			particle.py = vec1.y;
			const vec2 = p.GetLinearVelocity();
			particle.vx = vec2.x;
			particle.vy = vec2.y;

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
					const particle = this.particles[i];
					const iji = particle.ij;
					let s4 = particle.ro;
					let s5 = particle.ro_near;
					const ndx = particle.nsdx;
					const ndy = particle.nsdy;
					const nq1 = particle.nsq1;
					const nq2 = particle.nsq2;
					const n = particle.ns;
					const p_x = particle.px;
					const p_y = particle.py;
					let v_x = particle.vx;
					let v_y = particle.vy;
					const spring_iji = particle.spring_ij;
					const activei = particle.activeGroup;
					let z = particle.pt_springs;
					let pt_statei = particle.pt_state;

					for (let cj = 0; cj < ci; cj++) {
						const j = c[cj];
						const particleJ = this.particles[j];
						if (iji[j] === 0) {
							let dx = particleJ.px - p_x;
							let qd = dx * dx;
							if (qd < this.rsq) {
								let dy = particleJ.py - p_y;
								qd += dy * dy;
								if (qd < this.rsq) {
									let spring: Spring | null = null;

									const activej = particleJ.activeGroup;
									const d = sqrt(qd);
									if (((!this.frozen) && (this.jelloState) && (activei || activej)) ||		//слипание двух активных кусков/слипание активного и неактивного
										((pt_statei === 0) && (particleJ.pt_state === 0))) {					//слипание двух неактивных желе
										if (spring_iji[j]) {
											spring = spring_iji[j];
										} else if (z < this.max_springs) {
											if (particleJ.pt_springs < this.max_springs) {
												spring = this.spring_pool.next;
												if (spring) {
													this.spring_pool.next = spring.next;
													spring.next = this.spring_list.next;
													spring.i = i;
													spring.j = j;
													spring.l = d;
													spring_iji[j] = spring;
													this.spring_list.next = spring;
													z++;
													particleJ.pt_springs++;
													particleJ.pt_state = 0;
													pt_statei = 0;
													if (activei) {
														if (!activej) {
															this.activeChanged = true;
														}
													} else if (activej) {
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
										n.push(j);

										const q1 = 1 - d * this.rinv;
										const q2 = q1 * q1;
										let q3 = q2 * q1;
										s4 += q2;
										s5 += q3;
										particleJ.ro += q2;
										particleJ.ro_near += q3;
										nq1.push(q1);
										nq2.push(q2);

										q3 = 1 / d;
										dx *= q3;
										dy *= q3;
										if (spring) {
											spring.dx = dx;
											spring.dy = dy;
										}
										ndx.push(dx);
										ndy.push(dy);

										const s3 = (v_x - particleJ.vx) * dx + (v_y - particleJ.vy) * dy;
										if (s3 > 0) {
											let s1: number;
											if (s3 > 100) {
												s1 = q1 * (this.viscosity_a + this.viscosity_b * 100) * 100;
											} else {
												s1 = q1 * (this.viscosity_a + this.viscosity_b * s3) * s3;
											}
											dx *= s1;
											dy *= s1;
											v_x -= dx;
											v_y -= dy;
											particleJ.vx += dx;
											particleJ.vy += dy;
										}
										iji[j] = 1;
									} else {
										iji[j] = -1;
									}
								} else {
									iji[j] = -1;
								}
							} else {
								iji[j] = -1;
							}
						}
					}
					particle.ro = s4;
					particle.ro_near = s5;
					particle.pt_springs = z;
					particle.vx = v_x;
					particle.vy = v_y;
					particle.pt_state = pt_statei;
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
			const pt_statei = particleI.pt_state;
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
				let dx: number;
				let dy: number;
				if (d < 0) {
					dx = particleJ.px - particleI.px;
					dy = particleJ.py - particleI.py;
					d = sqrt(dx * dx + dy * dy);
					if (d > 0.01) {
						const q1 = 1 / d;
						dx *= q1;
						dy *= q1;
					}
					if (pt_statei === 1) {
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
					dx = spring.dx;
					dy = spring.dy;
					spring.d = -1;
				}
				if (d > 0.01) {
					let q1: number;
					if (pt_statei === 1) {
						q1 = this.kspring * (s1 - d);// *(1-s1*rinv)
					} else {
						q1 = 2 * this.kspring * (s1 - d);
					}
					dx *= q1;
					dy *= q1;
					particleJ.powerx += dx;
					particleJ.powery += dy;
					particleI.powerx -= dx;
					particleI.powery -= dy;
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
									const particleI = this.particles[i];
									const spring_iji = particleI.spring_ij;

									for (let m = 0; m < i; m++) {
										if (spring_iji[m]) {
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
			let dx = 0;
			let dy = 0;

			const n = particle.ns;
			const nq1 = particle.nsq1;
			const nq2 = particle.nsq2;
			const ndx = particle.nsdx;
			const ndy = particle.nsdy;
			const s1 = particle.press;
			const s2 = particle.press_near;
			const l = n.length;
			for (let j = 0; j < l; j++) {
				const z = n[j];

				const dn = (s1 + this.particles[z].press) * nq1[j] + (s2 + this.particles[z].press_near) * nq2[j];

				let q1 = ndx[j] * dn;
				dx += q1;
				this.particles[z].powerx += q1;
				q1 = ndy[j] * dn;
				dy += q1;
				this.particles[z].powery += q1;
			}
			particle.powerx -= dx;
			particle.powery -= dy;
		}

		for (const particle of this.particles) {
			const p = particle.body;
			const dx = particle.powerx;
			const dy = particle.powery;
			let d = sqrt(dx * dx + dy * dy);
			if (d > 2) {
				d = 2 / d;
				const v = new this.Box2D.b2Vec2(dx * d, dy * d);
				p.ApplyForceToCenter(v, true);
				this.Box2D.destroy(v);
			} else if (d > 0.09) {
				const v = new this.Box2D.b2Vec2(dx, dy);
				p.ApplyForceToCenter(v, true);
				this.Box2D.destroy(v);
			}

			const v = new this.Box2D.b2Vec2(particle.vx, particle.vy);
			p.SetLinearVelocity(v);
			this.Box2D.destroy(v);
		}
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
	dx: number = 0;
	dy: number = 0;
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