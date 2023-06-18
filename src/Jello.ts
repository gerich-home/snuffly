import { IDrawable } from "./core/IDrawable";
import { Controls, IPower } from "./core/IPower";
import { Body, Box2D } from "./Box2D";
import { Neighbor, NeighborsData, Particle, ParticleGroup, ParticleState, Spring, Vector, add, asB2D, dot, fromB2D, len, len2, mul, sub, zero } from "./Particle";

const {
	Sticky,
	Elastic,
	Fluid,
} = ParticleState;

type JelloArgs = {
	readonly Box2D: Box2D;
	readonly particles: Body[];
	readonly r: number;                             // Радиус взаимодействия частиц
	readonly restDensity: number;                   // Нулевая плотность
	readonly k: number;                             // Сила дальнего давления
	readonly kNear: number;    	                    // Сила ближнего давления
	readonly kSpringStrong: number;                 // Сила эластичных связей
	readonly kSpringSoft: number;                   // Сила пластичных связей
	readonly softSpringStretchSpeed: number;        // Скорость растяжения связей
	readonly softSpringStretchTreshold: number;     // Порог для растяжения связей
	readonly softSpringCompressSpeed: number;       // Скорость сжатия связей
	readonly softSpringCompressTreshold: number;    // Порог для сжатия связей
	readonly viscosityA: number;                    // Параметр трения 1
	readonly viscosityB: number;                    // Параметр трения 2
	readonly maxParticleSpringsCount: number;       // Максимальное число связей для вершины

	readonly maxSoftSpringCurrentLength: number;
	readonly maxStrongSpringCurrentLength: number;
	readonly minNeighborDistance: number;
	readonly controlPower: number;
	readonly compressPower: number;
	readonly activeSpinningCompressPower: number;
	readonly spinPower: number;
	readonly maxCollisionVelocity: number;
};

export class Jello implements IDrawable, IPower {
	readonly Box2D: Box2D;
	readonly r: number;
	readonly restDensity: number;
	readonly k: number;
	readonly kNear: number;
	readonly kSpringStrong: number;
	readonly kSpringSoft: number;
	readonly softSpringStretchSpeed: number;
	readonly softSpringStretchTreshold: number;
	readonly softSpringCompressSpeed: number;
	readonly softSpringCompressTreshold: number;
	readonly viscosityA: number;
	readonly viscosityB: number;
	readonly maxParticleSpringsCount: number;


	readonly maxSoftSpringCurrentLength: number;
	readonly maxStrongSpringCurrentLength: number;
	readonly minNeighborDistanceSquared: number;
	readonly controlPower: number;
	readonly compressPower: number;
	readonly activeSpinningCompressPower: number;
	readonly spinPower: number;
	readonly maxCollisionVelocity: number;

	// Состояние
	activeGroup: ParticleGroup;         // Активный кусок желе

	readonly particlesCount: number;    // Количество частиц
	readonly particles: Particle[];
	readonly springList: Spring;        // Связный список активных связей

	// Просчитанные заранее данные
	readonly r2: number;			    // Квадрат радиуса
	readonly r_inv: number;			    // Обратный радиус
	readonly r_inv_half: number;		// Половина обратного радиуса

	readonly softSpringStretchSpeedDivR: number;
	readonly softSpringCompressSpeedDivR: number;


	// ========================================================== //
	constructor(
		args: JelloArgs
	) {
		this.Box2D = args.Box2D;
		this.r = args.r;
		this.restDensity = args.restDensity;
		this.k = args.k;
		this.kNear = args.kNear;
		this.kSpringStrong = args.kSpringStrong;
		this.kSpringSoft = args.kSpringSoft;
		this.softSpringStretchSpeed = args.softSpringStretchSpeed;
		this.softSpringStretchTreshold = args.softSpringStretchTreshold;
		this.softSpringCompressSpeed = args.softSpringCompressSpeed;
		this.softSpringCompressTreshold = args.softSpringCompressTreshold;
		this.viscosityA = args.viscosityA;
		this.viscosityB = args.viscosityB;
		this.maxParticleSpringsCount = args.maxParticleSpringsCount;
		this.maxSoftSpringCurrentLength = args.maxSoftSpringCurrentLength;
		this.maxStrongSpringCurrentLength = args.maxStrongSpringCurrentLength;
		this.controlPower = args.controlPower;
		this.compressPower = args.compressPower;
		this.spinPower = args.spinPower;
		this.maxCollisionVelocity = args.maxCollisionVelocity;
		this.activeSpinningCompressPower = args.activeSpinningCompressPower;

		const { r, minNeighborDistance, softSpringStretchSpeed, softSpringCompressSpeed } = args;

		this.minNeighborDistanceSquared = minNeighborDistance * minNeighborDistance;
		this.r2 = r * r;
		this.r_inv = 1 / r;
		this.r_inv_half = 0.5 / r;
		this.softSpringStretchSpeedDivR = softSpringStretchSpeed / r;
		this.softSpringCompressSpeedDivR = softSpringCompressSpeed / r;

		this.springList = {
			i: -1,
			j: -1,
			next: null,
			unit_direction_to_j: zero,
			current_length: -1,
			rest_length: -1
		};

		this.particles = args.particles.map<Particle>((body, i) => ({
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

		this.particlesCount = this.particles.length;

		this.activeGroup = this.particles[0].group;
	}

	applyForces(controls: Controls, dt: number): void {
		const {
			activeGroup,
		} = this;

		const positions = this.getPositions();

		const neighborsData = this.getNeighborsData(positions);

		this.updateSpringsLengthsAndDirections(neighborsData, positions);
		this.updateSoftSpringsRestLength(dt);

		const groupsToRecalc = new Set<ParticleGroup>();
		this.removeTooStretchedSoftSprings(groupsToRecalc);
		this.removeTooStretchedHardSprings(groupsToRecalc);
		this.addNewSprings(groupsToRecalc, neighborsData);

		if (groupsToRecalc.size > 0) {
			this.recalculateGroups(groupsToRecalc);
		}

		this.applyJelloPowers(neighborsData.neighbors);

		this.applyCompressionPowerToInactiveGroups(positions);

		if (controls.spins === 'none') {
			if (!controls.soft) {
				this.applyCompressPowerToGroup(activeGroup, positions, this.compressPower);
			}
		} else {
			this.applySpinningPowerToGroup(activeGroup, positions, controls.spins === 'left' ? 1 : -1);
			this.applyCompressPowerToGroup(activeGroup, positions, this.activeSpinningCompressPower);
		}

		if ((controls.left && !controls.right) || (controls.right && !controls.left)
			|| (controls.up && !controls.down) || (controls.down && !controls.up)) {
			const {
				controlPower,
			} = this;

			this.applyPowerToGroup(
				this.activeGroup,
				mul({
					x: (controls.left ? -1 : (controls.right ? 1 : 0)),
					y: controls.up ? -1 : (controls.down ? 1 : 0),
				}, controlPower)
			);
		}

		const { gravity } = controls;
		if ((gravity.x !== 0) || (gravity.y !== 0)) {
			this.applyPowerToAllParticles(gravity);
		}

		if (controls.turnJello && !controls.turnElastic && !controls.turnFluid && activeGroup.state.type !== Sticky) {
			activeGroup.state = {
				...activeGroup.state,
				type: Sticky
			};
		}

		if (!controls.turnJello && controls.turnElastic && !controls.turnFluid && activeGroup.state.type !== Elastic) {
			activeGroup.state = {
				...activeGroup.state,
				type: Elastic
			};
		}

		this.applyVelocityChanges(neighborsData.neighbors);
	}

	private recalculateGroups(groupsToRecalc: Set<ParticleGroup>) {
		const {
			particles,
			activeGroup,
		} = this;

		const links = this.getLinks(groupsToRecalc);

		const visited = new Set<number>();
		const activeGroupCandidates: ParticleGroup[] = [];

		if (groupsToRecalc.has(activeGroup)) {
			recalcGroup(activeGroup);
		}

		for (const group of groupsToRecalc) {
			if (group === activeGroup) {
				continue;
			}

			recalcGroup(group);
		}

		if (activeGroupCandidates.length > 0) {
			const activeGroupsBySize = activeGroupCandidates.sort((g1, g2) => g2.particles.size - g1.particles.size);
			this.activeGroup = activeGroupsBySize[0];
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

				if (activeGroup === group) {
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
			kSpringStrong,
			kSpringSoft,
			springList,
		} = this;

		const springsPower = particles.map(() => zero);
		let spring = springList.next;

		while (spring) {
			const {
				i, j, rest_length, current_length,
			} = spring;
			const particle_i = particles[spring.i];

			const powerMagnitude = (particle_i.group.state.type === Elastic ? kSpringStrong : kSpringSoft) * (rest_length - current_length);
			const power = mul(spring.unit_direction_to_j, powerMagnitude);

			springsPower[j] = add(springsPower[j], power);
			springsPower[i] = sub(springsPower[i], power);

			spring = spring.next;
		}

		return springsPower;
	}

	private removeTooStretchedSoftSprings(groupsToRecalc: Set<ParticleGroup>): void {
		const {
			particles,
			maxSoftSpringCurrentLength,
			springList,
		} = this;

		let spring = springList.next;
		let prev = springList;

		while (spring) {
			const particle_i = particles[spring.i];
			const particle_j = particles[spring.j];
			const current_length = spring.current_length;

			if (
				particle_i.group.state.type === Sticky &&
				current_length > maxSoftSpringCurrentLength
			) {
				prev.next = spring.next;
				particle_i.spring_ij.delete(spring.j);
				spring = prev.next;
				particle_i.pt_springs--;
				particle_j.pt_springs--;
				groupsToRecalc.add(particle_i.group);
				continue;
			}

			prev = spring;
			spring = spring.next;
		}
	}

	private removeTooStretchedHardSprings(groupsToRecalc: Set<ParticleGroup>): void {
		const {
			particles,
			maxStrongSpringCurrentLength,
			springList,
		} = this;

		let spring = springList.next;
		let prev = springList;

		while (spring) {
			const particle_i = particles[spring.i];
			const particle_j = particles[spring.j];
			const current_length = spring.current_length;

			if (
				particle_i.group.state.type === Elastic &&
				current_length > maxStrongSpringCurrentLength
			) {
				prev.next = spring.next;
				particle_i.spring_ij.delete(spring.j);
				spring = prev.next;
				particle_i.pt_springs--;
				particle_j.pt_springs--;
				groupsToRecalc.add(particle_i.group);
				continue;
			}

			prev = spring;
			spring = spring.next;
		}
	}

	private addNewSprings(groupsToRecalc: Set<ParticleGroup>, neighborsData: NeighborsData): boolean {
		const {
			particles,
			particlesCount,
			springList,
			maxParticleSpringsCount,
			activeGroup,
		} = this;

		let needRecalcGroups = false;
		for (let i = 0; i < particlesCount; i++) {
			const particle_i = particles[i];
			const neighbors_i = neighborsData.neighbors[i];
			const spring_ij_i = particle_i.spring_ij;
			const group_i = particle_i.group;

			let pt_springs_i = particle_i.pt_springs;
			let pt_state_i = group_i.state;
			const sticky_i = pt_state_i.type === Sticky;
			const active_sticky_i = sticky_i && (group_i === activeGroup);

			for (const neighbor of neighbors_i) {
				const {
					j, distance_between_particles, unit_direction,
				} = neighbor;

				const particle_j = particles[j];
				const group_j = particle_j.group;
				const sticky_j = group_j.state.type === Sticky;

				if (
					(active_sticky_i || (sticky_j && group_j === activeGroup) || (sticky_i && sticky_j))
					&& (!spring_ij_i.has(j) && (pt_springs_i < maxParticleSpringsCount) && (particle_j.pt_springs < maxParticleSpringsCount))
				) {
					const spring: Spring = {
						i,
						j,
						next: springList.next,
						unit_direction_to_j: unit_direction,
						current_length: distance_between_particles,
						rest_length: distance_between_particles,
					};
					spring_ij_i.set(j, spring);
					springList.next = spring;
					pt_springs_i++;
					particle_j.pt_springs++;

					if (group_i !== particle_j.group) {
						pt_state_i = {
							...pt_state_i,
							type: Sticky
						};
						particle_j.group.state = {
							...particle_j.group.state,
							type: Sticky
						};
						groupsToRecalc.add(group_i);
						groupsToRecalc.add(particle_j.group);
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
			springList,
		} = this;

		let spring = springList.next;
		while (spring) {
			const { i, j } = spring;

			const neighbor = neighborsData.neighbors_map[i].get(j);

			if (neighbor) {
				spring.current_length = neighbor.distance_between_particles;
				spring.unit_direction_to_j = neighbor.unit_direction;
			} else {
				const dv = sub(positions[j], positions[i]);
				const length = len(dv);
				spring.current_length = length;
				spring.unit_direction_to_j = mul(dv, 1 / length);
			}

			spring = spring.next;
		}
	}

	private updateSoftSpringsRestLength(dt: number) {
		const {
			particles,
			softSpringCompressSpeedDivR,
			softSpringCompressTreshold,
			softSpringStretchSpeedDivR,
			softSpringStretchTreshold,
			springList,
		} = this;

		const softSpringStretchSpeedDivRMulDT = dt * softSpringStretchSpeedDivR;
		const softSpringCompressSpeedDivRMulDT = dt * softSpringCompressSpeedDivR;

		let spring = springList.next;
		while (spring) {
			const { i } = spring;

			if (particles[i].group.state.type === Sticky) {
				const spring_length = spring.rest_length;
				const distance_from_rest = spring.current_length - spring_length;
				const current_stretch_treshold = spring_length * softSpringStretchTreshold;
				if (distance_from_rest > current_stretch_treshold) {
					spring.rest_length += spring_length * softSpringStretchSpeedDivRMulDT * (distance_from_rest - current_stretch_treshold);
				} else {
					const current_compress_treshold = -spring_length * softSpringCompressTreshold;
					if (distance_from_rest < current_compress_treshold) {
						spring.rest_length += spring_length * softSpringCompressSpeedDivRMulDT * (distance_from_rest - current_compress_treshold);
					}
				}
			}

			spring = spring.next;
		}
	}

	private applyJelloPowers(neighbors: Neighbor[][]) {
		const {
			particles,
			particlesCount,
			Box2D,
		} = this;

		const sphPower = this.getSPHPower(neighbors);
		const springsPower = this.getSpringsPower();

		for (let i = 0; i < particlesCount; i++) {
			const power = add(springsPower[i], sphPower[i]);
			const body = particles[i].body;
			asB2D(Box2D, power, v => body.ApplyForceToCenter(v, true));
		}
	}

	private applySpinningPowerToGroup(group: ParticleGroup, positions: Vector[], scale: number) {
		const {
			particles,
			Box2D,
			spinPower,
		} = this;

		const k = spinPower * scale;

		const groupCenter = this.getGroupCenter(group, positions);

		for (const particleIndex of group.particles) {
			const d = sub(groupCenter, positions[particleIndex]);
			const power = mul({ x: d.y, y: -d.x }, k);

			asB2D(Box2D, power, v => {
				particles[particleIndex].body.ApplyForceToCenter(v, true);
			});
		}
	}

	private applyCompressionPowerToInactiveGroups(positions: Vector[]) {
		const {
			particles,
			activeGroup,
			compressPower,
		} = this;

		const groups = new Set<ParticleGroup>();
		for (const particle of particles) {
			groups.add(particle.group);
		}

		for (const group of groups) {
			if (group === activeGroup) {
				continue;
			}

			this.applyCompressPowerToGroup(group, positions, compressPower);
		}
	}

	private applyCompressPowerToGroup(group: ParticleGroup, positions: Vector[], compressPower: number) {
		const {
			particles,
			Box2D,
		} = this;

		const groupCenter = this.getGroupCenter(group, positions);

		for (const particleIndex of group.particles) {
			const d = sub(groupCenter, positions[particleIndex]);
			const power = mul(d, compressPower);

			asB2D(Box2D, power, v => {
				particles[particleIndex].body.ApplyForceToCenter(v, true);
			});
		}
	}

	private applyPowerToGroup(group: ParticleGroup, power: Vector) {
		const {
			particles,
			Box2D,
		} = this;

		for (const particleIndex of group.particles) {
			asB2D(Box2D, power, v => {
				particles[particleIndex].body.ApplyForceToCenter(v, true);
			});
		}
	}

	private applyPowerToAllParticles(power: Vector) {
		const {
			particles,
			Box2D,
		} = this;

		for (const particle of particles) {
			asB2D(Box2D, power, v => {
				particle.body.ApplyForceToCenter(v, true);
			});
		}
	}

	private applyPowerToAllParticlesByPosition(positions: Vector[], getPowerAt: (position: Vector) => Vector) {
		const {
			particles,
			Box2D,
		} = this;

		for (const particle of particles) {
			asB2D(Box2D, getPowerAt(positions[particle.index]), v => {
				particle.body.ApplyForceToCenter(v, true);
			});
		}
	}

	private getGroupCenter(group: ParticleGroup, positions: Vector[]) {
		let groupCenter = zero;

		for (const particleIndex of group.particles) {
			groupCenter = add(groupCenter, positions[particleIndex]);
		}

		return mul(groupCenter, 1 / group.particles.size);
	}

	private getSPHPower(neighbors: Neighbor[][]) {
		const {
			particles,
			particlesCount,
		} = this;

		const { press, press_near } = this.getPress(neighbors);

		const result = particles.map(() => zero);

		for (let i = 0; i < particlesCount; i++) {
			const press_i = press[i];
			const press_near_i = press_near[i];
			const neighbors_i = neighbors[i];

			let delta_power_i = zero;

			for (const neighbor of neighbors_i) {
				const j = neighbor.j;
				const unit_direction = neighbor.unit_direction;
				const press_j = press[j];
				const press_near_j = press_near[j];

				const dn = (press_i + press_j) * neighbor.q1 +
					(press_near_i + press_near_j) * neighbor.q2;

				const delta_power_ij = mul(unit_direction, dn);

				delta_power_i = add(delta_power_i, delta_power_ij);
				result[j] = add(result[j], delta_power_ij);
			}

			result[i] = sub(result[i], delta_power_i);
		}

		return result;
	}

	private getPress(neighbors: Neighbor[][]) {
		const {
			k,
			kNear,
			restDensity,
		} = this;

		const { ro, ro_near } = this.getRo(neighbors);

		const press = ro.map(ro_i => k * (ro_i - restDensity));
		const press_near = ro_near.map(ro_near_i => kNear * ro_near_i);

		return {
			press,
			press_near,
		};
	}

	private getRo(neighbors: Neighbor[][]) {
		const {
			particles,
			particlesCount,
		} = this;

		const ro = particles.map(() => 0);
		const ro_near = particles.map(() => 0);

		for (let i = 0; i < particlesCount; i++) {
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
			particlesCount,
			particles,
			Box2D,
		} = this;

		const velocities = this.getVelocities();
		const delta_velocities = this.calculateVelocityChanges(neighbors, velocities);

		for (let i = 0; i < particlesCount; i++) {
			asB2D(Box2D, add(velocities[i], delta_velocities[i]), v => particles[i].body.SetLinearVelocity(v));
		}
	}

	calculateVelocityChanges(neighbors: Neighbor[][], velocities: Vector[]) {
		const {
			particles,
			particlesCount,
			viscosityA,
			viscosityB,
			maxCollisionVelocity,
		} = this;

		const result = particles.map(() => zero);

		for (let i = 0; i < particlesCount; i++) {
			const velocity_i = velocities[i];
			const neighbors_i = neighbors[i];

			let delta_velocity_i = zero;

			for (const neighbor of neighbors_i) {
				const {
					j, unit_direction, q1
				} = neighbor;

				const collision_velocity = dot(sub(velocity_i, velocities[j]), unit_direction);
				if (collision_velocity > 0) {
					// TODO: do we really need clamping
					const collision_velocity_clamped = Math.min(collision_velocity, maxCollisionVelocity);
					const delta_velocity_ij = mul(unit_direction, q1 * (viscosityA + viscosityB * collision_velocity_clamped) * collision_velocity_clamped);

					delta_velocity_i = sub(delta_velocity_i, delta_velocity_ij);
					result[j] = add(result[j], delta_velocity_ij);
				}
			}

			result[i] = add(result[i], delta_velocity_i);
		}

		return result;
	}

	private getVelocities() {
		return this.particles.map(particle => fromB2D(particle.body.GetLinearVelocity()));
	}

	private getNeighborsData(positions: Vector[]) {
		const {
			particlesCount,
			particles,
			minNeighborDistanceSquared,
			r,
			r_inv,
			r2,
		} = this;

		const neighbors: NeighborsData = {
			neighbors: particles.map(() => []),
			neighbors_map: particles.map(() => new Map())
		};

		const pp = positions.map((p, index) => ({ p, index })).slice().sort((a, b) => a.p.x - b.p.x);

		for (let a = 0; a < particlesCount; a++) {
			const pp_a = pp[a];
			const { x: x_a, y: y_a } = pp_a.p;
			const index_a = pp_a.index;
			const x_up_a = x_a + r;
			const y_low_a = y_a - r;
			const y_up_a = y_a + r;

			for (let b = a + 1; b < particlesCount; b++) {
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

				const direction_to_j = sub(position_j, position_i);

				const distance_between_particles_squared = len2(direction_to_j);
				if (distance_between_particles_squared > r2 || distance_between_particles_squared < minNeighborDistanceSquared) {
					continue;
				}

				const distance_between_particles = Math.sqrt(distance_between_particles_squared);
				const unit_direction_to_j = mul(direction_to_j, 1 / distance_between_particles);
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
		return this.particles.map(particle => fromB2D(particle.body.GetPosition()));
	}

	draw(ctx: CanvasRenderingContext2D): void {
		const {
			particles,
			activeGroup,
			springList
		} = this;

		let spring = springList.next;
		while (spring) {
			ctx.beginPath();
			ctx.strokeStyle = (particles[spring.i].group === activeGroup) || (particles[spring.j].group === activeGroup) ? 'black' : 'lightgrey';
			const p1 = particles[spring.i].body.GetPosition();
			const p2 = particles[spring.j].body.GetPosition();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();
			spring = spring.next;
		}

		for (const particle of particles) {
			const p = particle.body.GetPosition();
			ctx.strokeStyle = (particle.group === activeGroup) ? 'red' : 'black';
			ctx.beginPath();
			ctx.ellipse(p.x, p.y, 2, 2, 0, 0, 2 * Math.PI);
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
		// for (i = 0; i < this.particlesCount; i++) {
		// 	p = particle.pt;
		// 	pnt.x = particle.px - this.imageRadius + this.offsetX;
		// 	pnt.y = particle.py - this.imageRadius + this.offsetY;
		// 	bmp.copyPixels(p.GetUserData() as BitmapData, r1, pnt, null, null, true);
		// }
		// const rect: Rectangle = new Rectangle(0, 0, w, h);
		// bmp.threshold(bmp, rect, new Point(0, 0), "<", this.treshold);

		/*for (i=0; i<particlesCount; i++)
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

	// 		for (i = 0; i < particlesCount; i++)			//Переводим активные частички в новое состояние
	// 			if (activeGroup[i])
	// 				pt_state[i] = new_state;

	// 		if (frozen)						//На всякий случай "ослабляем" короткие связи и укорачиваем длинные
	// 		{
	// 			spring = springList.next;
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
	// 			spring = springList.next;
	// 			prev = springList;
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
	// 			for (i = 0; i < particlesCount; i++)			//Переводим активные частички в новое состояние
	// 				if (activeGroup[i]) {
	// 					pt_state[i] = 2;
	// 					pt_springs[i] = 0;
	// 				}
	// 		}
	// 		else {
	// 			for (i = 0; i < particlesCount; i++)			//Переводим активные частички в новое состояние
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
