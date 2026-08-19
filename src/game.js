// Game state + simulation step. Owns the top-level state objects.
import { LEVELS } from './levels.js';
import { burst, updateParticles, resetParticles } from './particles.js';
import { createCamera, updateCamera, shake } from './camera.js';
import { createPlayer, updatePlayer } from './player.js';
import { input } from './input.js';
import { createEnemies, updateEnemies } from './enemies.js';
import { resetLoot, updateLoot } from './loot.js';
import { resetArrows, updateArrows } from './arrows.js';
import { resetFireballs, updateFireballs } from './projectiles.js';
import { updatePearl } from './pearl.js';
import { FX } from './effects.js';

export const game = {
  level: null, player: null, enemies: null,
  camera: createCamera(),
  levelIndex: 0,
  lastTs: 0, running: false, gameTime: 0,
};

export function startGame(viewH, levelIndex = 0) {
  game.levelIndex = levelIndex;
  game.level = LEVELS[levelIndex].make(viewH);
  game.player = createPlayer(game.level);
  game.enemies = createEnemies(game.level);
  resetLoot();
  resetArrows();
  resetFireballs();
  resetParticles();
  game.camera.x = 0;
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
  game.gameTime += dt;
  updatePlayer(game.player, input, game.level, game.camera, dt, fx);
  updateEnemies(game.enemies, game.player, game.level, game.camera, dt, fx);
  updatePearl(game.level, game.player, game.enemies, fx);
  updateLoot(game.player, game.level, dt, fx);
  updateArrows(game.enemies, game.level, game.camera, dt, fx);
  updateFireballs(game.player, game.level, game.camera, dt, fx);
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

// R on the end screen: advance to the next level on a win, restart on a
// loss (or on the final level's win).
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
