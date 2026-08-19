// The pearl: appears when its showWhen condition is met (level 2: the
// mage is dead); picking it up unlocks the level's exit (breaks the seal).
import { burst } from './particles.js';
import { FX } from './effects.js';

export function updatePearl(lvl, p, enemies, fx) {
  const pearl = lvl.pearl;
  if (!pearl || pearl.taken) return;
  if (!pearl.visible) {
    if (!pearl.showWhen || pearl.showWhen(enemies)) pearl.visible = true;
    return;
  }
  if (!p.dead &&
      p.x < pearl.x + pearl.w && p.x + p.w > pearl.x &&
      p.y < pearl.y + pearl.h && p.y + p.h > pearl.y) {
    pearl.taken = true;
    fx.play('pearl');
    burst(pearl.x + pearl.w / 2, pearl.y + pearl.h / 2, FX.gem);
    if (lvl.exit && lvl.exit.locked) { // break the seal
      lvl.exit.locked = false;
      fx.play('seal');
      burst(lvl.exit.x + lvl.exit.w / 2, lvl.exit.y + lvl.exit.h / 2, FX.gem);
    }
  }
}
