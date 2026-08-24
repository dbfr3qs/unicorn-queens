// The jail cell: brick alcove, iron bars, the witch inside. The bars
// rise and fade out over the unlock (unlockT); the witch is drawn between
// the dark interior and the bars, and fades out over her FADE_T seconds.
import { FADE_T } from '../cell.js';

export function drawCell(c, lvl) {
  const cell = lvl.cell;
  if (!cell) return;
  const { x, y, w, h } = cell;
  c.fillStyle = '#4a2d1c'; // alcove frame, darker brick (P8 aligns bricks)
  c.fillRect(x - 10, y - 14, w + 20, 14); // lintel
  c.fillRect(x - 10, y - 14, 10, h + 14); // left jamb
  c.fillRect(x + w, y - 14, 10, h + 14); // right jamb
  c.fillStyle = '#1a0f0a'; // dark interior
  c.fillRect(x, y, w, h);
  if (cell.witch !== 'gone') {
    c.save();
    c.translate(cell.wx, cell.wy);
    if (cell.witch === 'fading') c.globalAlpha = Math.max(0, cell.fadeT / FADE_T);
    c.fillStyle = '#3d2a66'; // cowl
    c.fillRect(3, 0, 14, 13);
    c.fillStyle = '#f0d8c0'; // face
    c.fillRect(6, 5, 8, 6);
    c.fillStyle = '#fff'; // hopeful eyes
    c.fillRect(8, 7, 2, 2);
    c.fillRect(11, 7, 2, 2);
    c.fillStyle = '#5a3d9a'; // robe
    c.fillRect(4, 12, 12, 18);
    c.fillStyle = '#8a5f22'; // staff
    c.fillRect(17, 5, 2, 25);
    c.fillStyle = '#b57edc'; // orb
    c.fillRect(16, 1, 4, 4);
    c.restore();
  }
  const openFrac = cell.open ? 1 : cell.opening ? (0.8 - cell.unlockT) / 0.8 : 0;
  if (openFrac < 1) { // iron bars: rise + fade while the lock swings
    c.globalAlpha = 1 - openFrac;
    c.fillStyle = '#8a9aa8';
    const barY = y - 10 - openFrac * 24;
    for (let i = 0; i < 4; i++) c.fillRect(x + 12 + i * 15, barY, 3, h + 10);
    c.fillRect(x, barY, w, 4); // top rail
    c.globalAlpha = 1;
  }
}
