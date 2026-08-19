// Enemies: per-kind brains (slime patrols; hopping/shooting kinds later),
// plus shared ground physics and stomp vs side-contact resolution.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { shake } from './camera.js';
import { P_GRAVITY, P_TERM_VY } from './player.js';
import { FX } from './effects.js';

export const E_W = 30, E_H = 28, E_STOMP_V = -400, HURT_INVULN = 1.5;

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
    dead: false,
  };
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
    p.hp -= 1;
    p.invuln = HURT_INVULN;
    p.vy = -250;
    p.cuttable = false;
    fx.play('hurt');
    burst(p.x + p.w / 2, p.y + p.h / 2, FX.hurt);
    shake(cam, 8, 0.3);
    if (p.hp <= 0) { p.dead = true; fx.play('die'); }
  }
}
