import { IDrawable } from "./core/IDrawable";
import { IPower } from "./core/IPower";
import { Body, Box2D } from "./Box2D";
import { Neighbors, Particle, ParticleState, Vector } from "./Particle";

const {
	Sticky,
	Elastic,
	Fluid,
} = ParticleState;

export class Jello implements IDrawable, IPower {
	ptCount: number;								//Количество частиц

	particles: Particle[];


	spring_list: Spring;						//Связный список активных связей

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

		this.spring_list = new Spring(null, -1, -1, Vector.zero, -1, -1);
		
		this.offsetX = 0;
		this.offsetY = 0;

		//canvas.stage.addEventListener(KeyboardEvent.KEY_DOWN,keyDown);
		//particles.addEventListener(ParticleGroupEvent.CHANGED,particlesChanged);
		//particles.addEventListener(ParticleGroupEvent.KILLED,particlesKilled);


		this.particles = particles.map<Particle>((body, i) => ({
			index: i,
			body,
			ij: new Set<Particle>(),
			spring_ij: new Map<number, Spring>(),
			pt_springs: 0,
			pt_state: Sticky,
			velocity: Vector.zero,
			delta_velocity: Vector.zero,
			activeGroup: false,
			groupqueue: 0,
		}));
		this.ptCount = this.particles.length;
		this.activeParticles = this.particles;
		if (this.ptCount > 0) {
			this.particles[0].activeGroup = true;
		}
	}

	createArrayOf<T>(factory: (index: number) => T, count: number) {
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
			compress_speed,
			compress_treshold,
			stretch_speed,
			stretch_treshold,
			k_spring,
			spring_list,
			max_springs,
			frozen,
			jelloState,
		} = this;


		const positions = this.getPositions();

		const neighbors = this.getNeighbors(positions);

		let activeChanged = false;
		let spring: Spring | null = null;
		for (let i = 0; i < ptCount; i++) {
			const particle_i = particles[i];
			const neighbors_i = neighbors[i];
			const spring_ij_i = particle_i.spring_ij;
			const activeGroup_i = particle_i.activeGroup;

			let pt_springs_i = particle_i.pt_springs;
			let pt_state_i = particle_i.pt_state;

			for (const neighbor of neighbors_i) {
				const {
					j,
					distance_between_particles,
					unit_direction,
				} = neighbor;

				const particle_j = particles[j];

				let spring: Spring | null | undefined = null;

				if ((!frozen && jelloState && (activeGroup_i || particle_j.activeGroup)) ||		//слипание двух активных кусков/слипание активного и неактивного
					((pt_state_i === Sticky) && (particle_j.pt_state === Sticky))) {			//слипание двух неактивных желе
					spring = spring_ij_i.get(j);
					if (!spring && (pt_springs_i < max_springs) && (particle_j.pt_springs < max_springs)) {
						spring = new Spring(spring_list.next, i, j, unit_direction, distance_between_particles, distance_between_particles);
						spring_ij_i.set(j, spring);
						spring_list.next = spring;
						pt_springs_i++;
						particle_j.pt_springs++;
						particle_j.pt_state = Sticky;
						pt_state_i = Sticky;
						if (activeGroup_i) {
							if (!particle_j.activeGroup) {
								activeChanged = true;
							}
						} else if (particle_j.activeGroup) {
							activeChanged = true;
						}
					}
				}


				if (spring) {
					spring.current_length = distance_between_particles;
					if (pt_state_i === Sticky) {
						const spring_length = spring.rest_length;
						const distance_from_rest = distance_between_particles - spring_length;
						const current_stretch_treshold = spring_length * stretch_treshold;
						if (distance_from_rest > current_stretch_treshold) {
							spring.rest_length += spring_length * r_inv * stretch_speed * (distance_from_rest - current_stretch_treshold);
						} else {
							const current_compress_treshold = -spring_length * compress_treshold;
							if (distance_from_rest < current_compress_treshold) {
								spring.rest_length += spring_length * r_inv * compress_speed * (distance_from_rest - current_compress_treshold);
							}
						}
					}
				}

				if (spring) {
					spring.unit_direction_to_j = unit_direction;
				}
			}

			particle_i.pt_springs = pt_springs_i;
			particle_i.pt_state = pt_state_i;
		}

		const springsPower = particles.map(() => Vector.zero);

		spring = spring_list.next;
		let prev = spring_list;
		while (spring) {
			const particle_i = particles[spring.i];
			const particle_j = particles[spring.j];
			let s1 = spring.rest_length;
			if (s1 > r) {
				prev.next = spring.next;
				particle_i.spring_ij.delete(spring.j);
				spring = prev.next;
				particle_i.pt_springs--;
				particle_j.pt_springs--;
				activeChanged ||= particle_i.activeGroup || particle_j.activeGroup;
				continue;
			} else {
				let d = spring.current_length;
				let dv: Vector;
				if (d < 0) {
					dv = positions[particle_j.index].sub(positions[particle_i.index]);
					d = dv.length;
					if (d > 0.01) {
						dv = dv.mul(1 / d);
					}
					if (particle_i.pt_state === Elastic) {
						if ((d > 4 * r) || ((d > 2 * r) && ((particle_i.pt_springs < 5) || (particle_j.pt_springs < 5)))) {
							prev.next = spring.next;
							particle_i.spring_ij.delete(spring.j);
							spring = prev.next;
							particle_i.pt_springs--;
							particle_j.pt_springs--;
							activeChanged ||= particle_i.activeGroup || particle_j.activeGroup;
							continue;
						}
					} else {
						const s2 = s1 * stretch_treshold;
						const s3 = d - s1;
						if (s3 > s2) {
							spring.rest_length += s1 * r_inv * stretch_speed * (s3 - s2);
						}
						s1 = spring.rest_length;
						if (s1 > r) {
							prev.next = spring.next;
							particle_i.spring_ij.delete(spring.j);
							spring = prev.next;
							particle_i.pt_springs--;
							particle_j.pt_springs--;
							activeChanged ||= particle_i.activeGroup || particle_j.activeGroup;
							continue;
						}
					}
				} else {
					dv = spring.unit_direction_to_j;
					spring.current_length = -1;
				}
				if (d > 0.01) {
					let q1: number;
					if (particle_i.pt_state === Elastic) {
						q1 = k_spring * (s1 - d);// *(1-s1*rinv)
					} else {
						q1 = 2 * k_spring * (s1 - d);
					}
					dv = dv.mul(q1);
					springsPower[particle_j.index] = springsPower[particle_j.index].add(dv);
					springsPower[particle_i.index] = springsPower[particle_i.index].sub(dv);
				}
			}
			prev = spring;
			spring = spring.next;
		}

		if (activeChanged) {
			if (jelloState) {
				const groups: number[][] = [];
				const groupid = particles.map(() => 0);
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
										if (particles[i].spring_ij.has(m)) {
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
											if (particles[m].spring_ij.has(i)) {
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

		this.applyPowers(neighbors, springsPower);

		this.applyVelocityChanges(neighbors);

	}

	private applyPowers(neighbors: Neighbors[], springsPower: Vector[]) {
		const {
			particles,
			ptCount,
			Box2D,
		} = this;

		const sphPower = this.getSPHPower(neighbors);

		for (let i = 0; i < ptCount; i++) {
			const dv = springsPower[i].add(sphPower[i]);
			const d = dv.length;
			const body = particles[i].body;
			const p = (d > 2) ? dv.mul(2 / d) : ((d > 0.09) ? dv : null);

			if (p) {
				p.asB2D(Box2D, v => body.ApplyForceToCenter(v, true));
			}
		}
		
		/*	
		for (const particle of particles) {
			new Vector(0, -0.06 * (Math.sin(cntr / 50)))
				.asB2D(Box2D, v => {
					particle.body.ApplyForceToCenter(v, true);
				});
		}
		cntr++;
		*/
	}

	private getSPHPower(neighbors: Neighbors[]) {
		const {
			particles,
			ptCount,
		} = this;

		const { press, press_near } = this.getPress(neighbors);

		const result = particles.map(() => Vector.zero);

		for (let i = 0; i < ptCount; i++) {
			const press_i = press[i];
			const press_near_i = press_near[i];
			const neighbors_i = neighbors[i];

			let delta_power_i = Vector.zero;

			for (const neighbor of neighbors_i) {
				const j = neighbor.j;
				const unit_direction = neighbor.unit_direction;
				const press_j = press[j];
				const press_near_j = press_near[j];

				const dn = (press_i + press_j) * neighbor.q1 +
					(press_near_i + press_near_j) * neighbor.q2;

				const delta_power_ij = unit_direction.mul(dn);

				delta_power_i = delta_power_i.add(delta_power_ij);
				result[j] = result[j].add(delta_power_ij);
			}

			result[i] = result[i].sub(delta_power_i);
		}

		return result;
	}

	private getPress(neighbors: Neighbors[]) {
		const {
			k,
			k_near,
			rest_density,
		} = this;

		const { ro, ro_near } = this.getRo(neighbors);

		const press = ro.map(ro_i => k * (ro_i - rest_density));
		const press_near = ro_near.map(ro_near_i => k_near * ro_near_i);

		return {
			press,
			press_near,
		};
	}

	private getRo(neighbors: Neighbors[]) {
		const {
			particles,
			ptCount,
		} = this;

		const ro = particles.map(() => 0);
		const ro_near = particles.map(() => 0);

		for (let i = 0; i < ptCount; i++) {
			const neighbors_i = neighbors[i];

			let delta_ro_i = 0;
			let delta_ro_near_i = 0;

			for (const neighbor of neighbors_i) {
				const {
					j, q1, q2
				} = neighbor;

				const ro_ij = q2;
				delta_ro_i += ro_ij;
				ro[j] += ro_ij;

				const ro_near_ij = q2 * q1;
				delta_ro_near_i += ro_near_ij;
				ro_near[j] += ro_near_ij;
			}

			ro[i] += delta_ro_i;
			ro_near[i] += delta_ro_near_i;
		}

		return {
			ro,
			ro_near,
		};
	}

	private applyVelocityChanges(neighbors: Neighbors[]) {
		const {
			particles,
			ptCount,
			Box2D,
			viscosity_a,
			viscosity_b,
		} = this;

		const velocities = this.getVelocities();
		const delta_velocities = particles.map(() => Vector.zero);

		// calculate velocity changes
		for (let i = 0; i < ptCount; i++) {
			const velocity_i = velocities[i];
			const neighbors_i = neighbors[i];

			let delta_velocity_i = Vector.zero;

			for (const neighbor of neighbors_i) {
				const {
					j, unit_direction, q1
				} = neighbor;

				const collision_velocity = velocity_i.sub(velocities[j]).dot(unit_direction);
				if (collision_velocity > 0) {
					// TODO: do we really need clamping
					const max_collision_velocity = 100;
					const collision_velocity_clamped = (collision_velocity > max_collision_velocity) ? max_collision_velocity : collision_velocity;
					const delta_velocity_ij = unit_direction
						.mul(q1 * (viscosity_a + viscosity_b * collision_velocity_clamped) * collision_velocity_clamped);

					delta_velocity_i = delta_velocity_i.sub(delta_velocity_ij);
					delta_velocities[j] = delta_velocities[j].add(delta_velocity_ij);
				}
			}

			delta_velocities[i] = delta_velocities[i].add(delta_velocity_i);
		}

		for (let i = 0; i < ptCount; i++) {
			velocities[i]
				.add(delta_velocities[i])
				.asB2D(Box2D, v => particles[i].body.SetLinearVelocity(v));
		}
	}

	private getVelocities() {
		return this.particles.map(particle => Vector.fromB2D(particle.body.GetLinearVelocity()));
	}

	private getNeighbors(positions: Vector[]) {
		const {
			particles,
			r,
			r_inv,
			r2,
		} = this;

		// TODO move to constructor
		const min_neighbor_distance = 0.01;
		const min_neighbor_distance_squared = min_neighbor_distance * min_neighbor_distance;

		const rows = this.getRows(positions);

		const neighbors: Neighbors[] = particles.map(() => []);

		const visited = particles.map(() => new Set<number>());

		rows.forEach(row => row.forEach(cell => {
			const cl = cell.length;
			for (let ci = 1; ci < cl; ci++) {
				const i = cell[ci];
				const position_i = positions[i];

				const visited_i = visited[i];
				const neighbors_i = neighbors[i];

				for (let cj = 0; cj < ci; cj++) {
					const j = cell[cj];
					if (visited_i.has(j)) {
						continue;
					}

					visited_i.add(j);

					const position_j = positions[j];
					const dx = position_j.x - position_i.x;
					if (dx > r || dx < -r) {
						continue;
					}

					const dy = position_j.y - position_i.y;
					if (dy > r || dy < -r) {
						continue;
					}

					const direction_to_j = new Vector(dx, dy);

					const distance_between_particles_squared = direction_to_j.length2;
					if (distance_between_particles_squared > r2 || distance_between_particles_squared < min_neighbor_distance_squared) {
						continue;
					}

					const distance_between_particles = Math.sqrt(distance_between_particles_squared);
					const unit_direction_to_j = direction_to_j.mul(1 / distance_between_particles);
					const q1 = 1 - distance_between_particles * r_inv;

					neighbors_i.push({
						j,
						distance_between_particles,
						unit_direction: unit_direction_to_j,
						q1,
						q2: q1 * q1,
					});
				}
			}
		}));

		return neighbors;
	}

	private getRows(positions: Vector[]) {
		const {
			ptCount,
			r_inv_half
		} = this;

		const rows = new Map<number, Map<number, number[]>>();

		for (let i = 0; i < ptCount; i++) {
			const pf = positions[i].mul(r_inv_half);

			const s1 = Math.floor(pf.x);
			const q1 = Math.floor(pf.y);

			const addToRow = function (q: number) {
				let row = rows.get(q);
				if (!row) {
					row = new Map<number, number[]>();
					rows.set(q, row);
				}

				addToCell(s1);
				addToCell(s1 + 1);
				addToCell(s1 + 2);

				function addToCell(s: number) {
					let cell = row!.get(s);
					if (!cell) {
						cell = [];
						row!.set(s, cell);
					}

					cell.push(i);
				}
			};

			addToRow(q1);
			addToRow(q1 + 1);
			addToRow(q1 + 2);
		}

		return rows;
	}

	private getPositions() {
		return this.particles.map(particle => Vector.fromB2D(particle.body.GetPosition()));
	}

	draw(ctx: CanvasRenderingContext2D): void {
		const particles = this.particles;
		let spring = this.spring_list.next;
		while (spring) {
			ctx.beginPath();
			const p1 = particles[spring.i].body.GetPosition();
			const p2 = particles[spring.j].body.GetPosition();
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
	constructor(
		public next: Spring | null,
		public readonly i: number,
		public readonly j: number,
		public unit_direction_to_j: Vector,
		public rest_length: number,
		public current_length: number
	) {
	}
}

let cntr = 0;
