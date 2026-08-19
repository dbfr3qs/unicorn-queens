// Loot: box drops (gem/bow/heart/grow), item physics, and pickup effects.
// Module-owned state: the loot list, score, and the one-time bow drop.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { P_GRAVITY, P_TERM_VY, BIG_W, BIG_H, BOOTS_TIME } from './player.js';
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
  ['gem', 1.0],
];
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

export function updateLoot(p, lvl, dt, fx) {
  for (const it of loot) {
    if (it.taken) continue;
    it.t += dt;
    if (!it.onGround) {
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
      } else { // heart
        p.hp = Math.min(p.hp + 1, 3);
        fx.play('heart');
        burst(it.x + 8, it.y + 8, FX.heart);
      }
    }
  }
}
