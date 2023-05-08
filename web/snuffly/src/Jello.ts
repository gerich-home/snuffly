import { IDrawable } from "./core/IDrawable";
import { IPower } from "./core/IPower";
import { AABB, Body, BodyDef, Box2D, CircleShape, World, Vec2 } from "./Box2D";

export class Jello implements IDrawable, IPower {
	pt: Body[];						//Частицы желе
	ptCount: number;								//Количество частиц

	ij: number[][];					//Просмотрена ли пара соседей ij(0-не просмотрена, 1-они соседи, -1-не соседи)?
	spring_ij: (null | Spring)[][];		//Связь между частицами i и j(null, если её нет)

	//Соседи i-ой частицы 
	ns: number[][];					//Индексы соседей частицы
	nsq1: number[][];			//q1
	nsq2: number[][];			//q2      - для SPH модели
	nsdx: number[][];			//вектор между точками частицами i и j
	nsdy: number[][];

	//Параметры каждой частицы
	ro: number[];						//Дальняя плотность
	ro_near: number[];					//Ближняя плотность
	press: number[];					//Дальнее давление
	press_near: number[];				//Ближнее давление
	powerx: number[];					//Суммарные силы от связей и давления
	powery: number[];
	px: number[];						//Координаты
	py: number[];
	vx: number[];						//Скорость
	vy: number[];
	pt_springs: number[];					//Число связей у частицы
	pt_state: number[];					//Состояние частицы(0-липкая, 1-упругая, 2-жидкая)

	groupqueue: number[];					//Очередь для выделения компоненты связности

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

	activeParticles: Body[];			//Активный кусок желе
	activeGroup: boolean[];				//Входит ли i-ая точка в активный кусок желе?
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


		this.pt = particles;
		this.ptCount = this.pt.length;
		this.ij = this.createArrayOf(() => []);
		this.spring_ij = this.createArrayOf(() => []);
		this.ns = this.createArrayOf(() => []);
		this.nsq1 = this.createArrayOf(() => []);
		this.nsq2 = this.createArrayOf(() => []);
		this.nsdx = this.createArrayOf(() => []);
		this.nsdy = this.createArrayOf(() => []);
		this.ro = this.createArrayOf(() => 0);
		this.ro_near = this.createArrayOf(() => 0);
		this.press = this.createArrayOf(() => 0);
		this.press_near = this.createArrayOf(() => 0);
		this.powerx = this.createArrayOf(() => 0);
		this.powery = this.createArrayOf(() => 0);
		this.px = this.createArrayOf(() => 0);
		this.py = this.createArrayOf(() => 0);
		this.vx = this.createArrayOf(() => 0);
		this.vy = this.createArrayOf(() => 0);
		this.pt_springs = this.createArrayOf(() => 0);
		this.pt_state = this.createArrayOf(() => 0);
		this.groupqueue = this.createArrayOf(() => 0);
		this.activeParticles = particles;
		this.activeGroup = this.createArrayOf(() => false);
		if (this.ptCount > 0) {
			this.activeParticles[0] = this.pt[0];
			this.activeGroup[0] = true;
		}
		for (let i = 0; i < this.ptCount; i++) {
			const spring_iji = this.createArrayOf(() => null, i);
			this.spring_ij[i] = spring_iji;
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
			const p = this.pt[i];
			const vec1 = p.GetPosition();
			const p_x = vec1.x;
			const p_y = vec1.y;
			const pxf = p_x * this.rinvhalf;
			const pyf = p_y * this.rinvhalf;

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

			this.ns[i] = [];
			this.nsq1[i] = [];
			this.nsq2[i] = [];
			this.nsdx[i] = [];
			this.nsdy[i] = [];

			this.ro[i] = 0;
			this.ro_near[i] = 0;
			this.powerx[i] = 0;
			this.powery[i] = 0;
			this.px[i] = p_x;
			this.py[i] = p_y;
			const vec2 = p.GetLinearVelocity();
			this.vx[i] = vec2.x;
			this.vy[i] = vec2.y;

			this.ij[i] = this.createArrayOf(() => 0, i);
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
					const iji = this.ij[i];
					let s4 = this.ro[i];
					let s5 = this.ro_near[i];
					const ndx = this.nsdx[i];
					const ndy = this.nsdy[i];
					const nq1 = this.nsq1[i];
					const nq2 = this.nsq2[i];
					const n = this.ns[i];
					const p_x = this.px[i];
					const p_y = this.py[i];
					let v_x = this.vx[i];
					let v_y = this.vy[i];
					const spring_iji = this.spring_ij[i];
					const activei = this.activeGroup[i];
					let z = this.pt_springs[i];
					let pt_statei = this.pt_state[i];

					for (let cj = 0; cj < ci; cj++) {
						const j = c[cj];
						if (iji[j] === 0) {
							let dx = this.px[j] - p_x;
							let qd = dx * dx;
							if (qd < this.rsq) {
								let dy = this.py[j] - p_y;
								qd += dy * dy;
								if (qd < this.rsq) {
									let spring: Spring | null = null;

									const activej = this.activeGroup[j];
									const d = sqrt(qd);
									if (((!this.frozen) && (this.jelloState) && (activei || activej)) ||		//слипание двух активных кусков/слипание активного и неактивного
										((pt_statei === 0) && (this.pt_state[j] === 0))) {					//слипание двух неактивных желе
										if (spring_iji[j]) {
											spring = spring_iji[j];
										} else if (z < this.max_springs) {
											if (this.pt_springs[j] < this.max_springs) {
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
													this.pt_springs[j]++;
													this.pt_state[j] = 0;
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
										this.ro[j] += q2;
										this.ro_near[j] += q3;
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

										const s3 = (v_x - this.vx[j]) * dx + (v_y - this.vy[j]) * dy;
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
											this.vx[j] += dx;
											this.vy[j] += dy;
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
					this.ro[i] = s4;
					this.ro_near[i] = s5;
					this.pt_springs[i] = z;
					this.vx[i] = v_x;
					this.vy[i] = v_y;
					this.pt_state[i] = pt_statei;
				}
			}
		}

		spring = this.spring_list.next;
		let prev = this.spring_list;
		while (spring) {
			const i = spring.i;
			const j = spring.j;
			const pt_statei = this.pt_state[i];
			let s1 = spring.l;
			if (s1 > this.r) {
				prev.next = spring.next;
				this.spring_ij[i][j] = null;
				spring.next = this.spring_pool.next;
				this.spring_pool.next = spring;
				spring = prev.next;
				this.pt_springs[i]--;
				this.pt_springs[j]--;
				this.activeChanged ||= this.activeGroup[i] || this.activeGroup[j];
				continue;
			} else {
				let d = spring.d;
				let dx: number;
				let dy: number;
				if (d < 0) {
					dx = this.px[j] - this.px[i];
					dy = this.py[j] - this.py[i];
					d = sqrt(dx * dx + dy * dy);
					if (d > 0.01) {
						const q1 = 1 / d;
						dx *= q1;
						dy *= q1;
					}
					if (pt_statei === 1) {
						if ((d > 4 * this.r) || ((d > 2 * this.r) && ((this.pt_springs[i] < 5) || (this.pt_springs[j] < 5)))) {
							prev.next = spring.next;
							this.spring_ij[i][j] = null;
							spring.next = this.spring_pool.next;
							this.spring_pool.next = spring;
							spring = prev.next;
							this.pt_springs[i]--;
							this.pt_springs[j]--;
							this.activeChanged ||= this.activeGroup[i] || this.activeGroup[j];
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
							this.spring_ij[i][j] = null;
							spring.next = this.spring_pool.next;
							this.spring_pool.next = spring;
							spring = prev.next;
							this.pt_springs[i]--;
							this.pt_springs[j]--;
							this.activeChanged ||= this.activeGroup[i] || this.activeGroup[j];
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
					this.powerx[j] += dx;
					this.powery[j] += dy;
					this.powerx[i] -= dx;
					this.powery[i] -= dy;
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
					if (s < this.ptCount) {
						if (groupid[j] === 0) {
							if (this.activeGroup[j]) {
								const group: number[] = [];
								let grouphead = 1;
								let groupend = 0;
								this.groupqueue[0] = j;
								groupid[j] = g;
								group.push(j);
								while (groupend < grouphead) {
									const i = this.groupqueue[groupend];
									groupend++;
									const spring_iji = this.spring_ij[i];

									for (let m = 0; m < i; m++) {
										if (spring_iji[m]) {
											if (groupid[m] === 0) {
												groupid[m] = g;
												group.push(m);
												this.groupqueue[grouphead] = m;
												grouphead++;
											}
										}
									}
									for (let m = i + 1; m < this.ptCount; m++) {
										if (groupid[m] === 0) {
											if (this.spring_ij[m][i]) {
												groupid[m] = g;
												group.push(m);
												this.groupqueue[grouphead] = m;
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
					this.activeGroup[j] = false;
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

				this.activeParticles = this.createArrayOf<Body>(i => this.pt[group[i]], ml);

				for (let i = 0; i < ml; i++) {
					const s = group[i];
					this.activeGroup[s] = true;
				}
			} else {
				this.activeParticles = this.pt;
			}
		}

		for (let i = 0; i < this.ptCount; i++) {
			this.press[i] = this.k * (this.ro[i] - this.rest_density);
			this.press_near[i] = this.k_near * this.ro_near[i];
		}

		for (let i = 0; i < this.ptCount; i++) {
			let dx = 0;
			let dy = 0;

			const n = this.ns[i];
			const nq1 = this.nsq1[i];
			const nq2 = this.nsq2[i];
			const ndx = this.nsdx[i];
			const ndy = this.nsdy[i];
			const s1 = this.press[i];
			const s2 = this.press_near[i];
			const l = n.length;
			for (let j = 0; j < l; j++) {
				const z = n[j];

				const dn = (s1 + this.press[z]) * nq1[j] + (s2 + this.press_near[z]) * nq2[j];

				let q1 = ndx[j] * dn;
				dx += q1;
				this.powerx[z] += q1;
				q1 = ndy[j] * dn;
				dy += q1;
				this.powery[z] += q1;
			}
			this.powerx[i] -= dx;
			this.powery[i] -= dy;
		}

		for (let i = 0; i < this.ptCount; i++) {
			const p = this.pt[i];
			const dx = this.powerx[i];
			const dy = this.powery[i];
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

			const v = new this.Box2D.b2Vec2(this.vx[i], this.vy[i]);
			p.SetLinearVelocity(v);
			this.Box2D.destroy(v);
		}
	}

	draw(ctx: CanvasRenderingContext2D): void {
		let spring = this.spring_list.next;
		while (spring) {
			ctx.beginPath();
			const p1 = this.pt[spring.i].GetPosition();
			const p2 = this.pt[spring.j].GetPosition();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();
			spring = spring.next;
		}

		for (let i = 1; i < this.pt.length; i++) {
			const p = this.pt[i].GetPosition();
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
		// 	p = this.pt[i];
		// 	pnt.x = this.px[i] - this.imageRadius + this.offsetX;
		// 	pnt.y = this.py[i] - this.imageRadius + this.offsetY;
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