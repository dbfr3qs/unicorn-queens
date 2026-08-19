// Fireballs: a hot core in an orange glow.
import { fireballs } from '../projectiles.js';

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
