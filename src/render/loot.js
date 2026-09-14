// Loot rendering: per-kind sprites via the loot-items registry.
//
// A generated icon is drawn when one exists for that kind, and the vector draw is the
// fallback until it decodes. The bob and the centre translate are kept either way, so
// pickups float identically; a kind with no sheet keeps its vector draw for good.
import { loot } from '../loot.js';
import { getItem } from '../loot-items/index.js';
import { drawSpriteCentre, scaleToHeight } from './sprite.js';

// Pickups are 16x16 boxes; drawing the icon at 20px keeps it readable without swamping
// the tile it sits on.
const ICON_PX = 20;

export function drawLoot(c) {
  for (const it of loot) {
    if (it.taken) continue;
    const bob = it.onGround ? Math.sin(it.t * 4) * 3 : 0;
    c.save();
    c.translate(it.x + it.w / 2, it.y + it.h / 2 + bob);
    if (!(drawSpriteCentre(c, it.kind, 0, scaleToHeight(it.kind, ICON_PX)))) {
      const def = getItem(it.kind);
      if (def?.draw) def.draw(c, it);
    }
    c.restore();
  }
}
