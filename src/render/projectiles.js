// Enemy projectiles: fireballs (hot core in an orange glow), troll
// boulders (rock with speckles), shockwave fronts (dust + rock shard).
import { fireballs, boulders, shockwaves } from '../projectiles.js';

export function drawFireballs(c) {
  for (const f of fireballs) {
    c.save();
    c.translate(f.x + f.w / 2, f.y + f.h / 2);
    c.fillStyle = '#c1440e'; // outer glow
    c.fillRect(-9, -9, 18, 18);
    c.fillStyle = '#ff8c42'; // body
    c.fillRect(-7, -7, 14, 14);
    c.fillStyle = '#ffd166'; // hot core
    c.fillRect(-3, -3, 6, 6);
    c.restore();
  }
}

export function drawBoulders(c) {
  for (const b of boulders) {
    c.save();
    c.translate(b.x + b.w / 2, b.y + b.h / 2);
    c.fillStyle = '#6b4a32'; // rock
    c.fillRect(-9, -9, 18, 18);
    c.fillStyle = '#4a2d1c'; // speckles
    c.fillRect(-5, -4, 4, 4);
    c.fillRect(1, 2, 5, 4);
    c.restore();
  }
}

export function drawShockwaves(c) {
  for (const s of shockwaves) {
    c.save();
    c.translate(s.x + s.w / 2, s.y + s.h / 2);
    c.fillStyle = '#8d76b8'; // dust
    c.fillRect(-6, -9, 12, 18);
    c.fillStyle = '#6b4a32'; // rock shard
    c.fillRect(-4, -4, 8, 8);
    c.restore();
  }
}
