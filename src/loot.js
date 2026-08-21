// Loot: box drops (gem/bow/heart/grow), item physics, and pickup effects.
// Module-owned state: the loot list, score, and the one-time bow drop.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { P_GRAVITY, P_TERM_VY } from './player.js';
import { FX } from './effects.js';
import { getItem } from './loot-items/index.js';
// item imports double as registration; weighted kinds first, in drop-table
// order, so the registry's insertion order IS the table order (see P6)
import './loot-items/heart.js';
import './loot-items/boots.js';
import './loot-items/magnet.js';
import './loot-items/lantern.js';
import './loot-items/bow.js';
import './loot-items/grow.js';
import './loot-items/gem.js'; // self-registers into the loot-items registry

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
  ['hops', 0.41],
  ['gem', 1.0],
];

function rollDrop(rng) {
  const r = rng();
  for (const [kind, w] of DROP_TABLE) if (r < w) return kind;
  return 'gem';
}

export { MYSTERY_BOOTS } from './loot-items/boots.js'; // re-export for existing imports

// Mystery box payload, hidden until broken: 40% heart, 25% three-gem
// fountain, 25% short boots, 10% dud. Uses the same rng as the regular
// table, so a seeded run is reproducible. Returns the kind (null = dud).
function spawnMystery(box, rng) {
  const r = rng();
  const x = box.x + box.w / 2 - 8, y = box.y - 4;
  const mk = (kind, vx, vy, short = false) => {
    loot.push({ x, y, w: 16, h: 16, vx, vy, onGround: false, kind, short, taken: false, t: 0 });
  };
  if (r < 0.40) { mk('heart', 0, -350); return 'heart'; }
  if (r < 0.65) { // three-gem fountain: spread velocities
    mk('gem', -80, -380); mk('gem', 0, -430); mk('gem', 80, -380);
    return 'gem';
  }
  if (r < 0.90) { mk('boots', 0, -350, true); return 'boots'; }
  return null; // dud
}

// Returns the dropped kind (null for a mystery dud) so the caller can
// play the fizzle.
export function spawnLoot(box, rng = Math.random) {
  if (box.mystery) return spawnMystery(box, rng);
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
  return kind;
}

// hooks.onSunbeam: wired by game.js to the screen-clear; loot.js stays
// decoupled from the enemy list. Absent in unit tests - safe to omit.
export function updateLoot(p, lvl, dt, fx, hooks = {}) {
  for (const it of loot) {
    if (it.taken) continue;
    it.t += dt;
    const def = getItem(it.kind);
    // def.update may move the item itself (gem + magnet); otherwise the
    // default gravity/ground pass applies.
    if (!def?.update?.(it, p, lvl, dt) && !it.onGround) {
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
      if (def?.onPickup) {
        // registry item: onPickup returns the score delta
        score += def.onPickup(it, p, lvl, fx, hooks) || 0;
      } else if (it.kind === 'sunbeam') {
        fx.play('sunbeam');
        burst(it.x + 8, it.y + 8, FX.sunbeam);
        if (hooks.onSunbeam) hooks.onSunbeam(p, lvl, fx); // screen clear
      } else if (it.kind === 'star') {
        p.stars = Math.min(10, p.stars + 5);
        fx.play('star');
        burst(it.x + 8, it.y + 8, FX.star);
      } else if (it.kind === 'shield') {
        p.shield = Math.min(3, p.shield + 3);
        fx.play('reflect');
        burst(it.x + 8, it.y + 8, FX.reflect);
      } else if (it.kind === 'hops') {
        p.hops = Math.min(3, p.hops + 3);
        fx.play('hop');
        burst(it.x + 8, it.y + 8, FX.hopPuff);
      } else if (it.kind === 'heartcap') {
        if (p.maxHp < 4) {
          p.maxHp = 4; // permanent for the run
          fx.play('heartcap');
        } else {
          score += 1; // already capped: pays out like a gem
          fx.play('gem');
        }
        burst(it.x + 8, it.y + 8, FX.heart);
      }
    }
  }
}
