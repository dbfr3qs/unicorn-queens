// HUD: hearts, score, mute/bow hints, win/lose overlay. No state of its own.
import { game } from '../game.js';
import { LEVELS } from '../levels.js';
import { score } from '../loot.js';
import { muted } from '../audio.js';
import { palette, fonts } from './theme.js';

export function drawHud(ctx, viewW, viewH) {
  const { player } = game;
  ctx.save();
  ctx.font = fonts.hud;
  ctx.textBaseline = 'top';
  for (let i = 0; i < player.maxHp; i++) { // 4th pip appears with the heart cap
    ctx.fillStyle = i < player.hp ? palette.pink : palette.heartEmpty;
    ctx.fillText('\u2665', 12 + i * 22, 10); // heart
  }
  ctx.fillStyle = palette.teal;
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + score, viewW - 12, 10);
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.lavender;
  ctx.fillText('LEVEL ' + (game.levelIndex + 1), viewW / 2, 10);
  ctx.restore();
  if (player.dead || player.won) {
    ctx.save();
    ctx.fillStyle = palette.overlay;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = player.won ? palette.gold : palette.unicornWhite;
    ctx.textAlign = 'center';
    ctx.font = fonts.title;
    ctx.fillText(player.won ? 'LEVEL CLEAR!' : 'GAME OVER', viewW / 2, viewH / 2 - 24);
    ctx.font = fonts.sub;
    ctx.fillStyle = palette.lavender;
    const sub = !player.won
      ? 'press Space to try again'
      : game.levelIndex + 1 < LEVELS.length
        ? 'score ' + score + ' - press Space for next level'
        : 'score ' + score + ' - press Space to play again';
    ctx.fillText(sub, viewW / 2, viewH / 2 + 12);
    ctx.restore();
  }
  ctx.save();
  ctx.font = fonts.hint;
  ctx.fillStyle = palette.hint;
  ctx.textBaseline = 'bottom';
  ctx.fillText(muted ? 'sound off (M)' : 'sound on (M)', 12, viewH - 8);
  if (player.hasBow) {
    ctx.fillStyle = palette.bowHint;
    ctx.textAlign = 'right';
    ctx.fillText('X: fire', viewW - 12, viewH - 8);
  }
  ctx.restore();
}
