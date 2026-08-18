// Rendering: world draw order + HUD. No state of its own — reads the game object.
import { drawBackground } from './background.js';
import { drawLevel } from './level.js';
import { drawPlayer } from './player.js';
import { drawEnemies } from './enemies.js';
import { drawLoot, score } from './loot.js';
import { drawArrows } from './arrows.js';
import { drawParticles } from './particles.js';
import { game } from './game.js';
import { muted } from './audio.js';

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

export function drawHud(ctx, viewW, viewH) {
  const { player } = game;
  ctx.save();
  ctx.font = '18px monospace';
  ctx.textBaseline = 'top';
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < player.hp ? '#ff6f91' : '#33234f';
    ctx.fillText('\u2665', 12 + i * 22, 10); // heart
  }
  ctx.fillStyle = '#6fe3e1';
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + score, viewW - 12, 10);
  ctx.restore();
  if (player.dead || player.won) {
    ctx.save();
    ctx.fillStyle = 'rgba(13, 8, 21, 0.7)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = player.won ? '#ffd75e' : '#fff5fa';
    ctx.textAlign = 'center';
    ctx.font = '28px monospace';
    ctx.fillText(player.won ? 'LEVEL CLEAR!' : 'GAME OVER', viewW / 2, viewH / 2 - 24);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#cbb8ff';
    ctx.fillText(player.won ? 'score ' + score + ' - press R to play again' : 'press R to try again', viewW / 2, viewH / 2 + 12);
    ctx.restore();
  }
  ctx.save();
  ctx.font = '12px monospace';
  ctx.fillStyle = '#5d4a80';
  ctx.textBaseline = 'bottom';
  ctx.fillText(muted ? 'sound off (M)' : 'sound on (M)', 12, viewH - 8);
  if (player.hasBow) {
    ctx.fillStyle = '#8d76b8';
    ctx.textAlign = 'right';
    ctx.fillText('X: fire', viewW - 12, viewH - 8);
  }
  ctx.restore();
}
