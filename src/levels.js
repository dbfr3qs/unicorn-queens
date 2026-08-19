// Level registry: one entry per level, in play order.
// Each entry: { name, make(viewH) -> level data }.
import { createLevel } from './level.js';

export const LEVELS = [
  { name: 'meadow', make: viewH => createLevel(viewH) },
];
