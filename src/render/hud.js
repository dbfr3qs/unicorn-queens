// HUD: hearts, score, mute/bow hints, win/lose overlay. No state of its own.
import { game } from '../game.js';
import { LEVELS } from '../levels.js';
import { score } from '../loot.js';
import { muted } from '../audio.js';
import { FLIGHT_TIME, FLIGHT_CD } from '../player.js';
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
  if (game.level.key && game.level.key.taken) { // key icon, until the door consumes it (P5)
    const kx = 12 + player.maxHp * 22 + 10, ky = 12; // just right of the hearts
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(kx + 4, ky + 4, 3.5, 0, Math.PI * 2); ctx.stroke(); // ring
    ctx.fillStyle = palette.gold;
    ctx.fillRect(kx + 7, ky + 3, 8, 2.5); // shaft
    ctx.fillRect(kx + 11.5, ky + 5.5, 2, 3);
    ctx.fillRect(kx + 14, ky + 5.5, 2, 3.5); // teeth
  }
  ctx.fillStyle = palette.teal;
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + score, viewW - 12, 10);
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.lavender;
  ctx.fillText('LEVEL ' + (game.levelIndex + 1), viewW / 2, 10);
  if (player.hasFlight) { // flight meter: gold drains in flight, lavender refills on cooldown
    const bw = 64, bh = 5, bx = viewW / 2 - bw / 2, by = 32;
    const frac = player.flying ? player.flightT / FLIGHT_TIME
      : player.flightCd > 0 ? 1 - player.flightCd / FLIGHT_CD : 1;
    ctx.fillStyle = palette.hint;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = player.flying ? palette.gold
      : player.flightCd > 0 ? palette.lavender : palette.teal;
    ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, frac)), bh);
    ctx.fillStyle = player.flying ? palette.gold : palette.lavender; // wing icon
    ctx.beginPath(); ctx.ellipse(bx - 14, by + 1, 6, 3, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx - 7, by + 3.5, 5, 2.5, -0.3, 0, Math.PI * 2); ctx.fill();
  }
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
  if (player.hasFlight || player.hasBow) {
    ctx.fillStyle = palette.bowHint;
    ctx.textAlign = 'right';
    const hints = [];
    if (player.hasFlight) hints.push('S: fly');
    if (player.hasBow) hints.push('X: fire');
    ctx.fillText(hints.join('  '), viewW - 12, viewH - 8);
  }
  ctx.restore();
}
