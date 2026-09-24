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
import { difficulty, difficultyName, scaleBossHp } from './difficulty.js';
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
import './enemies/hare.js';
import './enemies/wraith.js';
import './enemies/wizardboss.js';
import './enemies/sentinel.js'; // level 8: the citadel's clockwork guardians
import './enemies/moth.js'; // level 8: the clockwork moths
import './enemies/warden.js'; // level 8 boss: the citadel's keeper
import './enemies/sprite.js'; // level 9: the frost sprites
import './enemies/golem.js'; // level 9: the glacier golems
import './enemies/queenboss.js'; // level 9 boss: the Frost Queen

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
    // a roster `band: [a, b]` is shorthand for the patrol minX/maxX
    minX: spec.minX ?? spec.band?.[0] ?? 0,
    maxX: spec.maxX ?? spec.band?.[1] ?? lvl.width,
    dir: spec.dir ?? -1,
    hp: spawnHp(k),
    maxHp: spawnHp(k), // what it spawned with: the boss phase edges and pips scale from it
    dead: false,
    sleeping: spec.sleeping ?? false, // the elder adder's coil (enemies.js guard)
    bound: spec.bound ?? false, // the level 7 arena wraiths (always solid)
  };
}

// A boss's poise: after a stagger, POISE s in which hits still land (and
// flash) but don't stagger it again. Without it the bow (FIRE_CD 0.22 s)
// out-paces the 0.3 s stagger, and held fire locks a boss out of ever
// attacking. The Frost Queen has her own (staggerCd) and no stagger state;
// a kind's `poise` overrides the 2 s (the mage: 0 — he dodges instead).
export const POISE = 2;

// Shared one-point damage (arrows and friends): -1 hp, per-kind hit
// reaction (onHit), death at 0 with per-kind sound, burst and optional
// onDeath hook (the troll uses it for the death shake).
export function damageEnemy(e, fx, cam, mult = 1, lvl) {
  e.hp -= mult;
  const k = getKind(e.kind);
  if (e.hp <= 0) {
    e.dead = true;
    if (k.onZero) {
      k.onZero(e, fx, cam, lvl); // level 8 Warden: a rest, not a kill
    } else {
      fx.play(k.deathSound ?? 'thwack');
      burst(e.x + e.w / 2, e.y + e.h / 2, k.deathFx ?? FX.enemyDeath);
      if (k.onDeath) k.onDeath(e, fx, cam);
    }
  } else {
    fx.play(k.hitSound ?? 'thwack');
    if (k.boss && e.poiseT > 0) e.flash = Math.max(e.flash ?? 0, 0.15); // poised: it hurts, it doesn't stop him
    else if (k.onHit) {
      k.onHit(e);
      if (k.boss && e.state === 'stagger') e.poiseT = k.poise ?? POISE;
    }
  }
}

// Enemy placement comes from the level data (lvl.roster).
export function createEnemies(lvl) {
  // a roster entry's `only: ['hard']` (or ['medium', 'hard']) keeps it off the easier presets
  return (lvl.roster ?? []).filter(spec => !spec.only || spec.only.includes(difficultyName())).map(spec => spawnEnemy(spec, lvl));
}

export function updateEnemies(enemies, p, lvl, cam, dt, fx) {
  const env = { p, lvl, cam, dt, fx };
  for (const e of enemies) {
    if (e.dead) continue;
    // method call so `this` is the kind entry (brains read tuning off it)
    const k = getKind(e.kind);
    if (e.poiseT > 0) e.poiseT -= dt;
    const tell = k.isTell?.(e) ? difficulty().bossTell : 1; // a boss's wind-up runs slow on the easier presets
    k.update(e, tell === 1 ? env : { ...env, dt: dt / tell });
    if (e.y > lvl.height + 100) { e.dead = true; continue; } // fell into a pit
    hitPlayer(e, p, cam, fx);
  }
}

// A boss's hp is the preset's share of its design; everyone else's is as written.
function spawnHp(k) {
  return k.boss ? scaleBossHp(k.hp, k.hpStep) : (k.hp ?? 1);
}

// Shared stomp vs side contact, applied to every kind.
function hitPlayer(e, p, cam, fx) {
  if (e.sleeping || e.freed) return; // a coiled adder / a freed spirit is harmless (no stomp either)
  if (p.dead || p.invuln > 0) return;
  if (!(p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y)) return;
  const stomp = p.vy > 0 && p.y + p.h - e.y < 16;
  const k = getKind(e.kind);
  if (stomp && k.stompable) {
    e.dead = true;   // stomped
    p.vy = E_STOMP_V; // bounce
    p.cuttable = false;
    fx.play('stomp');
    if (k.stompSound) fx.play(k.stompSound); // the hare: a soft puff over the stomp
    burst(e.x + e.w / 2, e.y + e.h / 2, k.stompFx ?? FX.enemyDeath);
    shake(cam, 5, 0.18);
  } else if (stomp) {
    p.vy = E_STOMP_V; // bounced off an unstompable enemy (ghost)
  } else {
    hurtPlayer(p, cam, fx);
  }
}
