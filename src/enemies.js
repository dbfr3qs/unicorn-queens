// Enemies: per-kind brains (slime patrols, zombie chases, ghost drifts,
// mage duels), plus shared physics, stomp vs side-contact, and arrow damage.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { shake } from './camera.js';
import { P_GRAVITY, P_TERM_VY, HURT_INVULN, hurtPlayer } from './player.js';
import { fireFireball, fireballs, FIREBALL_SPEED } from './projectiles.js';
import { FX } from './effects.js';

export const E_W = 30, E_H = 28, E_STOMP_V = -400;
export { HURT_INVULN }; // re-exported: defined in player.js

// One entry per enemy kind: size, stomp rule, tuning, and `update` — the
// kind-specific brain, which sets e.vx/e.vy and may do extras (hopping,
// firing). Brains read their own tuning off `this` (the kind entry).
// Shared parts — stomp vs side-hit, arrow hits, pit death — live in this
// module, so a new kind gets them for free. Adding a kind: an entry here,
// a draw function in src/render/enemies.js, and (optionally) FX presets in
// src/effects.js.
const KINDS = {
  slime: {
    w: E_W, h: E_H,
    speed: 90,
    stompable: true,
    update(e, { lvl, dt }) {
      // Dumb patrol: keep walking, turn at the bounds.
      e.vx = e.dir * this.speed;
      e.vy = Math.min(e.vy + P_GRAVITY * dt, P_TERM_VY);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
      else if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      resolveGroundCollision(e, lvl, dt);
    },
  },
  zombie: {
    w: 34, h: 40,
    speed: 40, chaseSpeed: 70, aggroRange: 220, aggroDy: 60,
    stompable: true,
    update(e, { p, lvl, dt }) {
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
    },
  },
  ghost: {
    w: 28, h: 26,
    speed: 60, aggroRange: 260, aggroDy: 120, bobAmp: 14, bobPeriod: 2,
    stompable: false,
    update(e, { p, dt }) {
      // Hovers at its home point with a slow bob; drifts toward the player
      // while they are close, eases back home when they aren't.
      if (e.homeX === undefined) { e.homeX = e.x; e.homeY = e.y; e.phase = e.x * 0.1; }
      e.phase += dt * Math.PI * 2 / this.bobPeriod;
      const dx = p.x + p.w / 2 - (e.x + e.w / 2);
      const dy = p.y + p.h / 2 - (e.y + e.h / 2);
      const near = !p.dead && Math.abs(dx) < this.aggroRange && Math.abs(dy) < this.aggroDy;
      const tx = near ? p.x + p.w / 2 : e.homeX + e.w / 2;
      const ty = near ? p.y + p.h / 2 : e.homeY + e.h / 2 + Math.sin(e.phase) * this.bobAmp;
      const ox = tx - (e.x + e.w / 2);
      const oy = ty - (e.y + e.h / 2);
      const d = Math.hypot(ox, oy);
      if (d > 0) {
        const m = Math.min(this.speed * dt, d); // ease toward target
        e.x += ox / d * m;
        e.y += oy / d * m;
      }
    },
  },
  mage: {
    w: 42, h: 54,
    hp: 5, stompable: false,
    idleMin: 1.6, idleMax: 2.4, windupT: 0.7, staggerT: 0.25, flashT: 0.15, aggroRange: 500,
    deathSound: 'boss', deathFx: FX.mageDeath,
    onHit(e) {
      e.flash = this.flashT;
      e.state = 'stagger';
      e.t = this.staggerT;
    },
    update(e, { p, dt, fx }) {
      // Boss duel: idle -> windup (staff glows) -> fire at the player's
      // height. Arrow hits stagger the cycle. One fireball in the air at a
      // time; the boss sleeps until the player is in range.
      if (e.state === undefined) { e.state = 'idle'; e.t = 2; e.flash = 0; }
      e.flash = Math.max(0, e.flash - dt);
      e.dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1; // face the player
      e.t -= dt;
      if (e.state === 'stagger') {
        if (e.t <= 0) { e.state = 'idle'; e.t = this.nextIdle(); }
        return; // frozen while staggering
      }
      if (e.state === 'idle') {
        if (e.t > 0) return;
        const inRange = !p.dead && Math.abs(p.x + p.w / 2 - (e.x + e.w / 2)) < this.aggroRange;
        if (inRange && fireballs.length === 0) { e.state = 'windup'; e.t = this.windupT; }
        else e.t = 0.4; // wait: player out of range, or a fireball in flight
        return;
      }
      // windup done: fire
      if (e.t > 0) return;
      const dir = p.x + p.w / 2 >= e.x + e.w / 2 ? 1 : -1;
      fireFireball(e.x + e.w / 2 + dir * 24, p.y + p.h / 2 - 7, dir * FIREBALL_SPEED, 0, fx);
      e.state = 'idle';
      e.t = this.nextIdle();
    },
    nextIdle() { return this.idleMin + Math.random() * (this.idleMax - this.idleMin); },
  },
};

export function spawnEnemy(spec, lvl) {
  const k = KINDS[spec.kind];
  return {
    kind: spec.kind,
    x: spec.x, y: spec.y ?? lvl.groundY - k.h, w: k.w, h: k.h,
    vx: 0, vy: 0, onGround: false,
    minX: spec.minX ?? 0,
    maxX: spec.maxX ?? lvl.width,
    dir: spec.dir ?? -1,
    hp: k.hp ?? 1,
    dead: false,
  };
}

// Shared one-point damage (arrows and friends): -1 hp, per-kind hit
// reaction (onHit), death at 0 with per-kind sound and burst.
export function damageEnemy(e, fx) {
  e.hp -= 1;
  const k = KINDS[e.kind];
  if (e.hp <= 0) {
    e.dead = true;
    fx.play(k.deathSound ?? 'thwack');
    burst(e.x + e.w / 2, e.y + e.h / 2, k.deathFx ?? FX.enemyDeath);
  } else {
    fx.play('thwack');
    if (k.onHit) k.onHit(e);
  }
}

// Enemy placement for the level: one entry per enemy.
const ROSTER = [
  { kind: 'slime', x: 560, minX: 496, maxX: 664 },
  { kind: 'slime', x: 1050, minX: 980, maxX: 1260 },
  { kind: 'slime', x: 1450, minX: 1380, maxX: 1560 },
  { kind: 'slime', x: 2000, minX: 2010, maxX: 2125 },
  { kind: 'slime', x: 2250, minX: 2165, maxX: 2360 },
];

export function createEnemies(lvl) {
  return ROSTER.map(spec => spawnEnemy(spec, lvl));
}

export function updateEnemies(enemies, p, lvl, cam, dt, fx) {
  const env = { p, lvl, cam, dt, fx };
  for (const e of enemies) {
    if (e.dead) continue;
    KINDS[e.kind].update(e, env);
    if (e.y > lvl.height + 100) { e.dead = true; continue; } // fell into a pit
    hitPlayer(e, p, cam, fx);
  }
}

// Shared stomp vs side contact, applied to every kind.
function hitPlayer(e, p, cam, fx) {
  if (p.dead || p.invuln > 0) return;
  if (!(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y)) return;
  const stomp = p.vy > 0 && p.y + p.h - e.y < 16;
  if (stomp && KINDS[e.kind].stompable) {
    e.dead = true;   // stomped
    p.vy = E_STOMP_V; // bounce
    p.cuttable = false;
    fx.play('stomp');
    burst(e.x + e.w / 2, e.y + e.h / 2, FX.enemyDeath);
    shake(cam, 5, 0.18);
  } else if (stomp) {
    p.vy = E_STOMP_V; // bounced off an unstompable enemy (ghost)
  } else {
    hurtPlayer(p, cam, fx);
  }
}
