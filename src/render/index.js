// Rendering: world draw order. No state of its own — reads the game object.
// Passes: background (own parallax) -> level (own camera transform) ->
// camera-translated entity pass -> HUD (screen space).
import { drawBackground } from './background.js';
import { drawHud } from './hud.js';
import { drawLevel } from '../level.js';
import { drawPlayer } from '../player.js';
import { drawEnemies } from '../enemies.js';
import { drawLoot } from '../loot.js';
import { drawArrows } from '../arrows.js';
import { drawParticles } from '../particles.js';
import { game } from '../game.js';

export function draw(ctx, viewW, viewH) {
  const { level, player, enemies, camera, gameTime } = game;
  ctx.fillStyle = '#0d0815';
  ctx.fillRect(0, 0, viewW, viewH);
  const shx = camera.shake > 0 ? (Math.random() * 2 - 1) * camera.mag : 0;
  const shy = camera.shake > 0 ? (Math.random() * 2 - 1) * camera.mag : 0;
  ctx.save();
  ctx.translate(shx, shy); // screen shake wraps the world, not the HUD
  drawBackground(ctx, level, camera, gameTime);
  drawLevel(ctx, level, camera);
  ctx.save();
  ctx.translate(-Math.round(camera.x), 0);
  drawPlayer(ctx, player, gameTime);
  drawEnemies(ctx, enemies);
  drawLoot(ctx);
  drawArrows(ctx);
  drawParticles(ctx);
  ctx.restore();
  ctx.restore();
  drawHud(ctx, viewW, viewH);
}
