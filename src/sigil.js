// The Peak's sigil: it sleeps inside the ice block at 3090 until an arrow
// shatters the block (the arrow pass lives in arrows.js). Pickup = +50
// (the relic-chime path) and it opens the iron gate remotely — doors[0]
// enters 'opening' and, being STAYS_OPEN, never re-seals. The spire's
// only key, and the level's first "key".
import { burst } from './particles.js';
import { FX } from './effects.js';
import { addScore } from './loot.js';
import { DOOR_OPEN } from './door.js';

export function updateSigil(lvl, p, dt, fx) {
  const block = lvl.sigilBlock, sig = lvl.sigil;
  block.shatterT = Math.max(0, block.shatterT - dt);
  if (sig.visible && !sig.taken && !p.dead &&
      p.x < sig.x + sig.w && p.x + p.w > sig.x &&
      p.y < sig.y + sig.h && p.y + p.h > sig.y) {
    sig.taken = true;
    addScore(50);
    fx.play('relic');
    burst(sig.x + 8, sig.y + 8, FX.relic);
    const gate = lvl.doors[0]; // the iron gate, by index
    gate.state = 'opening';
    gate.openT = DOOR_OPEN;
    fx.play('seal'); fx.play('gate'); // the remote unlock, audible 500px off
    burst(gate.x + 20, gate.y + gate.h / 2, FX.relic);
  }
}
