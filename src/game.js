// Game state + simulation step. Owns the top-level state objects.
import { LEVELS } from './levels/index.js';
import { burst, updateParticles, resetParticles } from './particles.js';
import { createCamera, updateCamera, shake } from './camera.js';
import { createPlayer, updatePlayer } from './player.js';
import { input } from './input.js';
import { isDialogueOpen, openDialogue, resetDialogue } from './dialogue.js';
import { createEnemies, updateEnemies, damageEnemy } from './enemies.js';
import { resetLoot, updateLoot } from './loot.js';
import { resetArrows, updateArrows } from './arrows.js';
import { resetFireballs, updateFireballs, resetBoulders, updateBoulders, resetShockwaves, updateShockwaves, resetCones, updateCones } from './projectiles.js';
import { updatePearl } from './pearl.js';
import { updateKey } from './key.js';
import { updateRelics } from './relics.js';
import { updateCell } from './cell.js';
import { updateDoor, resolveDoor } from './door.js';
import { updateShaft } from './shaft.js';
import { FX } from './effects.js';

export const game = {
  level: null, player: null, enemies: null,
  camera: createCamera(),
  levelIndex: 0,
  gateChimed: false, // one-shot gate chime per level entry
  lastTs: 0, running: false, gameTime: 0,
};

// prev: the outgoing player. big/bow carry only on an advance (level
// index changes); maxHp (heart cap) and hasFlight (witch's spell) are
// permanent for the run, so they survive death-restarts too.
// hp and position always reset.
export function startGame(viewH, levelIndex = 0, prev = null) {
  const advancing = !!prev && levelIndex !== game.levelIndex;
  game.levelIndex = levelIndex;
  game.level = LEVELS[levelIndex].make(viewH);
  game.player = createPlayer(game.level, {
    big: advancing ? !!prev.big : false,
    hasBow: advancing ? !!prev.hasBow : false,
    hasFlight: !!prev?.hasFlight, // flight spell: permanent for the run, like the heart cap
    maxHp: prev?.maxHp ?? 3,
  });
  game.enemies = createEnemies(game.level);
  resetLoot();
  resetArrows();
  resetFireballs();
  resetBoulders();
  resetCones();
  resetShockwaves();
  resetParticles();
  game.camera.x = 0;
  game.camera.shake = 0; // camera is a singleton: don't leak shake across restarts
  game.camera.mag = 0;
  game.gateChimed = false;
  game.dialogsFired = new Set(); // beat ids already spoken this run
  game.dialogsIn = new Set(); // dialog rects the player is standing in
  resetDialogue(); // a restart never leaves a box half-open
  game.lastTs = 0;
}

export function startLoop(onFrame, raf = globalThis.requestAnimationFrame) {
  if (game.running) return;
  game.running = true;
  const loop = ts => {
    raf(loop);
    if (!game.lastTs) { game.lastTs = ts; return; }
    const dt = Math.min((ts - game.lastTs) / 1000, 0.05); // clamp tab-switch gaps
    game.lastTs = ts;
    onFrame(dt);
  };
  raf(loop);
}

export function update(dt, viewW, fx) {
  if (isDialogueOpen()) return; // dialogue: the whole world is frozen, clock included
  game.gameTime += dt;
  updatePlayer(game.player, input, game.level, game.camera, dt, fx);
  resolveDoor(game.level, game.player); // locked/shut door: solid wall
  checkDialogs(fx); // a proximity beat may freeze us again next frame
  const gate = game.level.gate; // castle gate: one chime on first crossing
  if (gate && !game.gateChimed && game.player.x + game.player.w > gate.x + gate.w / 2) {
    game.gateChimed = true;
    fx.play('gate');
  }
  updateEnemies(game.enemies, game.player, game.level, game.camera, dt, fx);
  updatePearl(game.level, game.player, game.enemies, fx);
  updateKey(game.level, game.player, fx, dt);
  updateRelics(game.level, game.player, dt, fx); // level 5: the three relics
  updateCell(game.level, game.player, dt, fx);
  updateDoor(game.level, game.player, dt, fx);
  updateShaft(game.level, fx, dt); // pearl beat: gate retracts over the shaft
  if (game.level.marker && game.level.marker.glintT > 0) {
    game.level.marker.glintT = Math.max(0, game.level.marker.glintT - dt);
  }
  updateLoot(game.player, game.level, dt, fx, { onSunbeam: (p, l, f) => fireSunbeam(p, l, f, viewW) });
  if (game.level.sunbeamT > 0) game.level.sunbeamT = Math.max(0, game.level.sunbeamT - dt);
  updateArrows(game.enemies, game.level, game.camera, dt, fx, viewW);
  updateFireballs(game.player, game.level, game.camera, dt, fx, game.enemies);
  updateCones(game.player, game.level, game.camera, dt, fx);
  updateBoulders(game.player, game.level, game.camera, dt, fx);
  updateShockwaves(game.player, game.camera, dt, fx);
  updateParticles(dt);
  if (!game.player.dead && !game.player.won && reachedExit(game.player, game.level)) {
    game.player.won = true;
    fx.play('win');
    burst(game.player.x + game.player.w / 2, game.player.y, FX.win);
    shake(game.camera, 3, 0.25);
  }
  if (game.camera.shake > 0) {
    game.camera.shake = Math.max(0, game.camera.shake - dt);
    game.camera.mag = game.camera.shake > 0 ? game.camera.mag * Math.exp(-dt * 8) : 0;
  }
  if (!game.player.dead && !game.player.won) updateCamera(game.camera, game.player, game.level, viewW, dt);
}

// Proximity dialogue: each lvl.dialogs entry is a trigger rect with
// ordered beats. Beats fire on ENTRY of the rect (game.dialogsIn tracks
// who is standing in which rect), so a `repeat` beat re-fires on each
// approach while plain beats fire once per run (id in game.dialogsFired).
// A beat's `when(game)` gates it; the first eligible beat opens.
function checkDialogs(fx) {
  const dialogs = game.level.dialogs;
  if (!dialogs || isDialogueOpen() || game.player.dead || game.player.won) return;
  const p = game.player;
  for (const d of dialogs) {
    const inside = p.x < d.x + d.w && p.x + p.w > d.x && p.y < d.y + d.h && p.y + p.h > d.y;
    if (!inside) { game.dialogsIn.delete(d.id); continue; }
    if (game.dialogsIn.has(d.id)) continue; // already standing in it
    game.dialogsIn.add(d.id); // entry edge this frame
    const beat = d.beats.find(b => (b.repeat || !game.dialogsFired.has(b.id)) && (!b.when || b.when(game)));
    if (!beat) continue;
    if (!beat.repeat) game.dialogsFired.add(beat.id);
    openDialogue(beat.lines);
    fx.play('dialog');
    return; // one dialog per frame
  }
}

// Sunbeam pickup: every non-boss enemy visible in the viewport dies
// through the normal damage path (consistent sounds/FX), live fireballs
// clear, and a golden beam flashes across the screen (sunbeamT, decayed
// in update). Off-screen enemies are spared. The mage is exempt - he has
// his own hp and the arrows/shield phases.
export function fireSunbeam(p, lvl, fx, viewW = 800) {
  const cam = game.camera;
  for (const e of game.enemies) {
    if (e.dead || e.kind === 'mage' || e.kind === 'dragon') continue; // bosses are sunbeam-exempt
    if (e.x + e.w <= cam.x || e.x >= cam.x + viewW) continue; // off-screen: spared
    while (!e.dead) damageEnemy(e, fx);
  }
  resetFireballs();
  resetCones();
  lvl.sunbeamT = 0.4;
  shake(game.camera, 8, 0.4);
}

// Space on the end screen: advance to the next level on a win, restart on
// a loss (or on the final level's win).
export function restartTarget() {
  if (game.player.won && game.levelIndex + 1 < LEVELS.length) return game.levelIndex + 1;
  return game.levelIndex;
}

// Win check: the level.exit rect if the level has one (it may be locked
// until a seal breaks), else the level-1 style goal line.
export function reachedExit(p, lvl) {
  if (lvl.exit) {
    return !lvl.exit.locked &&
      p.x < lvl.exit.x + lvl.exit.w && p.x + p.w > lvl.exit.x &&
      p.y < lvl.exit.y + lvl.exit.h && p.y + p.h > lvl.exit.y;
  }
  return p.x + p.w >= lvl.goal.x;
}
