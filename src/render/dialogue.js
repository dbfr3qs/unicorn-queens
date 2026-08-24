// The dialogue box: bottom-center dark panel, speaker line + advance
// hint, one text line at a time. Drawn last, above the HUD.
import { dialogue, currentLine } from '../dialogue.js';
import { palette, fonts } from './theme.js';

// 16px monospace is ~0.6em wide per character; the wrap budget uses this
// constant instead of measureText so render output stays deterministic.
const CHAR_W = 9.6;

export function drawDialogue(ctx, viewW, viewH) {
  if (!dialogue.open) return;
  const line = currentLine();
  const bw = Math.min(viewW - 40, 560);
  const bh = 76;
  const bx = Math.round((viewW - bw) / 2);
  const by = viewH - bh - 16;
  ctx.save();
  ctx.fillStyle = palette.night;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = palette.lavender;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  ctx.textBaseline = 'top';
  ctx.font = fonts.hint;
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.gold;
  ctx.fillText(line.speaker || '', bx + 16, by + 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = palette.hint;
  ctx.fillText('space >', bx + bw - 16, by + 12);
  ctx.textAlign = 'left';
  ctx.font = fonts.sub;
  ctx.fillStyle = palette.unicornWhite;
  const maxChars = Math.floor((bw - 32) / CHAR_W);
  const rows = [];
  let row = '';
  for (const w of line.text.split(' ')) { // greedy wrap on the char budget
    const next = row ? row + ' ' + w : w;
    if (row && next.length > maxChars) { rows.push(row); row = w; }
    else row = next;
  }
  rows.push(row);
  rows.forEach((r, i) => ctx.fillText(r, bx + 16, by + 34 + i * 20));
  ctx.restore();
}
