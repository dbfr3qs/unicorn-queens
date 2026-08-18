// Loot: box drops (gem/bow/heart/grow), item physics, and pickup effects.
// Module-owned state: the loot list, score, and the one-time bow drop.
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { P_GRAVITY, P_TERM_VY, BIG_W, BIG_H } from './player.js';

export const loot = [];
export let score = 0;
export let bowGiven = false; // first box broken always drops the bow

export function resetLoot() {
  loot.length = 0;
  score = 0;
  bowGiven = false;
}

export function spawnLoot(box, rng = Math.random) {
  let kind;
  if (box.drop) kind = box.drop; // designated drop wins
  else if (!bowGiven) { kind = 'bow'; bowGiven = true; }
  else kind = rng() < 0.2 ? 'heart' : 'gem';
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
        burst(it.x + 8, it.y + 8, { count: 10, colors: ['#6fe3e1', '#c8fbfa', '#fff'], speed: 120, size: 3, grav: -100, life: 0.4 });
      } else if (it.kind === 'bow') {
        p.hasBow = true;
        fx.play('bow');
        burst(it.x + 8, it.y + 8, { count: 12, colors: ['#ffd75e', '#d9b380', '#fff'], speed: 130, size: 3, grav: -100, life: 0.45 });
      } else if (it.kind === 'grow') {
        if (!p.big) {
          p.big = true;
          p.x -= (BIG_W - p.w) / 2; // grow from the feet
          p.y -= (BIG_H - p.h);
          p.w = BIG_W; p.h = BIG_H;
        }
        fx.play('grow');
        burst(it.x + 8, it.y + 8, { count: 16, colors: ['#ffd75e', '#fff', '#ffe9b0'], speed: 150, size: 4, grav: -150, life: 0.5 });
      } else { // heart
        p.hp = Math.min(p.hp + 1, 3);
        fx.play('heart');
        burst(it.x + 8, it.y + 8, { count: 10, colors: ['#ff6f91', '#fff'], speed: 120, size: 3, grav: -100, life: 0.4 });
      }
    }
  }
}
