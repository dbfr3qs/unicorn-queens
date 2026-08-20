// Enemy projectiles: fireballs from the mage. Unlike the player's arrows,
// they cannot be shot down, have no gravity, and fizzle out after a while.
import { burst } from './particles.js';
import { hurtPlayer } from './player.js';
import { damageEnemy } from './enemies.js';
import { FX } from './effects.js';

export const FIREBALL_SIZE = 14, FIREBALL_SPEED = 240, FIREBALL_TTL = 3;
export const fireballs = [];

export function resetFireballs() {
  fireballs.length = 0;
}

export function fireFireball(x, y, vx, vy, fx) {
  fireballs.push({ x, y, w: FIREBALL_SIZE, h: FIREBALL_SIZE, vx, vy, ttl: FIREBALL_TTL, dead: false, cool: 0, reflected: false });
  fx.play('fireball');
}

// Advance fireballs: fizzle on TTL, off-level, or surface contact; the
// mirror shield reflects a shot (reflected = true) instead of the hit,
// and reflected shots damage the mage. enemies (for the mage) is
// optional - absent in unit tests.
export function updateFireballs(p, lvl, cam, dt, fx, enemies = []) {
  for (const f of fireballs) {
    if (f.dead) continue;
    f.cool = Math.max(0, f.cool - dt); // reflect immunity window
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.ttl -= dt;
    if (f.ttl <= 0) { f.dead = true; fizzle(f, fx); continue; }
    if (f.x + f.w < 0 || f.x > lvl.width) { f.dead = true; continue; } // off the level
    if (hitsSurface(f, lvl)) { f.dead = true; fizzle(f, fx); continue; }
    if (f.cool <= 0 && !p.dead &&
        f.x < p.x + p.w && f.x + f.w > p.x && f.y < p.y + p.h && f.y + f.h > p.y) {
      if (p.shield > 0) { // reflect wins over hurt (and over invuln)
        p.shield -= 1;
        f.vx = -f.vx;
        f.reflected = true;
        f.cool = 0.4; // time to clear the player's body
        fx.play('reflect');
        burst(f.x + f.w / 2, f.y + f.h / 2, FX.reflect);
      } else if (p.invuln <= 0) {
        f.dead = true;
        hurtPlayer(p, cam, fx);
      }
    }
    if (f.dead) continue;
    if (f.reflected) { // reflected shots damage the mage
      const mage = enemies.find(e => e.kind === 'mage' && !e.dead);
      if (mage && f.x < mage.x + mage.w && f.x + f.w > mage.x &&
          f.y < mage.y + mage.h && f.y + f.h > mage.y) {
        damageEnemy(mage, fx);
        f.dead = true;
        fizzle(f, fx);
      }
    }
  }
  for (let i = fireballs.length - 1; i >= 0; i--) if (fireballs[i].dead) fireballs.splice(i, 1);
}

function fizzle(f, fx) {
  fx.play('fizzle');
  burst(f.x + f.w / 2, f.y + f.h / 2, FX.fireballFizzle);
}

// Fireballs have no gravity, so "hitting a surface" = the fireball's band
// crosses the surface's top line (ground or platform).
function hitsSurface(f, lvl) {
  for (const s of lvl.ground.concat(lvl.platforms)) {
    if (f.x < s.x + s.w && f.x + f.w > s.x && f.y < s.y && f.y + f.h > s.y) return true;
  }
  return false;
}
