// Rendering: world draw order. No state of its own — reads the game object.
// Passes: background (own parallax) -> camera-translated world pass
// (level + entities) -> HUD (screen space).
import { drawBackground } from './background.js';
import { drawHud } from './hud.js';
import { drawLevel } from './level.js';
import { drawPlayer } from './player.js';
import { drawEnemies } from './enemies.js';
import { drawLoot } from './loot.js';
import { drawArrows } from './arrows.js';
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
  drawBackground(ctx, level, camera, gameTime);
  ctx.save();
  ctx.translate(-Math.round(camera.x), 0);
  drawLevel(ctx, level);
  drawPlayer(ctx, player, gameTime);
  drawEnemies(ctx, enemies);
  drawLoot(ctx);
  drawArrows(ctx);
  drawParticles(ctx);
  ctx.restore();
  ctx.restore();
  drawHud(ctx, viewW, viewH);
}
