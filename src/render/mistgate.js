// The mist gate's render (level 5): a stone arch (the gate arch's
// styling) with a mist field between the pillars. Locked: a dim blue-grey
// shimmer (slow alpha wave) + a faint pulsing seal glow — the level 3
// "sealed" language. Unlocked: it brightens over MIST_OPEN s to a glowing
// pale-blue field with rising sparkle motes (pure time function —
// snapshot friendly), and stays open.
import { MIST_OPEN } from '../mistgate.js';
import { palette } from './theme.js';
import { spriteReady } from '../sprites.js';
import { drawSpriteFeet, scaleToHeight } from './sprite.js';

export function drawMistgate(c, lvl, t) {
  const m = lvl.mistgate;
  if (!m) return;
  const gy = lvl.groundY;
  const locked = lvl.exit ? lvl.exit.locked : true;
  const fx0 = m.x + 20, fw = m.w - 40; // the field between the pillars
  if (locked) {
    c.globalAlpha = 0.25 + Math.sin(t * 1.2) * 0.08; // slow dim shimmer
    c.fillStyle = '#3a4a6a';
    c.fillRect(fx0, m.y, fw, gy - m.y);
    c.globalAlpha = 0.18 + Math.sin(t * 2) * 0.08; // faint seal glow
    c.fillStyle = '#8d76b8';
    c.beginPath(); // the seal: a small diamond at the field's heart
    c.moveTo(m.x + m.w / 2, m.y + 60);
    c.lineTo(m.x + m.w / 2 + 8, m.y + 72);
    c.lineTo(m.x + m.w / 2, m.y + 84);
    c.lineTo(m.x + m.w / 2 - 8, m.y + 72);
    c.closePath(); c.fill();
    c.globalAlpha = 1;
  } else {
    const frac = m.openT > 0 ? 1 - m.openT / MIST_OPEN : 1; // 0 -> 1 brighten
    c.globalAlpha = 0.4 + 0.45 * frac;
    c.fillStyle = '#bfe8ff'; // the glowing pale-blue field
    c.fillRect(fx0, m.y, fw, gy - m.y);
    c.globalAlpha = (0.25 + 0.25 * frac); // brighter core
    c.fillRect(fx0 + 12, m.y, fw - 24, gy - m.y);
    c.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { // rising sparkle motes
      const ph = (t * 0.45 + i / 6) % 1;
      const mx = fx0 + fw / 2 + Math.sin(t * 0.8 + i * 1.9) * 16;
      c.globalAlpha = 0.7 * (1 - ph * 0.6) * frac;
      c.fillStyle = palette.white;
      c.fillRect(mx, gy - ph * (gy - m.y - 8) - 4, 3, 3);
    }
    c.globalAlpha = 1;
  }
  // The frame goes over the field, so the light still comes from behind it.
  if (spriteReady('mist_gate')) {
    c.save();
    c.translate(m.x + m.w / 2, gy);
    drawSpriteFeet(c, 'mist_gate', 0, scaleToHeight('mist_gate', gy - m.y + 30));
    c.restore();
    return;
  }
  c.fillStyle = '#211537'; // the stone arch: pillars + lintel
  c.fillRect(m.x, m.y, 20, gy - m.y);
  c.fillRect(m.x + m.w - 20, m.y, 20, gy - m.y);
  c.fillRect(m.x - 10, m.y - 28, m.w + 20, 28);
  c.strokeStyle = '#3a2a5c'; // arched trim over the opening
  c.lineWidth = 10;
  c.beginPath();
  c.arc(m.x + m.w / 2, m.y, 40, 0, Math.PI, true);
  c.stroke();
  c.fillStyle = '#3a2a5c'; // pillar inner trim
  c.fillRect(m.x + 16, m.y, 4, gy - m.y);
  c.fillRect(m.x + m.w - 20, m.y, 4, gy - m.y);
}
