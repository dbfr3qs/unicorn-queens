// Particle rendering: fading squares. State lives in ../particles.js.
import { particles } from '../particles.js';

export function drawParticles(c) {
  for (const p of particles) {
    c.globalAlpha = Math.max(0, 1 - p.t / p.life);
    c.fillStyle = p.color;
    c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  c.globalAlpha = 1;
}
