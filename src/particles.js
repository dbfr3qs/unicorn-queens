// Particle bursts: module-owned state, pure math.

export const particles = [];

export function resetParticles() {
  particles.length = 0;
}

export function burst(x, y, o, rng = Math.random) {
  for (let i = 0; i < o.count; i++) {
    const a = rng() * Math.PI * 2;
    const sp = o.speed * (0.5 + rng() * 0.5);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp + (o.vx || 0),
      vy: Math.sin(a) * sp - (o.up || 0),
      size: o.size * (0.6 + rng() * 0.8),
      color: o.colors[(rng() * o.colors.length) | 0],
      life: o.life * (0.6 + rng() * 0.4),
      t: 0,
      grav: o.grav || 0,
    });
  }
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) { particles.splice(i, 1); continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
