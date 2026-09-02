// The mainsprings (level 8): three wound brass coils that keep the Great
// Clock beating. Sever one — walk into it, or loose a single arrow — and the
// citadel winds down a notch: +50, the period stretches, the gears slow, the
// light dims, the chime flattens. The cuts count is a pure read (clockCuts);
// the period is the one thing a cut writes (it lengthens mid-cycle, t keeps
// running). The third cut grinds the gear door open (wired in M5).
import { addScore } from './loot.js';
import { burst } from './particles.js';
import { FX } from './effects.js';
import { periodFor, clockCuts } from './clock.js';

export function cuts(lvl) { return clockCuts(lvl); }

// Touch-sever: the player walks into an uncut spring and it snaps free.
// (Arrow-sever lives in arrows.js — one arrow, consumed unless a star.)
export function updateSprings(lvl, p, dt, fx) {
  for (const s of lvl.springs ?? []) {
    if (s.cut) continue;
    if (p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y) {
      cutSpring(lvl, s, fx);
    }
  }
}

export function cutSpring(lvl, s, fx) {
  if (s.cut) return; // idempotent: touch + arrow can land the same frame
  s.cut = true;
  const n = cuts(lvl);
  lvl.clock.period = periodFor(n); // the period lengthens NOW (mid-cycle, t runs on)
  addScore(50);
  fx.play('spring');
  fx.play('relic');
  burst(s.x + s.w / 2, s.y + s.h / 2, FX.springUnspool);
  if (n >= 3) { // the third mainspring: the gear door grinds open (stays open)
    const d = lvl.doors.find(d => d.kind === 'geardoor');
    if (d && d.state === 'locked') {
      d.state = 'opening'; d.openT = 1.2; // the world pass reads the retraction
      fx.play('seal'); fx.play('clank');
    }
  }
}
