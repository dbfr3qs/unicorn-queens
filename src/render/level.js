// Level rendering: ground, platforms, boxes, goal flag.
// Drawn inside the camera-translated world pass (see index.js).
import { palette } from './theme.js';

export function drawLevel(c, lvl) {
  for (const seg of lvl.ground) {
    c.fillStyle = palette.night;
    c.fillRect(seg.x, lvl.groundY, seg.w, lvl.height - lvl.groundY);
    c.fillStyle = '#7b4fa6';
    c.fillRect(seg.x, lvl.groundY, seg.w, 4);
  }
  c.fillStyle = '#4a2d7a';
  for (const p of lvl.platforms) c.fillRect(p.x, p.y, p.w, 12);
  for (const b of lvl.boxes) {
    if (b.broken) continue;
    c.fillStyle = '#c98f3d';
    c.fillRect(b.x, b.y, b.w, b.h);
    c.strokeStyle = '#8a5f22';
    c.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
  }
  const g = lvl.goal; // goal flag
  c.fillStyle = palette.lavender;
  c.fillRect(g.x, lvl.groundY - 90, 4, 90);
  c.fillStyle = palette.gold;
  c.beginPath();
  c.arc(g.x + 2, lvl.groundY - 94, 5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = palette.pink;
  c.beginPath();
  c.moveTo(g.x + 4, lvl.groundY - 86);
  c.lineTo(g.x + 40, lvl.groundY - 74);
  c.lineTo(g.x + 4, lvl.groundY - 62);
  c.closePath();
  c.fill();
}
