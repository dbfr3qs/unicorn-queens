// Level rendering: ground, platforms, boxes, goal flag.
// Drawn inside the camera-translated world pass (see index.js).
import { palette } from './theme.js';

export function drawLevel(c, lvl) {
  for (const seg of lvl.ground) {
    const top = seg.y ?? lvl.groundY;
    if (seg.kind === 'plank') { // wooden bridge deck
      c.fillStyle = '#5d3a1e';
      c.fillRect(seg.x, top, seg.w, Math.max(0, lvl.height - top));
      c.fillStyle = '#8a5a2b'; // plank surface
      c.fillRect(seg.x, top, seg.w, 6);
      c.fillStyle = '#3d2510'; // seams between planks
      for (let px = seg.x + 22; px < seg.x + seg.w; px += 24) c.fillRect(px, top, 2, 10);
      continue;
    }
    c.fillStyle = palette.night;
    c.fillRect(seg.x, top, seg.w, Math.max(0, lvl.height - top));
    c.fillStyle = '#7b4fa6';
    c.fillRect(seg.x, top, seg.w, 4);
  }
  for (const m of lvl.moats ?? []) { // moat water below the bridge deck
    c.fillStyle = '#0d2b4e';
    c.fillRect(m.x, lvl.groundY + 6, m.w, Math.max(0, lvl.height - lvl.groundY - 6));
    c.fillStyle = '#1d4e8e'; // surface line
    c.fillRect(m.x, lvl.groundY + 6, m.w, 3);
  }
  if (lvl.gate) { // stone arch at the castle gate
    c.fillStyle = '#3a2a5c';
    c.fillRect(lvl.gate.x, lvl.groundY - 220, 26, 220);
    c.fillRect(lvl.gate.x + lvl.gate.w - 26, lvl.groundY - 220, 26, 220);
    c.fillRect(lvl.gate.x - 8, lvl.groundY - 252, lvl.gate.w + 16, 34);
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
  if (!lvl.goal) return; // level 2 exits via the staircase, no flag
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
