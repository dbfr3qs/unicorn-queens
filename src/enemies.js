// Enemies: per-kind brains (slime patrols, zombie chases, ghost drifts,
// mage duels), plus shared physics, stomp vs side-contact, and arrow damage.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { shake } from './camera.js';
import { P_GRAVITY, P_TERM_VY, HURT_INVULN, hurtPlayer } from './player.js';
import { fireFireball, fireballs, FIREBALL_SPEED } from './projectiles.js';
import { FX } from './effects.js';
import { getKind } from './enemies/index.js';
// each kind import self-registers into the enemy kind registry
import './enemies/slime.js';
import './enemies/zombie.js';
import './enemies/ghost.js';

export { E_W, E_H } from './enemies/slime.js'; // owned by slime; re-exported for tests
export const E_STOMP_V = -400;
export { HURT_INVULN }; // re-exported: defined in player.js

// One entry per enemy kind: size, stomp rule, tuning, and `update` — the
// kind-specific brain, which sets e.vx/e.vy and may do extras (hopping,
// firing). Brains read their own tuning off `this` (the kind entry).
// Shared parts — stomp vs side-hit, arrow hits, pit death — live in this
// module, so a new kind gets them for free. Adding a kind: an entry here,
// a draw function in src/render/enemies.js, and (optionally) FX presets in
// src/effects.js.
const KINDS = {
  mage: {
    w: 42, h: 54,
    hp: 5, stompable: false,
    idleMin: 1.6, idleMax: 2.4, windupT: 0.7, staggerT: 0.25, flashT: 0.15, aggroRange: 500,
    hitSound: 'bossHit', deathSound: 'boss', deathFx: FX.mageDeath,
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
  const k = getKind(spec.kind) ?? KINDS[spec.kind];
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
  const k = getKind(e.kind) ?? KINDS[e.kind];
  if (e.hp <= 0) {
    e.dead = true;
    fx.play(k.deathSound ?? 'thwack');
    burst(e.x + e.w / 2, e.y + e.h / 2, k.deathFx ?? FX.enemyDeath);
  } else {
    fx.play(k.hitSound ?? 'thwack');
    if (k.onHit) k.onHit(e);
  }
}

// Enemy placement comes from the level data (lvl.roster).
export function createEnemies(lvl) {
  return (lvl.roster ?? []).map(spec => spawnEnemy(spec, lvl));
}

export function updateEnemies(enemies, p, lvl, cam, dt, fx) {
  const env = { p, lvl, cam, dt, fx };
  for (const e of enemies) {
    if (e.dead) continue;
    // method call so `this` is the kind entry (brains read tuning off it)
    (getKind(e.kind) ?? KINDS[e.kind]).update(e, env);
    if (e.y > lvl.height + 100) { e.dead = true; continue; } // fell into a pit
    hitPlayer(e, p, cam, fx);
  }
}

// Shared stomp vs side contact, applied to every kind.
function hitPlayer(e, p, cam, fx) {
  if (p.dead || p.invuln > 0) return;
  if (!(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y)) return;
  const stomp = p.vy > 0 && p.y + p.h - e.y < 16;
  if (stomp && (getKind(e.kind) ?? KINDS[e.kind]).stompable) {
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
