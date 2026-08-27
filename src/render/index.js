// Rendering: world draw order. No state of its own — reads the game object.
// Passes: background (own parallax) -> camera-translated world pass
// (level + entities) -> HUD (screen space).
import { drawBackground } from './background.js';
import { drawHud } from './hud.js';
import { drawDialogue } from './dialogue.js';
import { drawZones } from './zones.js';
import { drawLevel } from './level.js';
import { drawForest } from './forest.js';
import { drawRelics, drawBushes } from './relics.js';
import { drawPearl } from './pearl.js';
import { drawKey, drawMarker, drawNook } from './key.js';
import { drawCell } from './cell.js';
import { drawDoor } from './door.js';
import { drawShaft } from './shaft.js';
import { drawMistgate } from './mistgate.js';
import { drawPlayer } from './player.js';
import { drawQueen } from './queen.js';
import { drawEnemies } from './enemies.js';
import { drawLoot } from './loot.js';
import { drawArrows } from './arrows.js';
import { drawFireballs, drawBoulders, drawShockwaves, drawCones } from './projectiles.js';
import { drawParticles } from './particles.js';
import { game } from '../game.js';
import { palette } from './theme.js';

export function draw(ctx, viewW, viewH) {
  const { level, player, enemies, camera, gameTime } = game;
  ctx.fillStyle = palette.clear;
  ctx.fillRect(0, 0, viewW, viewH);
  const shx = camera.shake > 0 ? (Math.random() * 2 - 1) * camera.mag : 0;
  const shy = camera.shake > 0 ? (Math.random() * 2 - 1) * camera.mag : 0;
  ctx.save();
  ctx.translate(shx, shy); // screen shake wraps the world, not the HUD
  if (level.zones) drawZones(ctx, level, camera, gameTime, viewW);
  else drawBackground(ctx, level, camera, gameTime);
  ctx.save();
  ctx.translate(-Math.round(camera.x), 0);
  drawNook(ctx, level, gameTime); // key nook: wall section / recess, behind platforms
  drawLevel(ctx, level, gameTime);
  drawForest(ctx, level, gameTime); // level 5: trees, hollow tree, flowers, reeds
  drawRelics(ctx, level, gameTime); // level 5: relics + the hiding bush
  drawBushes(ctx, level, gameTime);
  drawKey(ctx, level, gameTime);
  drawMarker(ctx, level, gameTime);
  drawCell(ctx, level);
  drawDoor(ctx, level, gameTime);
  drawShaft(ctx, level, gameTime); // ceiling hole: sealed gate (K2: light shaft)
  drawMistgate(ctx, level, gameTime); // level 5: the mist gate at the east edge
  drawPearl(ctx, level, gameTime);
  drawPlayer(ctx, player, gameTime);
  drawQueen(ctx, level, gameTime); // level 5: foreground — the player walks to her
  drawEnemies(ctx, enemies);
  drawLoot(ctx);
  drawArrows(ctx);
  drawFireballs(ctx);
  drawCones(ctx);
  drawBoulders(ctx);
  drawShockwaves(ctx);
  drawParticles(ctx);
  ctx.restore();
  ctx.restore();
  if (level.sunbeamT > 0) { // sunbeam flash: golden light over the screen
    const a = level.sunbeamT / 0.4;
    ctx.globalAlpha = a * 0.35;
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.globalAlpha = a * 0.3; // brighter core column
    ctx.fillRect(viewW / 2 - 70, 0, 140, viewH);
    ctx.globalAlpha = 1;
  }
  drawHud(ctx, viewW, viewH);
  drawDialogue(ctx, viewW, viewH);
}
