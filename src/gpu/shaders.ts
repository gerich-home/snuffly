export const SPH_COMPUTE = /* wgsl */ `
struct Particle {
  pos: vec2f,
  vel: vec2f,
  density: f32,
  pressure: f32,
  nearPressure: f32,
};

struct RigidBody {
  pos: vec2f,
  vel: vec2f,
  halfSize: vec2f,
  angle: f32,
  shapeType: u32,
  _pad0: f32, _pad1: f32,
};

struct SimParams {
  numParticles: u32,
  numRigidBodies: u32,
  impulseActive: u32,
  numParticlesSq: u32,
  dt: f32,
  smoothingRadius: f32,
  restDensity: f32,
  stiffness: f32,
  nearStiffness: f32,
  viscosityA: f32,
  viscosityB: f32,
  springStiffness: f32,
  wallDamping: f32,
  maxVelocity: f32,
  impulseRadius: f32,
  controlStrength: f32,
  springConnectRadius: f32,
  springBreakRadius: f32,
  springStretchThreshold: f32,
  springCompressThreshold: f32,
  springStretchSpeed: f32,
  springCompressSpeed: f32,
  maxCollisionVelocity: f32,
  maxSpringLength: f32,
  gravity: vec2f,
  boundaryMin: vec2f,
  boundaryMax: vec2f,
  impulsePos: vec2f,
  impulseStrength: vec2f,
  controlDir: vec2f,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimParams;
@group(0) @binding(2) var<storage, read_write> restLengths: array<f32>;
@group(0) @binding(3) var<storage, read> rigidBodies: array<RigidBody>;

fn q1(dist: f32, h: f32) -> f32 {
  if dist >= h { return 0.0; }
  return 1.0 - dist / h;
}

@compute @workgroup_size(128)
fn computeDensityAndPressure(@builtin(global_invocation_id) global_id: vec3u) {
  let i = global_id.x;
  if i >= params.numParticles { return; }

  var density: f32 = 0.0;
  var nearDensity: f32 = 0.0;
  let myPos = particles[i].pos;
  let h = params.smoothingRadius;
  let n = params.numParticles;

  for (var j = 0u; j < n; j = j + 1u) {
    if j == i { continue; }
    let diff = myPos - particles[j].pos;
    let dist = length(diff);
    let q = q1(dist, h);
    if q > 0.0 {
      let q2 = q * q;
      density += q2;
      nearDensity += q2 * q;
    }
  }

  particles[i].density = max(density, 0.001);
  particles[i].nearPressure = params.nearStiffness * nearDensity;
  particles[i].pressure = params.stiffness * max(density - params.restDensity, 0.0);
}

@compute @workgroup_size(128)
fn computeForcesAndIntegrate(@builtin(global_invocation_id) global_id: vec3u) {
  let i = global_id.x;
  if i >= params.numParticles { return; }

  var force: vec2f = vec2f(0.0);
  let myPos = particles[i].pos;
  let myVel = particles[i].vel;
  let myPres = particles[i].pressure;
  let myNearPres = particles[i].nearPressure;
  let h = params.smoothingRadius;
  let n = params.numParticles;

  // SPH forces (original simple kernel)
  for (var j = 0u; j < n; j = j + 1u) {
    if j == i { continue; }
    let diff = myPos - particles[j].pos;
    let dist = length(diff);
    let q = q1(dist, h);
    if q > 0.0 && dist > 0.0001 {
      let dir = diff / dist;
      let q2 = q * q;
      let pressureF = (myPres + particles[j].pressure) * q + (myNearPres + particles[j].nearPressure) * q2;
      force += dir * pressureF;
    }
  }

  // Viscosity (original: only opposing velocity)
  for (var j = 0u; j < n; j = j + 1u) {
    if j == i { continue; }
    let diff = myPos - particles[j].pos;
    let dist = length(diff);
    let q = q1(dist, h);
    if q > 0.0 && dist > 0.0001 {
      let dir = diff / dist;
      let relVel = dot(myVel - particles[j].vel, dir);
      if relVel > 0.0 {
        let clamped = min(relVel, params.maxCollisionVelocity);
        let viscForce = q * (params.viscosityA + params.viscosityB * clamped) * clamped;
        force -= dir * viscForce;
      }
    }
  }

  // Spring forces (GPU neighbor detection via restLengths)
  let connectR = params.springConnectRadius;
  let breakR = params.springBreakRadius;
  let nSq = params.numParticlesSq;
  for (var j = 0u; j < n; j = j + 1u) {
    if j == i { continue; }
    let rl = restLengths[i * n + j];
    if rl > 0.0 {
      let diff = myPos - particles[j].pos;
      let dist = length(diff);
      if dist < breakR && dist > 0.0001 {
        if dist < connectR {
          let dir = diff / dist;
          let springForce = dir * params.springStiffness * (rl - dist);
          force -= springForce;
        }
        // Spring rest-length creep (sticky / soft spring)
        let idx = i * n + j;
        if i < j {
          let dFromRest = dist - rl;
          let stretchThresh = rl * params.springStretchThreshold;
          let compressThresh = -rl * params.springCompressThreshold;
          if dFromRest > stretchThresh {
            let newRl = rl + rl * params.springStretchSpeed * (dFromRest - stretchThresh) * params.dt;
            restLengths[idx] = max(newRl, 0.001);
          } else if dFromRest < compressThresh {
            let newRl = rl + rl * params.springCompressSpeed * (dFromRest - compressThresh) * params.dt;
            restLengths[idx] = max(newRl, 0.001);
          }
          // Break if too stretched
          if dist > params.maxSpringLength {
            restLengths[idx] = 0.0;
          }
        }
      }
    }
  }

  // User control force
  if (length(params.controlDir) > 0.001) {
    force += params.controlDir * params.controlStrength;
  }

  // Impulse
  if params.impulseActive > 0u {
    let impDiff = myPos - params.impulsePos;
    let impDist = length(impDiff);
    if impDist < params.impulseRadius && impDist > 0.001 {
      let impFactor = (1.0 - impDist / params.impulseRadius);
      force += normalize(impDiff) * impFactor * length(params.impulseStrength) * 50.0;
    }
  }

  // Gravity
  force += params.gravity;

  // Rigid body collision
  for (var ri = 0u; ri < params.numRigidBodies; ri = ri + 1u) {
    let rb = rigidBodies[ri];
    if rb.shapeType == 0u {
      let delta = myPos - rb.pos;
      let d = abs(delta) - rb.halfSize;
      if d.x > 0.0 && d.y > 0.0 {
        let dist = length(max(d, vec2f(0.0)));
        if dist < h {
          var rebound: vec2f = delta;
          if d.x < d.y {
            rebound.x = sign(delta.x) * (h - dist);
            rebound.y = 0.0;
          } else {
            rebound.y = sign(delta.y) * (h - dist);
            rebound.x = 0.0;
          }
          force += normalize(rebound) * params.stiffness * (h - dist) / h;
        }
      }
    }
  }

  // Integration
  var newVel = myVel + force * params.dt;
  if (length(newVel) > params.maxVelocity) {
    newVel = normalize(newVel) * params.maxVelocity;
  }

  var newPos = myPos + newVel * params.dt;

  // Wall collision (boundary clamp)
  let damping = params.wallDamping;
  if newPos.x < params.boundaryMin.x { newPos.x = params.boundaryMin.x; newVel.x = -newVel.x * damping; }
  if newPos.x > params.boundaryMax.x { newPos.x = params.boundaryMax.x; newVel.x = -newVel.x * damping; }
  if newPos.y < params.boundaryMin.y { newPos.y = params.boundaryMin.y; newVel.y = -newVel.y * damping; }
  if newPos.y > params.boundaryMax.y { newPos.y = params.boundaryMax.y; newVel.y = -newVel.y * damping; }

  particles[i].pos = newPos;
  particles[i].vel = newVel;
}
`;

export const METABALL_VERTEX = /* wgsl */ `
@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0),
    vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0),
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}
`;

export const SPRING_VERTEX = /* wgsl */ `
@vertex
fn main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos.x * 2.0 - 1.0, pos.y * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const SPRING_FRAGMENT = /* wgsl */ `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(0.2, 0.7, 0.95, 0.7);
}
`;

export const METABALL_FRAGMENT = /* wgsl */ `
struct Particle {
  pos: vec2f,
  vel: vec2f,
  density: f32,
  pressure: f32,
  nearPressure: f32,
};

struct RenderParams {
  numParticles: u32,
  smoothingRadius: f32,
  threshold: f32,
  aspectRatio: f32,
  resolution: vec2f,
  cameraCenter: vec2f,
  cameraZoom: f32,
};

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> renderParams: RenderParams;

@fragment
fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = vec2f(fragCoord.x / renderParams.resolution.x, 1.0 - fragCoord.y / renderParams.resolution.y);
  var field: f32 = 0.0;
  var avgVel: f32 = 0.0;
  let h = renderParams.smoothingRadius;
  let h2 = h * h;
  let aspect = renderParams.aspectRatio;

  for (var i = 0u; i < renderParams.numParticles; i = i + 1u) {
    let pPos = (particles[i].pos - renderParams.cameraCenter) / renderParams.cameraZoom + 0.5;
    let dx = (uv.x - pPos.x) * aspect;
    let dy = uv.y - pPos.y;
    let r2 = dx * dx + dy * dy;
    if r2 < h2 {
      let w = (h2 - r2) / h2;
      field += w * w;
      avgVel += length(particles[i].vel) * w * w;
    }
  }

  if field > renderParams.threshold {
    let intensity = (field - renderParams.threshold) / (1.5 - renderParams.threshold);
    let velColor = min(avgVel / max(field * 10.0, 0.001), 1.0);
    let deepColor = vec3f(0.02, 0.08, 0.25);
    let midColor = vec3f(0.05, 0.35, 0.65);
    let lightColor = vec3f(0.25, 0.65, 0.95);
    let foamColor = vec3f(0.65, 0.88, 0.98);
    var color: vec3f;
    if velColor < 0.33 { color = mix(deepColor, midColor, velColor * 3.0); }
    else if velColor < 0.66 { color = mix(midColor, lightColor, (velColor - 0.33) * 3.0); }
    else { color = mix(lightColor, foamColor, (velColor - 0.66) * 3.0); }
    let edge = smoothstep(0.0, 0.2, intensity);
    color = mix(foamColor * 0.4, color, edge);
    return vec4f(color, 1.0);
  }
  return vec4f(0.04, 0.04, 0.06, 1.0);
}
`;
