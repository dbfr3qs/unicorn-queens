// Parallax night-sky background: twinkling stars + two mountain ridges.
// Pure module: no DOM/canvas globals (ground line comes from the level).
import { palette } from './theme.js';

function makeRidge(width, minH, maxH, gap, rng) {
  const peaks = [];
  let x = -100;
  while (x < width + 100) {
    const w = gap * (0.7 + rng() * 0.6);
    peaks.push({ x, w, h: minH + rng() * (maxH - minH) });
    x += w * 0.8;
  }
  return peaks;
}

export function createBackground(rng = Math.random) {
  const stars = [];
  for (let i = 0; i < 110; i++) {
    stars.push({ x: rng() * 1200, y: rng() * 380, r: rng() * 1.4 + 0.6, ph: rng() * Math.PI * 2 });
  }
  return { stars, far: makeRidge(1360, 90, 190, 240, rng), near: makeRidge(1760, 130, 260, 200, rng) };
}

export const background = createBackground();

export function drawRidge(c, peaks, off, color, groundY) {
  c.save();
  c.translate(-off, 0);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-200, groundY);
  for (const p of peaks) {
    c.lineTo(p.x, groundY);
    c.lineTo(p.x + p.w / 2, groundY - p.h);
    c.lineTo(p.x + p.w, groundY);
  }
  c.lineTo(3000, groundY);
  c.closePath();
  c.fill();
  c.restore();
}

// Stars (with parallax offset); exported so zone backgrounds can reuse the
// same star field clipped to their area.
export function drawStars(c, off, t) {
  c.save();
  c.translate(-off, 0); // stars drift slowest
  c.fillStyle = palette.lavender;
  for (const s of background.stars) {
    c.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + s.ph)); // twinkle
    c.fillRect(s.x, s.y, s.r, s.r);
  }
  c.restore();
}

export function drawBackground(c, lvl, cam, t) {
  drawStars(c, cam.x * 0.2, t);
  drawRidge(c, background.far, cam.x * 0.35, '#241543', lvl.groundY);
  drawRidge(c, background.near, cam.x * 0.6, '#2f1c55', lvl.groundY);
}
