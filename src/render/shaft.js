// The shaft: a hole in the ceiling of the dragon hall. States: sealed
// (iron lattice, dim green seal glow) -> opening (lattice retracts up into
// the ceiling) -> open (dark mouth lit gold, a golden light shaft to the
// floor, rising embers). Decorative barrier only — the engine has no solid
// ceiling and the flight clamp already bounds the player; the exit rect is
// gated by the pearl-locked flag, not by the gate.
import { SHAFT_OPEN } from '../shaft.js';

export function drawShaft(c, lvl, t) {
  const s = lvl.shaft;
  if (!s) return;
  const gy = lvl.groundY;
  const open = s.state === 'open';
  c.fillStyle = open ? '#d9a94a' : '#040704'; // mouth: dark until the light comes
  c.fillRect(s.x, 0, s.w, s.h);
  c.fillStyle = '#2a3a2a'; // stone rim
  c.fillRect(s.x - 8, 0, 8, s.h + 10);
  c.fillRect(s.x + s.w, 0, 8, s.h + 10);
  c.fillRect(s.x - 8, s.h + 2, s.w + 16, 8); // sill
  if (!open) {
    const frac = s.state === 'opening' ? Math.max(0, s.openT / SHAFT_OPEN) : 1; // 1 -> 0
    const latticeH = (s.h + 4) * frac;
    c.fillStyle = '#3a3f42'; // iron lattice, portcullis styling
    for (let x = s.x + 6; x < s.x + s.w; x += 16) c.fillRect(x, 0, 4, latticeH);
    c.fillRect(s.x, 16, s.w, 5);
    if (latticeH > 46) c.fillRect(s.x, 42, s.w, 5);
    const pulse = (0.10 + Math.sin(t * 2) * 0.04) * frac; // seal glow fades with the lattice
    c.globalAlpha = pulse;
    c.fillStyle = '#6a9a4a';
    c.fillRect(s.x + 3, 3, s.w - 6, Math.max(0, s.h - 6) * frac);
    c.globalAlpha = 1;
  } else {
    const pulse = 0.07 + Math.sin(t * 1.5) * 0.02; // golden light shaft
    c.globalAlpha = pulse;
    c.fillStyle = '#ffd75e';
    c.fillRect(s.x - 12, 0, s.w + 24, gy);
    c.globalAlpha = pulse + 0.06; // brighter core
    c.fillRect(s.x + s.w / 2 - 14, 0, 28, gy);
    c.globalAlpha = 1;
    c.fillStyle = '#ffd75e'; // rising embers (pure time function, seeded per ember)
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.22 + i * 0.166) % 1;
      const x = s.x + s.w / 2 + Math.sin(t * 0.7 + i * 1.9) * 30;
      c.globalAlpha = 0.5 * (1 - ph * 0.6);
      c.fillRect(x, gy - ph * gy, 3, 3);
    }
    c.globalAlpha = 1;
  }
}
