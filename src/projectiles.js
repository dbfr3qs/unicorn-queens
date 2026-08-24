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

// --- Troll projectiles ----------------------------------------------------
// Boulders: gravity lob aimed at the player. Not shootable (arrows only
// check enemies and boxes, so they pass straight through). Land in a dust
// puff; fizzle at TTL. Shockwaves: ground-bound twin wavefronts from a
// slam, one hit each, fizzle at range.
export const BOULDER_SIZE = 18, BOULDER_G = 900, BOULDER_TTL = 4;
export const BOULDER_FLIGHT = 1.1; // solved arc flight time (s)
export const SHOCK_SPEED = 180, SHOCK_TTL = 1.2, SHOCK_W = 12, SHOCK_H = 18;
export const boulders = [];
export const shockwaves = [];

export function resetBoulders() { boulders.length = 0; }
export function resetShockwaves() { shockwaves.length = 0; }

// (x, y) is the boulder's spawn top-left; (tx, ty) where it should arrive.
// The arc is solved for a fixed flight time: vx = dx/T, vy from the
// constant-gravity displacement equation.
export function fireBoulder(x, y, tx, ty, fx) {
  const T = BOULDER_FLIGHT;
  boulders.push({
    x, y, w: BOULDER_SIZE, h: BOULDER_SIZE,
    vx: (tx - x) / T,
    vy: (ty - y - 0.5 * BOULDER_G * T * T) / T,
    ttl: BOULDER_TTL,
    dead: false,
  });
  fx.play('clatter'); // the throw
}

// Twin ground-bound wavefronts rolling away from (x, groundY).
export function fireShockwaves(x, groundY, fx) {
  const y = groundY - SHOCK_H;
  shockwaves.push({ x: x - 6, y, w: SHOCK_W, h: SHOCK_H, vx: -SHOCK_SPEED, ttl: SHOCK_TTL, hit: false, dead: false });
  shockwaves.push({ x: x + 6, y, w: SHOCK_W, h: SHOCK_H, vx: SHOCK_SPEED, ttl: SHOCK_TTL, hit: false, dead: false });
  fx.play('rumble');
}

export function updateBoulders(p, lvl, cam, dt, fx) {
  for (const b of boulders) {
    if (b.dead) continue;
    b.vy = Math.min(b.vy + BOULDER_G * dt, 900);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.ttl -= dt;
    if (b.ttl <= 0) { b.dead = true; boulderFizzle(b, fx); continue; }
    if (b.x + b.w < 0 || b.x > lvl.width) { b.dead = true; continue; } // off the level
    if (b.vy > 0) { // landing: the falling band crosses a surface top
      const s = surfaceTop(b, lvl);
      if (s !== null) {
        b.y = s - b.h;
        b.dead = true;
        fx.play('thud');
        burst(b.x + b.w / 2, b.y + b.h, FX.boulderLand); // dust puff
        continue;
      }
    }
    if (b.y > lvl.groundY + 80) { b.dead = true; continue; } // into a lava fissure
    if (!p.dead &&
        b.x < p.x + p.w && b.x + b.w > p.x && b.y < p.y + p.h && b.y + b.h > p.y) {
      if (p.invuln <= 0) { b.dead = true; hurtPlayer(p, cam, fx); } // shared hurt
    }
  }
  for (let i = boulders.length - 1; i >= 0; i--) if (boulders[i].dead) boulders.splice(i, 1);
}

export function updateShockwaves(p, cam, dt, fx) {
  for (const s of shockwaves) {
    if (s.dead) continue;
    s.x += s.vx * dt;
    s.ttl -= dt;
    if (s.ttl <= 0) { s.dead = true; shockFizzle(s, fx); continue; }
    if (!s.hit && !p.dead &&
        s.x < p.x + p.w && s.x + s.w > p.x && s.y < p.y + p.h && s.y + s.h > p.y) {
      if (p.invuln <= 0) { s.hit = true; hurtPlayer(p, cam, fx); } // one hit per wave
    }
  }
  for (let i = shockwaves.length - 1; i >= 0; i--) if (shockwaves[i].dead) shockwaves.splice(i, 1);
}

function boulderFizzle(b, fx) {
  fx.play('clatter');
  burst(b.x + b.w / 2, b.y + b.h / 2, FX.boulderFizzle);
}

function shockFizzle(s, fx) {
  fx.play('clatter');
  burst(s.x + s.w / 2, s.y + s.h / 2, FX.shockwave);
}

// The surface top the band crosses, or null (over a gap / nowhere).
function surfaceTop(b, lvl) {
  for (const s of lvl.ground.concat(lvl.platforms)) {
    if (b.x < s.x + s.w && b.x + b.w > s.x && b.y < s.y && b.y + b.h > s.y) return s.y;
  }
  return null;
}
