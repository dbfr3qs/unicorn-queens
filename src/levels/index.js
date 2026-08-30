// Level registry: one entry per level, in play order.
// Each entry: { name, make(viewH) -> level data }.
// carry: the gear a run holds on entry — used only by a fresh boot at
// this level (the ?level=N test jump); normal play advances with a prev
// player and keeps the existing drop-bow/advance rules.
// Level 1 has none; level 2's bow is its own startItems.
import { createLevel } from './level.js';
import { createLevel2 } from './level2.js';
import { createLevel3 } from './level3.js';
import { createLevel4 } from './level4.js';
import { createLevel5 } from './level5.js';
import { createLevel6 } from './level6.js';
import { createLevel7 } from './level7.js';

export const LEVELS = [
  { name: 'meadow', make: viewH => createLevel(viewH) },
  { name: 'bridge-castle', make: viewH => createLevel2(viewH) },
  { name: 'undercroft', make: viewH => createLevel3(viewH), carry: { hasBow: true } },
  { name: 'dragons-layer', make: viewH => createLevel4(viewH), carry: { hasBow: true, hasFlight: true } },
  { name: 'enchanted-forest', make: viewH => createLevel5(viewH), carry: { hasBow: true, hasFlight: true } },
  { name: 'blackmire', make: viewH => createLevel6(viewH), carry: { hasBow: true, hasFlight: true } },
  { name: 'peak', make: viewH => createLevel7(viewH), carry: { hasBow: true, hasFlight: true } },
];

// ?level=N (1-based) in the URL boots straight into that level for testing.
// Missing, non-numeric, or out of 1..LEVELS.length falls back to level 1.
export function levelIndexFromSearch(search = '') {
  const n = Number(new URLSearchParams(search).get('level'));
  return Number.isInteger(n) && n >= 1 && n <= LEVELS.length ? n - 1 : 0;
}
