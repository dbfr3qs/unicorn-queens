// The three relics of the realm (level 5): pickup logic only. Picking one
// up sets lvl.relics[i].taken (+50 score, chime, sparkle burst). Also owns
// the bushes' rustleT decay. The arrow-through-the-bush reveal lives in
// arrows.js (it owns arrow-flight rules: stars rustle and keep flying,
// normal arrows are consumed — the box rule).
import { burst } from './particles.js';
import { FX } from './effects.js';
import { addScore } from './loot.js';

// The dialogue `when`s: how many relics the queen has so far.
export function relicsTaken(lvl) {
  return (lvl.relics ?? []).filter(r => r.taken).length;
}

export function updateRelics(lvl, p, dt, fx) {
  for (const b of lvl.bushes ?? []) {
    if (b.rustleT > 0) b.rustleT = Math.max(0, b.rustleT - dt);
  }
  for (const r of lvl.relics ?? []) {
    if (r.taken || !r.visible) continue;
    if (!p.dead &&
        p.x < r.x + r.w && p.x + p.w > r.x &&
        p.y < r.y + r.h && p.y + p.h > r.y) {
      r.taken = true;
      addScore(50);
      fx.play('relic');
      burst(r.x + r.w / 2, r.y + r.h / 2, FX.relic);
    }
  }
}
