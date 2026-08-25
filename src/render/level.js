// Level rendering: ground, platforms, boxes, goal flag.
// Drawn inside the camera-translated world pass (see index.js).
import { palette } from './theme.js';

export function drawLevel(c, lvl, t = 0) {
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
  for (const m of lvl.lava ?? []) { // lava fissures (dungeon) / sludge pits (deep): glowing, bubbling
    const top = lvl.groundY + 4;
    const sl = m.sludge; // level 4: green sludge instead of lava
    c.fillStyle = sl ? '#14200e' : '#3a0a05'; // body
    c.fillRect(m.x, top, m.w, Math.max(0, lvl.height - top));
    c.fillStyle = sl ? '#3a5a1e' : '#8a2410'; // surface line
    c.fillRect(m.x, top, m.w, 3);
    c.fillStyle = sl ? '#5a7a2e' : '#c2451e'; // slow bubbles
    for (let i = 0; i < 3; i++) {
      const bx = m.x + 14 + i * ((m.w - 28) / 2);
      const by = top + 8 + Math.sin(t * 1.6 + i * 2.1 + m.x * 0.05) * 3;
      c.beginPath();
      c.arc(bx, by, 2.5, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 0.12; // soft glow on the brick above
    c.fillStyle = sl ? '#7aa03a' : '#ff6a2a';
    c.fillRect(m.x - 8, lvl.groundY - 26, m.w + 16, 30);
    c.globalAlpha = 1;
  }
  if (lvl.gate) { // stone arch at the castle gate
    c.fillStyle = '#3a2a5c';
    c.fillRect(lvl.gate.x, lvl.groundY - 220, 26, 220);
    c.fillRect(lvl.gate.x + lvl.gate.w - 26, lvl.groundY - 220, 26, 220);
    c.fillRect(lvl.gate.x - 8, lvl.groundY - 252, lvl.gate.w + 16, 34);
  }
  c.fillStyle = '#4a2d7a';
  for (const p of lvl.platforms) if (!p.hidden) c.fillRect(p.x, p.y, p.w, 12); // hidden nook ledge: in the wall
  for (const b of lvl.boxes) {
    if (b.broken) continue;
    if (b.mystery) { // wildcard: purple box with a slow swirl
      c.fillStyle = '#7a4fd0';
      c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = '#4a2d7a';
      c.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
      const a = t * 1.2 + b.x * 0.01; // swirl angle: gameTime-driven, per-box phase
      c.strokeStyle = '#d9c8ff';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(b.x + b.w / 2, b.y + b.h / 2, 8, a, a + 4.2);
      c.stroke();
    } else {
      c.fillStyle = '#c98f3d';
      c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = '#8a5f22';
      c.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
    }
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
