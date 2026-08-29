// Enemies: shared spawning, stomp vs side-contact, and arrow damage.
// Per-kind brains and sprites live in src/enemies/<kind>.js, each
// self-registering into the registry (src/enemies/index.js). Adding a kind:
// a new file there, imported below for its registration side effect, and
// (optionally) FX presets in src/effects.js.
import { burst } from './particles.js';
import { shake } from './camera.js';
import { HURT_INVULN, hurtPlayer } from './player.js';
import { FX } from './effects.js';
import { getKind } from './enemies/index.js';
// each kind import self-registers into the enemy kind registry
import './enemies/slime.js';
import './enemies/zombie.js';
import './enemies/ghost.js';
import './enemies/bat.js';
import './enemies/bee.js';
import './enemies/mage.js';
import './enemies/troll.js';
import './enemies/dragon.js';
import './enemies/snake.js';
import './enemies/spider.js';
import './enemies/spiderboss.js';

export { E_W, E_H } from './enemies/slime.js'; // owned by slime; re-exported for tests
export const E_STOMP_V = -400;
export { HURT_INVULN }; // re-exported: defined in player.js

export function spawnEnemy(spec, lvl) {
  const k = getKind(spec.kind);
  return {
    kind: spec.kind,
    x: spec.x, y: spec.y ?? lvl.groundY - k.h, w: k.w, h: k.h,
    // the web anchor (spiders hang from {x, y}; unused by other kinds)
    anchorX: spec.x,
    anchorY: spec.y ?? lvl.groundY - k.h,
    vx: 0, vy: 0, onGround: false,
    minX: spec.minX ?? 0,
    maxX: spec.maxX ?? lvl.width,
    dir: spec.dir ?? -1,
    hp: k.hp ?? 1,
    dead: false,
    sleeping: spec.sleeping ?? false, // the elder adder's coil (enemies.js guard)
  };
}

// Shared one-point damage (arrows and friends): -1 hp, per-kind hit
// reaction (onHit), death at 0 with per-kind sound, burst and optional
// onDeath hook (the troll uses it for the death shake).
export function damageEnemy(e, fx, cam) {
  e.hp -= 1;
  const k = getKind(e.kind);
  if (e.hp <= 0) {
    e.dead = true;
    fx.play(k.deathSound ?? 'thwack');
    burst(e.x + e.w / 2, e.y + e.h / 2, k.deathFx ?? FX.enemyDeath);
    if (k.onDeath) k.onDeath(e, fx, cam);
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
    getKind(e.kind).update(e, env);
    if (e.y > lvl.height + 100) { e.dead = true; continue; } // fell into a pit
    hitPlayer(e, p, cam, fx);
  }
}

// Shared stomp vs side contact, applied to every kind.
function hitPlayer(e, p, cam, fx) {
  if (e.sleeping) return; // a coiled adder is harmless (no stomp either)
  if (p.dead || p.invuln > 0) return;
  if (!(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y)) return;
  const stomp = p.vy > 0 && p.y + p.h - e.y < 16;
  if (stomp && getKind(e.kind).stompable) {
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
