// Slime: dumb patrol brain (turns at minX/maxX), stompable, owns E_W/E_H;
// purple body sprite.
import { resolveGroundCollision } from '../levels/level.js';
import { P_GRAVITY, P_TERM_VY } from '../player.js';
import { register } from './index.js';
import { palette } from '../render/theme.js';

export const E_W = 30, E_H = 28;

// Brain: sets e.vx/e.vy. Dispatch calls def.update(e, env), so `this` is
// this kind entry and we read tuning off it (the original KINDS convention).
function update(e, { lvl, dt }) {
  // Dumb patrol: keep walking, turn at the bounds.
  e.vx = e.dir * this.speed;
  e.vy = Math.min(e.vy + P_GRAVITY * dt, P_TERM_VY);
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
  else if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
  resolveGroundCollision(e, lvl, dt);
}

// Sprite: owns its own save/translate/scale/restore (as before).
function draw(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  c.fillStyle = '#5d3a9b'; // body
  c.fillRect(-15, -14, 30, 24);
  c.fillStyle = palette.night; // feet
  c.fillRect(-13, 10, 8, 4);
  c.fillRect(5, 10, 8, 4);
  c.fillStyle = palette.white; // eye
  c.fillRect(4, -10, 6, 6);
  c.fillStyle = '#e33';
  c.fillRect(6, -8, 3, 3);
  c.restore();
}

register({
  kind: 'slime',
  w: E_W, h: E_H,
  speed: 90,
  stompable: true,
  update,
  draw,
});
