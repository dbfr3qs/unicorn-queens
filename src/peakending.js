// The Peak's ending (level 7, M7): the one-shot release sequence, fired
// on the wizard's death edge. The bound arena wraiths are freed (one
// `grant` for the lot), the King's cage door swings open over 1.2 s
// (`gate`), the war-pig stands up where the fight ended and walks off
// west (pig.js), and the rainbow lights (the `rainbow` — the game's
// first good chord — over the `seal` of the storm breaking). Exactly
// once per run (lvl.ending7.started); afterwards this only decays the
// cage swing and steps the pig.
import { updatePig } from './pig.js';

export function updatePeakEnding(lvl, enemies, dt, fx) {
  const wiz = enemies.find(e => e.kind === 'wizardboss');
  if (!lvl.ending7.started && wiz && wiz.dead) {
    lvl.ending7.started = true;
    for (const e of enemies) { // the bound wraiths release
      if (e.kind === 'wraith' && e.bound && !e.freed) { e.freed = true; e.freeT = 0; }
    }
    fx.play('grant');
    lvl.cage.open = true;
    lvl.cage.openT = 1.2;
    fx.play('gate');
    lvl.pig = { x: wiz.x, y: lvl.groundY, state: 'stand', t: 0.5, w: 64, h: 48 };
    lvl.exit.locked = false; // the rainbow lights
    fx.play('rainbow');
    fx.play('seal');
  }
  lvl.cage.openT = Math.max(0, lvl.cage.openT - dt);
  updatePig(lvl, dt, fx);
}
