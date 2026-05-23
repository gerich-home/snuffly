export const SPH_COMPUTE = /* wgsl */ `
struct Particle {
  pos: vec2f,
  vel: vec2f,
  density: f32,
  pressure: f32,
};

struct Spring {
  i: u32,
  j: u32,
  restLength: f32,
  _pad0: f32,
};

struct RigidBody {
  pos: vec2f,
  vel: vec2f,
  halfSize: vec2f,  // box half-extents
  angle: f32,
  shapeType: u32,   // 0=box, 1=circle
  _pad0: f32, _pad1: f32,
};

struct SimParams {
  numParticles: u32,
  numSprings: u32,
  numRigidBodies: u32,
  dt: f32,
  smoothingRadius: f32,
  restDensity: f32,
  stiffness: f32,
  nearStiffness: f32,
  viscosity: f32,
  springStiffness: f32,
  gravity: vec2f,
  wallDamping: f32,
  boundaryMin: vec2f,
  boundaryMax: vec2f,
  maxVelocity: f32,
  impulsePos: vec2f,
  impulseRadius: f32,
  impulseStrength: vec2f,
  impulseActive: u32,
  controlDir: vec2f,
  controlStrength: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimParams;
@group(0) @binding(2) var<storage, read> springs: array<Spring>;
@group(0) @binding(3) var<storage, read> rigidBodies: array<RigidBody>;

const PI: f32 = 3.14159265359;

fn poly6Kernel(r2: f32, h: f32) -> f32 {
  let h2 = h * h;
  if r2 >= h2 { return 0.0; }
  let diff = h2 - r2;
  return 315.0 / (64.0 * PI * pow(h, 9.0)) * diff * diff * diff;
}

fn spikyGradient(r: f32, h: f32) -> f32 {
  if r >= h || r < 0.0001 { return 0.0; }
  let diff = h - r;
  return -45.0 / (PI * pow(h, 6.0)) * diff * diff;
}

fn viscosityLaplacian(r: f32, h: f32) -> f32 {
  if r >= h { return 0.0; }
  return 45.0 / (PI * pow(h, 6.0)) * (h - r);
}

fn nearPoly6Kernel(r: f32, h: f32) -> f32 {
  if r >= h || r < 0.0 { return 0.0; }
  let diff = h - r;
  return diff * diff * diff;
}

// Point-to-AABB distance
fn pointToBoxDist(p: vec2f, boxPos: vec2f, halfSize: vec2f) -> f32 {
  let delta = p - boxPos;
  let d = abs(delta) - halfSize;
  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

@compute @workgroup_size(128)
fn computeDensityAndPressure(@builtin(global_invocation_id) global_id: vec3u) {
  let i = global_id.x;
  if i >= params.numParticles { return; }

  var density: f32 = 0.0;
  var nearDensity: f32 = 0.0;
  let myPos = particles[i].pos;
  let h = params.smoothingRadius;
  let h2 = h * h;

  for (var j = 0u; j < params.numParticles; j = j + 1u) {
    let diff = myPos - particles[j].pos;
    let r2 = dot(diff, diff);
    if r2 < h2 {
      density += poly6Kernel(r2, h);
      nearDensity += nearPoly6Kernel(sqrt(r2), h);
    }
  }

  particles[i].density = max(density, 0.001);
  particles[i].pressure = params.stiffness * (particles[i].density - params.restDensity);
  particles[i].pressure += params.nearStiffness * nearDensity;
}

@compute @workgroup_size(128)
fn computeForcesAndIntegrate(@builtin(global_invocation_id) global_id: vec3u) {
  let i = global_id.x;
  if i >= params.numParticles { return; }

  var force: vec2f = vec2f(0.0);
  let myPos = particles[i].pos;
  let myVel = particles[i].vel;
  let myDensity = particles[i].density;
  let myPressure = particles[i].pressure;
  let h = params.smoothingRadius;
  let h2 = h * h;

  // SPH forces
  for (var j = 0u; j < params.numParticles; j = j + 1u) {
    if j == i { continue; }
    let diff = myPos - particles[j].pos;
    let r2 = dot(diff, diff);
    if r2 < h2 && r2 > 0.000001 {
      let r = sqrt(r2);
      let dir = diff / r;
      let pressureForce = -dir * (myPressure + particles[j].pressure) / (2.0 * particles[j].density) * spikyGradient(r, h);
      force += pressureForce;
      let viscForce = params.viscosity * (particles[j].vel - myVel) / particles[j].density * viscosityLaplacian(r, h);
      force += viscForce;
    }
  }

  // Spring forces
  for (var si = 0u; si < params.numSprings; si = si + 1u) {
    let sp = springs[si];
    if sp.i == i {
      let dp = particles[sp.j].pos - myPos;
      let dist = length(dp);
      if dist > 0.0001 {
        let dir = dp / dist;
        let springForce = dir * sp.restLength * params.springStiffness * (dist - sp.restLength);
        force += springForce;
      }
    }
    if sp.j == i {
      let dp = particles[sp.i].pos - myPos;
      let dist = length(dp);
      if dist > 0.0001 {
        let dir = dp / dist;
        let springForce = dir * sp.restLength * params.springStiffness * (dist - sp.restLength);
        force += springForce;
      }
    }
  }

  // User control force
  if (length(params.controlDir) > 0.001) {
    force += params.controlDir * params.controlStrength * myDensity;
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
  force += params.gravity * myDensity;

  // Rigid body collision
  for (var ri = 0u; ri < params.numRigidBodies; ri = ri + 1u) {
    let rb = rigidBodies[ri];
    if rb.shapeType == 0u {  // box
      let d = pointToBoxDist(myPos, rb.pos, rb.halfSize);
      if d < h && d > 0.0 {
        let normal = myPos - rb.pos;
      let absN = abs(normal);
      let overlap = rb.halfSize - abs(normal);
      var rebound: vec2f = normal;
      if overlap.x < overlap.y {
        rebound.x = sign(normal.x) * (h - d);
        rebound.y = 0.0;
      } else {
        rebound.y = sign(normal.y) * (h - d);
        rebound.x = 0.0;
      }
      force += normalize(rebound) * params.stiffness * (h - d) / h;
      }
    }
  }

  // Integration
  var newVel = myVel + (force / myDensity) * params.dt;
  if (length(newVel) > params.maxVelocity) {
    newVel = normalize(newVel) * params.maxVelocity;
  }

  var newPos = myPos + newVel * params.dt;

  // Wall collision
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
};

struct RenderParams {
  numParticles: u32,
  smoothingRadius: f32,
  threshold: f32,
  aspectRatio: f32,
  resolution: vec2f,
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
    let pPos = particles[i].pos;
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
