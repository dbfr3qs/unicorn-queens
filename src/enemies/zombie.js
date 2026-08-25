// Zombie: shambles within bounds, chases the player in range; stompable;
// green shuffler sprite (leg shuffle from position).
import { resolveGroundCollision } from '../levels/level.js';
import { P_GRAVITY, P_TERM_VY } from '../player.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

function update(e, { p, lvl, dt }) {
  // Shambles within its bounds; chases the player while they are close
  // and roughly on the same level (chasing ignores the bounds).
  const dx = p.x + p.w / 2 - (e.x + e.w / 2);
  const dy = p.y + p.h / 2 - (e.y + e.h / 2);
  const chasing = !p.dead && Math.abs(dx) < this.aggroRange && Math.abs(dy) < this.aggroDy;
  if (chasing) {
    e.dir = dx >= 0 ? 1 : -1;
    e.vx = e.dir * this.chaseSpeed;
  } else {
    e.vx = e.dir * this.speed;
  }
  e.vy = Math.min(e.vy + P_GRAVITY * dt, P_TERM_VY);
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (!chasing) {
    if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
    else if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
  }
  resolveGroundCollision(e, lvl, dt);
}

function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const step = Math.sin(e.x * 0.3) * 3; // leg shuffle from position
  c.fillStyle = '#4a7c3f'; // torso
  c.fillRect(-17, -20, 34, 32);
  c.fillStyle = '#3a6132'; // legs
  c.fillRect(-14, 12, 10, 8 + step);
  c.fillRect(4, 12, 10, 8 - step);
  c.fillStyle = '#5d9450'; // outstretched arm
  c.fillRect(6, -10, 12, 6);
  c.fillStyle = '#3a6132'; // dark patch
  c.fillRect(-13, -2, 8, 10);
  c.fillStyle = palette.white; // eye
  c.fillRect(3, -16, 7, 5);
  c.fillStyle = '#e33'; // glowing pupil
  c.fillRect(6, -15, 3, 3);
  c.restore();
}

register({
  kind: 'zombie',
  w: 34, h: 40,
  speed: 40, chaseSpeed: 70, aggroRange: 220, aggroDy: 60,
  stompable: true,
  update,
  draw,
});
