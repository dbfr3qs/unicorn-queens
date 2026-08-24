// The hidden key: a fixed world pickup in the level-3 alcove. Picking it
// up sets lvl.key.taken (HUD shows the icon); the same key later opens
// the troll-hall door (P5), where it is consumed.
// Also owns the marker brick's glint timer (an arrow hit flashes it).
import { burst } from './particles.js';
import { FX } from './effects.js';

export const MARKER_GLINT = 0.6; // how long an arrow-hit glint lingers (s)

export function updateKey(lvl, p, fx) {
  const key = lvl.key;
  if (!key || key.taken) return;
  if (!p.dead &&
      p.x < key.x + key.w && p.x + p.w > key.x &&
      p.y < key.y + key.h && p.y + p.h > key.y) {
    key.taken = true;
    fx.play('key');
    burst(key.x + key.w / 2, key.y + key.h / 2, FX.key);
  }
}
