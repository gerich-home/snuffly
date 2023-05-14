import { IDrawable } from "./core/IDrawable";
import { IPower } from "./core/IPower";
import { Body, Box2D } from "./Box2D";
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
	r2: number;			//Квадрат радиуса
	r_inv: number;			//Обратный радиус
	r_inv_half: number;		//Половина обратного радиуса

	max_springs: number;			//Максимальное число связей для вершины
	k_spring: number;			//Сила пластичных связей
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
		this.r2 = this.r * this.r;
		this.r_inv = 1 / this.r;
		this.r_inv_half = 0.5 * this.r_inv;
		this.activeChanged = false;

		this.jelloState = true;
		this.frozen = false;

		this.max_springs = max_springs;
		this.k_spring = kspring;

		this.stretch_speed = stretch_speed;
		this.stretch_treshold = stretch_treshold;

		this.compress_speed = compress_speed;
		this.compress_treshold = compress_treshold;

		this.viscosity_a = viscosity_a;
		this.viscosity_b = viscosity_b;

		this.k = k;
		this.k_near = k_near;
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
			ij: {},
			neighbors: [],
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
			delta_v: Vector.zero,
			activeGroup: false,
			groupqueue: 0,
		}));
		this.ptCount = this.particles.length;
		this.activeParticles = this.particles;
		if (this.ptCount > 0) {
			this.particles[0].activeGroup = true;
		}

		const stringPoolSize = max_springs * this.ptCount * 0.5;
		for (let i = 0; i < stringPoolSize; i++) {
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
		const {
			particles,
			ptCount,
			r,
			r_inv,
			r_inv_half,
			r2,
			Box2D,
			compress_speed,
			compress_treshold,
			stretch_speed,
			stretch_treshold,
			k,
			k_near,
			k_spring,
			rest_density,
			viscosity_a,
			viscosity_b,
			spring_list,
			spring_pool,
			max_springs,
			frozen,
			jelloState,
		} = this;
		const sector_y = new Map<number, Map<number, number[]>>();

		for (let i = 0; i < ptCount; i++) {
			const particle = particles[i];
			const vec1 = Vector.fromB2D(particle.body.GetPosition());

			const pf = vec1.mul(r_inv_half);

			const s1 = Math.floor(pf.x);
			const s2 = s1 + 1;
			const q1 = Math.floor(pf.y);
			const q2 = q1 + 1;

			let z1 = sector_y.get(q1);
			if (!z1) {
				z1 = new Map<number, number[]>();
				sector_y.set(q1, z1);
			}
			
			let w11 = z1.get(s1);
			if (!w11) {
				w11 = [];
				z1.set(s1, w11);
			}
			
			w11.push(i);
			
			let w12 = z1.get(s2);
			if (!w12) {
				w12 = [];
				z1.set(s2, w12);
			}
			
			w12.push(i);
			
			let z2 = sector_y.get(q2);
			if (!z2) {
				z2 = new Map<number, number[]>();
				sector_y.set(q2, z2);
			}
			
			let w21 = z2.get(s1);
			if (!w21) {
				w21 = [];
				z2.set(s1, w21);
			}
			
			w21.push(i);
			
			let w22 = z2.get(s2);
			if (!w22) {
				w22 = [];
				z2.set(s2, w22);
			}
			
			w22.push(i);

			particle.neighbors = [];

			particle.ro = 0;
			particle.ro_near = 0;
			particle.power = Vector.zero;
			particle.p = vec1;

			particle.v = Vector.fromB2D(particle.body.GetLinearVelocity());
			particle.delta_v = Vector.zero;

			particle.ij = {};
		}

		let activeChanged = false;

		let spring: Spring | null = null;
		sector_y.forEach(b =>
			b.forEach(c => {
				const cl = c.length;
				for (let ci = 1; ci < cl; ci++) {
					const i = c[ci];
					const particleI = particles[i];
					const v_i = particleI.v;
					const ij_i = particleI.ij;
					const p_i = particleI.p;
					const spring_ij_i = particleI.spring_ij;
					const activeGroup_i = particleI.activeGroup;
					const neighbors_i = particleI.neighbors;
					
					let delta_ro_i = 0;
					let delta_ro_near_i = 0;
					let delta_v_i = Vector.zero;
					let pt_springs_i = particleI.pt_springs;
					let pt_state_i = particleI.pt_state;

					for (let cj = 0; cj < ci; cj++) {
						const j = c[cj];
						const particleJ = particles[j];
						if (j in ij_i) {
							continue;
						}

						const dx = particleJ.p.x - p_i.x;
						if (dx > r || dx < -r) {
							ij_i[j] = -1;
							continue;
						}
						
						const dy = particleJ.p.y - p_i.y;
						if (dy > r || dy < -r) {
							ij_i[j] = -1;
							continue;
						}
						
						const dv = new Vector(dx, dy);
						let dv_length2 = dv.length2;
						if (dv_length2 > r2) {
							ij_i[j] = -1;
							continue;
						}

						let spring: Spring | null = null;

						const dv_length = Math.sqrt(dv_length2);
						if ((!frozen && jelloState && (activeGroup_i || particleJ.activeGroup)) ||		//слипание двух активных кусков/слипание активного и неактивного
							((pt_state_i === 0) && (particleJ.pt_state === 0))) {					//слипание двух неактивных желе
							spring = spring_ij_i[j];
							if (!spring && (pt_springs_i < max_springs) && (particleJ.pt_springs < max_springs)) {
								spring = spring_pool.next;
								if (spring) {
									spring_pool.next = spring.next;
									spring.next = spring_list.next;
									spring.i = i;
									spring.j = j;
									spring.l = dv_length;
									spring_ij_i[j] = spring;
									spring_list.next = spring;
									pt_springs_i++;
									particleJ.pt_springs++;
									particleJ.pt_state = 0;
									pt_state_i = 0;
									if (activeGroup_i) {
										if (!particleJ.activeGroup) {
											activeChanged = true;
										}
									} else if (particleJ.activeGroup) {
										activeChanged = true;
									}
								}
							}
						}


						if (spring) {
							spring.d = dv_length;
							if (pt_state_i === 0) {
								const q1 = spring.l;
								let q2 = q1 * stretch_treshold;
								let q3 = dv_length - q1;
								if (q3 > q2) {
									spring.l += q1 * r_inv * stretch_speed * (q3 - q2);
								} else {
									q2 = q1 * compress_treshold;
									q3 = dv_length - q1;
									if (q3 < -q2) {
										spring.l += q1 * r_inv * compress_speed * (q3 + q2);
									}
								}
							}
						}

						if (dv_length <= 0.01) {
							ij_i[j] = -1;
							continue;
						}

						const q1 = 1 - dv_length * r_inv;

						const ro_ij = q1 * q1;
						delta_ro_i += ro_ij;
						particleJ.ro += ro_ij;

						const ro_near_ij = ro_ij * q1;
						delta_ro_near_i += ro_near_ij;
						particleJ.ro_near += ro_near_ij;

						const unit_direction = dv.mul(1 / dv_length);
						if (spring) {											
							spring.unit_direction = unit_direction;
						}

						neighbors_i.push({
							particle: particleJ,
							q1,
							q2: ro_ij,
							unit_direction: unit_direction,
						});

						const s3 = v_i.sub(particleJ.v).dot(unit_direction);
						if (s3 > 0) {
							const s4 = (s3 > 100) ? 100 : s3
							const delta_v_ij = unit_direction
								.mul(q1 * (viscosity_a + viscosity_b * s4) * s4);
							delta_v_i = delta_v_i.sub(delta_v_ij);
							particleJ.delta_v = particleJ.delta_v.add(delta_v_ij);
						}
						ij_i[j] = 1;
					}
					
					particleI.ro += delta_ro_i;
					particleI.ro_near += delta_ro_near_i;
					particleI.delta_v = particleI.delta_v.add(delta_v_i);
					particleI.pt_springs = pt_springs_i;
					particleI.pt_state = pt_state_i;
				}
			})
		);

		spring = spring_list.next;
		let prev = spring_list;
		while (spring) {
			const i = spring.i;
			const j = spring.j;
			const particleI = particles[i];
			const particleJ = particles[j];
			let s1 = spring.l;
			if (s1 > r) {
				prev.next = spring.next;
				particleI.spring_ij[j] = null;
				spring.next = spring_pool.next;
				spring_pool.next = spring;
				spring = prev.next;
				particleI.pt_springs--;
				particleJ.pt_springs--;
				activeChanged ||= particleI.activeGroup || particleJ.activeGroup;
				continue;
			} else {
				let d = spring.d;
				let dv: Vector;
				if (d < 0) {
					dv = particleJ.p.sub(particleI.p);
					d = dv.length;
					if (d > 0.01) {
						dv = dv.mul(1 / d);
					}
					if (particleI.pt_state === 1) {
						if ((d > 4 * r) || ((d > 2 * r) && ((particleI.pt_springs < 5) || (particleJ.pt_springs < 5)))) {
							prev.next = spring.next;
							particleI.spring_ij[j] = null;
							spring.next = spring_pool.next;
							spring_pool.next = spring;
							spring = prev.next;
							particleI.pt_springs--;
							particleJ.pt_springs--;
							activeChanged ||= particleI.activeGroup || particleJ.activeGroup;
							continue;
						}
					} else {
						const s2 = s1 * stretch_treshold;
						const s3 = d - s1;
						if (s3 > s2) {
							spring.l += s1 * r_inv * stretch_speed * (s3 - s2);
						}
						s1 = spring.l;
						if (s1 > r) {
							prev.next = spring.next;
							particleI.spring_ij[j] = null;
							spring.next = spring_pool.next;
							spring_pool.next = spring;
							spring = prev.next;
							particleI.pt_springs--;
							particleJ.pt_springs--;
							activeChanged ||= particleI.activeGroup || particleJ.activeGroup;
							continue;
						}
					}
				} else {
					dv = spring.unit_direction;
					spring.d = -1;
				}
				if (d > 0.01) {
					let q1: number;
					if (particleI.pt_state === 1) {
						q1 = k_spring * (s1 - d);// *(1-s1*rinv)
					} else {
						q1 = 2 * k_spring * (s1 - d);
					}
					dv = dv.mul(q1);
					particleJ.power = particleJ.power.add(dv);
					particleI.power = particleI.power.sub(dv);
				}
			}
			prev = spring;
			spring = spring.next;
		}

		if (activeChanged) {
			if (jelloState) {
				const groups: number[][] = [];
				const groupid = this.createArrayOf(() => 0);
				let s = 0;
				for (let g = 1, j = 0; j < ptCount; j = g++) {
					const particleJ = particles[j];
					if (s < ptCount) {
						if (groupid[j] === 0) {
							if (particleJ.activeGroup) {
								const group: number[] = [];
								let grouphead = 1;
								let groupend = 0;
								particles[0].groupqueue = j;
								groupid[j] = g;
								group.push(j);
								while (groupend < grouphead) {
									const i = particles[groupend].groupqueue;
									groupend++;

									for (let m = 0; m < i; m++) {
										if (particles[i].spring_ij[m]) {
											if (groupid[m] === 0) {
												groupid[m] = g;
												group.push(m);
												particles[grouphead].groupqueue = m;
												grouphead++;
											}
										}
									}
									for (let m = i + 1; m < ptCount; m++) {
										if (groupid[m] === 0) {
											if (particles[m].spring_ij[i]) {
												groupid[m] = g;
												group.push(m);
												particles[grouphead].groupqueue = m;
												grouphead++;
											}
										}
									}
									if (grouphead === ptCount) {
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

				this.activeParticles = this.createArrayOf(i => particles[group[i]], ml);

				for (let i = 0; i < ml; i++) {
					const s = group[i];
					particles[s].activeGroup = true;
				}
			} else {
				this.activeParticles = particles;
			}
		}

		for (const particle of particles) {
			particle.press = k * (particle.ro - rest_density);
			particle.press_near = k_near * particle.ro_near;
		}

		for (const particle of particles) {
			let delta_power_i = Vector.zero;
			const press_i = particle.press;
			const press_near_i = particle.press_near;

			for (const neighbor of particle.neighbors) {
				const particleJ = neighbor.particle;
				const unit_direction = neighbor.unit_direction;
				const press_j = particleJ.press;
				const press_near_j = particleJ.press_near;

				const dn = (press_i + press_j) * neighbor.q1 +
					(press_near_i + press_near_j) * neighbor.q2;

				const delta_power_ij = unit_direction.mul(dn);

				delta_power_i = delta_power_i.add(delta_power_ij);
				particleJ.power = particleJ.power.add(delta_power_ij);
			}

			particle.power = particle.power.sub(delta_power_i);
		}

		for (const particle of particles) {
			const dv = particle.power;
			const d = dv.length;
			if (d > 2) {
				dv.mul(2 / d)
					.asB2D(Box2D, v => {
						particle.body.ApplyForceToCenter(v, true);
					});
			} else if (d > 0.09) {
				dv
					.asB2D(Box2D, v => {
						particle.body.ApplyForceToCenter(v, true);
					});
			}

			particle.v.add(particle.delta_v)
				.asB2D(Box2D, v => {
					particle.body.SetLinearVelocity(v);
				});

			/*new Vector(0, -0.06 * (Math.sin(cntr / 50)))
				.asB2D(Box2D, v => {
					particle.body.ApplyForceToCenter(v, true);
				});*/
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
	unit_direction: Vector = Vector.zero;
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
