// Loot rendering: per-kind sprites via the loot-items registry.
import { loot } from '../loot.js';
import { getItem } from '../loot-items/index.js';

export function drawLoot(c) {
  for (const it of loot) {
    if (it.taken) continue;
    const bob = it.onGround ? Math.sin(it.t * 4) * 3 : 0;
    c.save();
    c.translate(it.x + it.w / 2, it.y + it.h / 2 + bob);
    const def = getItem(it.kind);
    if (def?.draw) def.draw(c, it);
    c.restore();
  }
}
