import { IDrawable } from "./core/IDrawable";
import { Controls, IPower } from "./core/IPower";
import { Body, Box2D } from "./Box2D";
import { Neighbor, NeighborsData, Particle, ParticleGroup, ParticleState, Spring, Vector } from "./Particle";

const {
	Sticky,
	Elastic,
	Fluid,
} = ParticleState;

export class Jello implements IDrawable, IPower {
	ptCount: number;								//Количество частиц

	particles: Particle[];


	spring_list: Spring;						//Связный список активных связей

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

	active_group: ParticleGroup;			//Активный кусок желе

	treshold: number;			//Минимальная прозрачность воды

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

		this.spring_list = {
			i: -1,
			j: -1,
			next: null,
			unit_direction_to_j: Vector.zero,
			current_length: -1,
			rest_length: -1
		};

		this.particles = particles.map<Particle>((body, i) => ({
			index: i,
			body,
			ij: new Set<Particle>(),
			spring_ij: new Map<number, Spring>(),
			pt_springs: 0,
			group: {
				state: {
					type: Sticky,
					jelloState: true,
					frozen: false,
				},
				particles: new Set<number>([i]),
			}
		}));
		this.ptCount = this.particles.length;
		this.active_group = this.particles[0].group;
	}

	createArrayOf<T>(factory: (index: number) => T, count: number) {
		return Array(count).fill(null).map((_, index) => factory(index));
	}

	applyPower(controls: Controls): void {
		const positions = this.getPositions();

		const neighborsData = this.getNeighborsData(positions);

		this.updateSpringsLengthsAndDirections(neighborsData, positions);
		this.updateSoftSpringsRestLength();

		const groupsToRecalc = new Set<ParticleGroup>();
		this.removeTooStretchedSoftSprings(groupsToRecalc);
		this.removeTooStretchedHardSprings(groupsToRecalc);
		this.addNewSprings(groupsToRecalc, neighborsData);

		if (groupsToRecalc.size > 0) {
			this.recalculateGroups(groupsToRecalc);
		}

		this.applyJelloPowers(neighborsData.neighbors);

		if (controls) {
			if (controls.spins) {
				this.applySpinningPower(positions);
			}

			if ((controls.left && !controls.right) || (controls.right && !controls.left)
			|| (controls.up && !controls.down) || (controls.down && !controls.up)) {
				this.applyPowerToActiveGroup(new Vector(
					controls.left ? -1 : (controls.right ? 1 : 0),
					controls.up ? -1 : (controls.down ? 1 : 0),
				).mul(0.1));
			}

			if (controls.turnJello && !controls.turnElastic && !controls.turnFluid) {
				this.active_group.state = {
					...this.active_group.state,
					type: Sticky
				};
			}

			if (!controls.turnJello && controls.turnElastic && !controls.turnFluid) {
				this.active_group.state = {
					...this.active_group.state,
					type: Elastic
				};
			}
		}

		this.applyVelocityChanges(neighborsData.neighbors);
	}

	private recalculateGroups(groupsToRecalc: Set<ParticleGroup>) {
		const {
			particles,
			active_group,
		} = this;

		const links = this.getLinks(groupsToRecalc);

		const visited = new Set<number>();
		const activeGroupCandidates: ParticleGroup[] = [];

		if (groupsToRecalc.has(active_group)) {
			recalcGroup(active_group);
		}

		for (const group of groupsToRecalc) {
			if (group === active_group) {
				continue;
			}

			recalcGroup(group);
		}

		if (activeGroupCandidates.length > 0) {
			const activeGroupsBySize = activeGroupCandidates.sort((g1, g2) => g2.particles.size - g1.particles.size);
			this.active_group = activeGroupsBySize[0];
		}

		function recalcGroup(group: ParticleGroup) {
			for (const i of group.particles.values()) {
				if (visited.has(i)) {
					continue;
				}

				const particlesSet = new Set<number>();
				const newGroup: ParticleGroup = {
					particles: particlesSet,
					state: particles[i].group.state,
				};

				if (active_group === group) {
					activeGroupCandidates.push(newGroup);
				}

				const queue = [i];
				while (queue.length > 0) {
					const j = queue.pop()!;
					const particle = particles[j];
					particle.group = newGroup;
					particlesSet.add(j);
					visited.add(j);
					for (const f of links[j]) {
						if (!visited.has(f)) {
							queue.push(f);
						}
					}
				}
			}
		}
	}

	private getLinks(groupsToRecalc: Set<ParticleGroup>) {
		const {
			particles,
		} = this;

		const links = particles.map<number[]>(() => []);

		for (const group of groupsToRecalc) {
			for (const i of group.particles.values()) {
				for (const j of particles[i].spring_ij.keys()) {
					links[i].push(j);
					links[j].push(i);
				}
			}
		}

		return links;
	}

	private getSpringsPower() {
		const {
			particles,
			k_spring,
			spring_list,
		} = this;

		const springsPower = particles.map(() => Vector.zero);
		let spring = spring_list.next;

		while (spring) {
			const {
				i, j, rest_length, current_length,
			} = spring;
			const particle_i = particles[spring.i];

			const powerMagnitude = (particle_i.group.state.type === Elastic ? 1 : 2) * k_spring * (rest_length - current_length);
			const power = spring.unit_direction_to_j.mul(powerMagnitude);

			springsPower[j] = springsPower[j].add(power);
			springsPower[i] = springsPower[i].sub(power);

			spring = spring.next;
		}

		return springsPower;
	}

	private removeTooStretchedSoftSprings(groupsToRecalc: Set<ParticleGroup>): void {
		const {
			particles,
			r,
			spring_list,
		} = this;

		let spring = spring_list.next;
		let prev = spring_list;

		while (spring) {
			if (spring.rest_length > r) {
				const particle_i = particles[spring.i];
				const particle_j = particles[spring.j];
				particle_i.spring_ij.delete(spring.j);
				particle_i.pt_springs--;
				particle_j.pt_springs--;
				groupsToRecalc.add(particle_i.group);

				prev.next = spring.next;
				spring = prev.next;

				continue;
			}

			prev = spring;
			spring = spring.next;
		}
	}

	private removeTooStretchedHardSprings(groupsToRecalc: Set<ParticleGroup>): void {
		const {
			particles,
			r,
			spring_list,
		} = this;

		const strong_spring_particleCount = 5;
		const strong_spring_max_length = 4 * r;
		const weak_spring_max_length = 2 * r;

		let spring = spring_list.next;
		let prev = spring_list;

		while (spring) {
			const particle_i = particles[spring.i];
			const particle_j = particles[spring.j];
			const current_length = spring.current_length;

			if (particle_i.group.state.type === Elastic) {
				if ((current_length > strong_spring_max_length) || ((current_length > weak_spring_max_length) && ((particle_i.pt_springs < strong_spring_particleCount) || (particle_j.pt_springs < strong_spring_particleCount)))) {
					prev.next = spring.next;
					particle_i.spring_ij.delete(spring.j);
					spring = prev.next;
					particle_i.pt_springs--;
					particle_j.pt_springs--;
					groupsToRecalc.add(particle_i.group);
					continue;
				}
			}

			prev = spring;
			spring = spring.next;
		}
	}

	private addNewSprings(groupsToRecalc: Set<ParticleGroup>, neighborsData: NeighborsData): boolean {
		const {
			particles,
			ptCount,
			spring_list,
			max_springs,
		} = this;

		let needRecalcGroups = false;
		for (let i = 0; i < ptCount; i++) {
			const particle_i = particles[i];
			const neighbors_i = neighborsData.neighbors[i];
			const spring_ij_i = particle_i.spring_ij;
			const group_i = particle_i.group;

			let pt_springs_i = particle_i.pt_springs;
			let pt_state_i = particle_i.group.state;

			for (const neighbor of neighbors_i) {
				const {
					j, distance_between_particles, unit_direction,
				} = neighbor;

				const particle_j = particles[j];

				if (
					//(!pt_state_i.frozen && pt_state_i.jelloState && (activeGroup_i || (particle_j.group === active_group))) || //слипание двух активных кусков/слипание активного и неактивного
					((pt_state_i.type === Sticky) && (particle_j.group.state.type === Sticky))) { //слипание двух неактивных желе
					if (!spring_ij_i.has(j) && (pt_springs_i < max_springs) && (particle_j.pt_springs < max_springs)) {
						const spring: Spring = {
							i,
							j,
							next: spring_list.next,
							unit_direction_to_j: unit_direction,
							current_length: distance_between_particles,
							rest_length: distance_between_particles,
						};
						spring_ij_i.set(j, spring);
						spring_list.next = spring;
						pt_springs_i++;
						particle_j.pt_springs++;
						particle_j.group.state = {
							...particle_j.group.state,
							type: Sticky
						};
						pt_state_i = {
							...pt_state_i,
							type: Sticky
						};
						if (group_i !== particle_j.group) {
							groupsToRecalc.add(group_i);
							groupsToRecalc.add(particle_j.group);
						}
					}
				}
			}

			particle_i.pt_springs = pt_springs_i;
			particle_i.group.state = pt_state_i;
		}

		return needRecalcGroups;
	}

	private updateSpringsLengthsAndDirections(neighborsData: NeighborsData, positions: Vector[]) {
		const {
			spring_list,
		} = this;

		let spring = spring_list.next;
		while (spring) {
			const { i, j } = spring;

			const neighbor = neighborsData.neighbors_map[i].get(j);

			if (neighbor) {
				spring.current_length = neighbor.distance_between_particles;
				spring.unit_direction_to_j = neighbor.unit_direction;
			} else {
				const dv = positions[j].sub(positions[i]);
				const { length } = dv;
				spring.current_length = length;
				spring.unit_direction_to_j = dv.mul(1 / length);
			}

			spring = spring.next;
		}
	}

	private updateSoftSpringsRestLength() {
		const {
			particles,
			r_inv,
			compress_speed,
			compress_treshold,
			stretch_speed,
			stretch_treshold,
			spring_list,
		} = this;

		const stretch_speed_div_r = r_inv * stretch_speed;
		const compress_speed_div_r = r_inv * compress_speed;

		let spring = spring_list.next;
		while (spring) {
			const { i } = spring;

			if (particles[i].group.state.type === Sticky) {
				const spring_length = spring.rest_length;
				const distance_from_rest = spring.current_length - spring_length;
				const current_stretch_treshold = spring_length * stretch_treshold;
				if (distance_from_rest > current_stretch_treshold) {
					spring.rest_length += spring_length * stretch_speed_div_r * (distance_from_rest - current_stretch_treshold);
				} else {
					const current_compress_treshold = -spring_length * compress_treshold;
					if (distance_from_rest < current_compress_treshold) {
						spring.rest_length += spring_length * compress_speed_div_r * (distance_from_rest - current_compress_treshold);
					}
				}
			}

			spring = spring.next;
		}
	}
	
	private applyJelloPowers(neighbors: Neighbor[][]) {
		const {
			particles,
			ptCount,
			Box2D,
		} = this;

		const sphPower = this.getSPHPower(neighbors);
		const springsPower = this.getSpringsPower();
		
		for (let i = 0; i < ptCount; i++) {
			const power = springsPower[i].add(sphPower[i]);
			const body = particles[i].body;
			power.asB2D(Box2D, v => body.ApplyForceToCenter(v, true));
		}
	}

	private applySpinningPower(positions: Vector[]) {
		const {
			particles,
			Box2D,
			active_group,
		} = this;

		const activeGroupCenter = this.getActiveGroupCenter(positions);

		for (const particle of particles) {
			if (particle.group !== active_group) {
				continue;
			}
			
			const d = positions[particle.index]
				.sub(activeGroupCenter);

				new Vector(-d.y, d.x).mul(0.001)
				.asB2D(Box2D, v => {
					particle.body.ApplyForceToCenter(v, true);
				});
		}
	}
	
	private applyPowerToActiveGroup(power: Vector) {
		const {
			particles,
			Box2D,
			active_group,
		} = this;

		for (const particle of particles) {
			if (particle.group !== active_group) {
				continue;
			}
			
			power.asB2D(Box2D, v => {
				particle.body.ApplyForceToCenter(v, true);
			});
		}
	}

	private getActiveGroupCenter(positions: Vector[]) {
		const {
			particles,
			active_group,
		} = this;

		let activeGroupCenter = Vector.zero;
		let activeGroupPtCount = 0;
		for (const particle of particles) {
			if (particle.group !== active_group) {
				continue;
			}
			
			activeGroupCenter = activeGroupCenter.add(positions[particle.index]);
			activeGroupPtCount++;
		}

		activeGroupCenter = activeGroupCenter.mul(1 / activeGroupPtCount);
		return activeGroupCenter;
	}

	private getSPHPower(neighbors: Neighbor[][]) {
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

	private getPress(neighbors: Neighbor[][]) {
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

	private getRo(neighbors: Neighbor[][]) {
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

	private applyVelocityChanges(neighbors: Neighbor[][]) {
		const {
			particles,
			ptCount,
			Box2D,
			viscosity_a,
			viscosity_b,
		} = this;

		// TODO: do we really need clamping
		const max_collision_velocity = 100;

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
	
	private getNeighborsData(positions: Vector[]) {
		const {
			ptCount,
			particles,
			r,
			r_inv,
			r2,
		} = this;

		// TODO move to constructor
		const min_neighbor_distance = 0.01;
		const min_neighbor_distance_squared = min_neighbor_distance * min_neighbor_distance;

		const neighbors: NeighborsData = {
			neighbors: particles.map(() => []),
			neighbors_map: particles.map(() => new Map())
		};

		const pp = positions.map((p, index) => ({ p, index })).slice().sort((a, b) => a.p.x - b.p.x);

		for (let a = 0; a < ptCount; a++) {
			const pp_a = pp[a];
			const { x: x_a, y: y_a } = pp_a.p;
			const index_a = pp_a.index;
			const x_up_a = x_a + r;
			const y_low_a = y_a - r;
			const y_up_a = y_a + r;

			for (let b = a + 1; b < ptCount; b++) {
				const pp_b = pp[b];
				const { x: x_b, y: y_b } = pp_b.p;

				if (x_b > x_up_a) {
					break;
				}

				if (y_b < y_low_a || y_b > y_up_a) {
					continue;
				}

				const index_b = pp_b.index;
				const i = index_a < index_b ? index_a : index_b;
				const j = index_a < index_b ? index_b : index_a;
				
				const position_i = positions[i];
				const position_j = positions[j];
				
				const neighbors_i = neighbors.neighbors[i];
				const indices_i = neighbors.neighbors_map[i];

				const direction_to_j = position_j.sub(position_i);

				const distance_between_particles_squared = direction_to_j.length2;
				if (distance_between_particles_squared > r2 || distance_between_particles_squared < min_neighbor_distance_squared) {
					continue;
				}

				const distance_between_particles = Math.sqrt(distance_between_particles_squared);
				const unit_direction_to_j = direction_to_j.mul(1 / distance_between_particles);
				const q1 = 1 - distance_between_particles * r_inv;

				const neighbor = {
					j,
					distance_between_particles,
					unit_direction: unit_direction_to_j,
					q1,
					q2: q1 * q1,
				};
				
				neighbors_i.push(neighbor);
				indices_i.set(j, neighbor);
			}
		}
		
		return neighbors;
	}

	private getPositions() {
		return this.particles.map(particle => Vector.fromB2D(particle.body.GetPosition()));
	}

	draw(ctx: CanvasRenderingContext2D): void {
		const {
			particles,
			active_group,
			spring_list
		} = this;

		let spring = spring_list.next;
		while (spring) {
			ctx.beginPath();
			ctx.strokeStyle = (particles[spring.i].group === active_group) || (particles[spring.j].group === active_group) ? 'black' : 'lightgrey';
			const p1 = particles[spring.i].body.GetPosition();
			const p2 = particles[spring.j].body.GetPosition();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();
			spring = spring.next;
		}

		for (const particle of particles) {
			const p = particle.body.GetPosition();
			ctx.strokeStyle = (particle.group === active_group) ? 'red' : 'black';
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

let cntr = 0;
