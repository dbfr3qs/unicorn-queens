// Enemy rendering: per-kind sprites via the enemy kind registry, with a
// legacy map for kinds not yet migrated.
import { getKind } from '../enemies/index.js';

// Legacy sprite map — emptied as kinds move to src/enemies/<kind>.js.
// Deleted entirely in P5.
const DRAW = {};

export function drawEnemies(c, enemies) {
  for (const e of enemies) {
    if (e.dead) continue;
    const def = getKind(e.kind);
    if (def?.draw) def.draw(c, e);
    else DRAW[e.kind](c, e);
  }
}
