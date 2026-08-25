// Level registry: one entry per level, in play order.
// Each entry: { name, make(viewH) -> level data }.
import { createLevel } from './level.js';
import { createLevel2 } from './level2.js';
import { createLevel3 } from './level3.js';
import { createLevel4 } from './level4.js';

export const LEVELS = [
  { name: 'meadow', make: viewH => createLevel(viewH) },
  { name: 'bridge-castle', make: viewH => createLevel2(viewH) },
  { name: 'undercroft', make: viewH => createLevel3(viewH) },
  { name: 'dragons-layer', make: viewH => createLevel4(viewH) },
];
