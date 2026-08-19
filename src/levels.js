// Level registry: one entry per level, in play order.
// Each entry: { name, make(viewH) -> level data }.
import { createLevel } from './level.js';
import { createLevel2 } from './level2.js';

export const LEVELS = [
  { name: 'meadow', make: viewH => createLevel(viewH) },
  { name: 'bridge-castle', make: viewH => createLevel2(viewH) },
];
