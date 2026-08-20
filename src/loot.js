// Loot: box drops (gem/bow/heart/grow), item physics, and pickup effects.
// Module-owned state: the loot list, score, and the one-time bow drop.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { P_GRAVITY, P_TERM_VY, BIG_W, BIG_H, BOOTS_TIME, MAGNET_TIME } from './player.js';
import { FX } from './effects.js';

export const loot = [];
export let score = 0;
export let bowGiven = false; // first box broken always drops the bow

export function resetLoot() {
  loot.length = 0;
  score = 0;
  bowGiven = false;
}

// Random drop table (after the one-time bow): [kind, cumulative weight].
const DROP_TABLE = [
  ['heart', 0.20],
  ['boots', 0.25],
  ['magnet', 0.30],
  ['sunbeam', 0.33],
  ['star', 0.37],
  ['gem', 1.0],
];

const MAGNET_ACC = 900, MAGNET_SPEED = 320; // gem steering toward the player
function rollDrop(rng) {
  const r = rng();
  for (const [kind, w] of DROP_TABLE) if (r < w) return kind;
  return 'gem';
}

export function spawnLoot(box, rng = Math.random) {
  let kind;
  if (box.drop) kind = box.drop; // designated drop wins
  else if (!bowGiven) { kind = 'bow'; bowGiven = true; }
  else kind = rollDrop(rng);
  loot.push({
    x: box.x + box.w / 2 - 8, y: box.y - 4, w: 16, h: 16,
    vx: (rng() - 0.5) * 80, vy: -350,
    onGround: false,
    kind,
    taken: false, t: 0,
  });
}

// hooks.onSunbeam: wired by game.js to the screen-clear; loot.js stays
// decoupled from the enemy list. Absent in unit tests - safe to omit.
export function updateLoot(p, lvl, dt, fx, hooks = {}) {
  for (const it of loot) {
    if (it.taken) continue;
    it.t += dt;
    if (!p.dead && it.kind === 'gem' && p.magnet > 0) {
      // magnet: gems fly to the player (accelerate, capped speed)
      it.onGround = false; // a flying gem is no longer resting
      const dx = (p.x + p.w / 2) - (it.x + it.w / 2);
      const dy = (p.y + p.h / 2) - (it.y + it.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      it.vx += (dx / d) * MAGNET_ACC * dt;
      it.vy += (dy / d) * MAGNET_ACC * dt;
      const sp = Math.hypot(it.vx, it.vy);
      if (sp > MAGNET_SPEED) { it.vx *= MAGNET_SPEED / sp; it.vy *= MAGNET_SPEED / sp; }
      it.x += it.vx * dt;
      it.y += it.vy * dt;
    } else if (!it.onGround) {
      it.vy = Math.min(it.vy + P_GRAVITY * dt, P_TERM_VY);
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.x = Math.max(0, Math.min(it.x, lvl.width - it.w));
      resolveGroundCollision(it, lvl, dt);
    }
    if (!p.dead &&
        p.x < it.x + it.w && p.x + p.w > it.x &&
        p.y < it.y + it.h && p.y + p.h > it.y) {
      it.taken = true;
      if (it.kind === 'gem') {
        score += 1;
        fx.play('gem');
        burst(it.x + 8, it.y + 8, FX.gem);
      } else if (it.kind === 'bow') {
        p.hasBow = true;
        fx.play('bow');
        burst(it.x + 8, it.y + 8, FX.bow);
      } else if (it.kind === 'grow') {
        if (!p.big) {
          p.big = true;
          p.x -= (BIG_W - p.w) / 2; // grow from the feet
          p.y -= (BIG_H - p.h);
          p.w = BIG_W; p.h = BIG_H;
        }
        fx.play('grow');
        burst(it.x + 8, it.y + 8, FX.grow);
      } else if (it.kind === 'boots') {
        p.boots = BOOTS_TIME;
        fx.play('boots');
        burst(it.x + 8, it.y + 8, FX.boots);
      } else if (it.kind === 'magnet') {
        p.magnet = MAGNET_TIME;
        fx.play('magnet');
        burst(it.x + 8, it.y + 8, FX.magnet);
      } else if (it.kind === 'sunbeam') {
        fx.play('sunbeam');
        burst(it.x + 8, it.y + 8, FX.sunbeam);
        if (hooks.onSunbeam) hooks.onSunbeam(p, lvl, fx); // screen clear
      } else if (it.kind === 'star') {
        p.stars = Math.min(10, p.stars + 5);
        fx.play('star');
        burst(it.x + 8, it.y + 8, FX.star);
      } else if (it.kind === 'heartcap') {
        if (p.maxHp < 4) {
          p.maxHp = 4; // permanent for the run
          fx.play('heartcap');
        } else {
          score += 1; // already capped: pays out like a gem
          fx.play('gem');
        }
        burst(it.x + 8, it.y + 8, FX.heart);
      } else { // heart
        p.hp = Math.min(p.hp + 1, p.maxHp);
        fx.play('heart');
        burst(it.x + 8, it.y + 8, FX.heart);
      }
    }
  }
}
