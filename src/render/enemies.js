// Enemy rendering: per-kind sprites, dispatched through the enemy kind
// registry (each kind owns its own draw in src/enemies/<kind>.js).
//
// A generated sheet is drawn when one exists for that kind and has decoded; otherwise
// the kind's own draw runs. Every kind's draw() already translates to the middle of its
// box and flips with
// c.scale(e.dir, 1), so the swap happens here rather than in seventeen separate files.
import { getKind } from '../enemies/index.js';
import { spriteReady } from '../sprites.js';
import { drawSpriteFeet, scaleToHeight } from './sprite.js';

// Generated art overhangs its collision box, the way platformer sprites usually do: the
// player's 96px cell draws 52px tall over a 36px box, so 1.45. Enemies use the same ratio
// so they sit consistently beside it.
const OVERHANG = 1.45;

export function drawEnemies(c, enemies) {
  for (const e of enemies) {
    // A scripted death still has a body to show: the Frost Queen is `dead` to
    // the damage path the instant the last arrow lands, but her six seconds of
    // coming apart are the whole point of ending it that way.
    if (e.dead && !e.dying) continue;
    if (spriteReady(e.kind)) {
      c.save();
      // the BOTTOM of the box, not its middle: an enemy scaled past its box must grow
      // upward, or its feet sink through the platform it is standing on
      c.translate(e.x + e.w / 2, e.y + e.h);
      c.scale(e.dir || 1, 1);
      const drew = drawSpriteFeet(c, e.kind, 0, scaleToHeight(e.kind, e.h * OVERHANG));
      c.restore();
      if (drew) continue;
    }
    getKind(e.kind).draw(c, e);
  }
}
