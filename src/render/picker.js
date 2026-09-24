// The difficulty card: the title, the three choices side by side, the
// chosen one's blurb, and the keys. Flat, on the clear colour — it is a
// menu, and the story starts the moment it closes.
import { game } from '../game.js';
import { DIFFICULTIES } from '../difficulty.js';
import { PICKER_BLURB } from '../picker.js';
import { palette, fonts } from './theme.js';

const LABEL = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' };

export function drawPicker(ctx, viewW, viewH) {
  const pk = game.picker;
  ctx.save();
  ctx.fillStyle = palette.clear;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = fonts.title;
  ctx.fillStyle = palette.gold;
  ctx.fillText('UNICORN QUEENS', viewW / 2, viewH / 2 - 110);
  ctx.font = fonts.sub;
  ctx.fillStyle = palette.lavender;
  ctx.fillText('choose your difficulty', viewW / 2, viewH / 2 - 60);
  ctx.font = fonts.hud;
  const gap = 170;
  DIFFICULTIES.forEach((d, i) => {
    const x = viewW / 2 + (i - 1) * gap, y = viewH / 2;
    const on = i === pk.i;
    if (on) {
      ctx.strokeStyle = palette.pink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 70, y - 22, 140, 44);
    }
    ctx.fillStyle = on ? palette.unicornWhite : palette.hint;
    ctx.fillText(LABEL[d], x, y);
  });
  ctx.font = fonts.sub;
  ctx.fillStyle = palette.teal;
  ctx.fillText(PICKER_BLURB[DIFFICULTIES[pk.i]], viewW / 2, viewH / 2 + 60);
  ctx.font = fonts.hint;
  ctx.fillStyle = palette.lavender;
  ctx.fillText('◀ ▶ to choose · Space to start', viewW / 2, viewH / 2 + 120);
  ctx.restore();
}
