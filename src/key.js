// The hidden key: a fixed world pickup in the level-3 nook. Picking it
// up sets lvl.key.taken (HUD shows the icon); the same key later opens
// the troll-hall door (P5), where it is consumed.
// Also owns the nook's crumble state (the marker brick is the weak point)
// and the marker's glint timer (an arrow hit flashes it).
import { burst } from './particles.js';
import { FX } from './effects.js';

export const MARKER_GLINT = 0.6; // how long an arrow-hit glint lingers (s)
export const MARKER_HITS = 3; // arrow hits to crumble the wall over the nook
export const CRUMBLE_T = 0.5; // how long the crumble takes (s)
export const REVEAL_T = 0.9; // and how long the recess takes to open out of the dust (s)

export function updateKey(lvl, p, fx, dt = 0) {
  const nook = lvl.keyNook;
  if (nook && !nook.revealed && nook.crumbleT > 0) {
    nook.crumbleT = Math.max(0, nook.crumbleT - dt);
    if (nook.crumbleT === 0) { // the wall section falls in: the nook is open
      nook.revealed = true;
      // The recess is open in the model from this instant — the ledge is
      // solid, the key is pickable — but it takes REVEAL_T to become visible.
      // The render reads this down-counter; nothing else does.
      nook.revealT = REVEAL_T;
      for (const s of lvl.platforms) if (s.hidden) s.hidden = false;
      const m = lvl.marker; // debris out of the wall, key light leaking through
      if (m) {
        fx.play('crumble');
        burst(m.x + m.w / 2, m.y - 40, FX.nookCrumble);
      }
    }
  } else if (nook && nook.revealT > 0) {
    nook.revealT = Math.max(0, nook.revealT - dt);
  }
  const key = lvl.key;
  if (!key || key.taken) return;
  if (nook && !nook.revealed) return; // hidden in the wall: not pickable yet
  if (!p.dead &&
      p.x < key.x + key.w && p.x + p.w > key.x &&
      p.y < key.y + key.h && p.y + p.h > key.y) {
    key.taken = true;
    fx.play('key');
    burst(key.x + key.w / 2, key.y + key.h / 2, FX.key);
  }
}
