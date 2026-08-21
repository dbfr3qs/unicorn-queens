// Enemy rendering: per-kind sprites, dispatched through the enemy kind
// registry (each kind owns its own draw in src/enemies/<kind>.js).
import { getKind } from '../enemies/index.js';

export function drawEnemies(c, enemies) {
  for (const e of enemies) {
    if (e.dead) continue;
    getKind(e.kind).draw(c, e);
  }
}
