// Parallax night-sky background: twinkling stars + two mountain ridges.
// Pure module: no DOM/canvas globals (ground line comes from the level).
import { palette } from './theme.js';
import { drawTiled } from './sprite.js';

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

// On-screen heights. The stored images are about twice these, so every layer is drawn
// downscaled — the same regime the character sprites are in, which is what stops the
// background reading as blockier than the things standing in front of it.
const FAR_H = 200, NEAR_H = 260;

// Generated parallax: the same three depths as the vector version, at the same speeds,
// so the sense of depth is unchanged. Returns false if any layer has not decoded, and the
// caller falls back — drawing two of three layers would look worse than drawing none.
export function drawParallax(c, lvl, cam, viewW) {
  const sky = drawTiled(c, 'bg_night_sky', cam.x * 0.2, 0, lvl.groundY, viewW);
  if (!sky) return false;
  drawTiled(c, 'bg_night_far', cam.x * 0.35, lvl.groundY - FAR_H, FAR_H, viewW);
  drawTiled(c, 'bg_night_near', cam.x * 0.6, lvl.groundY - NEAR_H, NEAR_H, viewW);
  return true;
}

// A zone's sky and ridge, for the level-specific zones. Same contract as drawParallax:
// false means at least the sky is missing, and the caller keeps its vector art. Detail
// layers a zone draws on top - fog, fireflies, snowfall, the rainbow - are untouched.
export function drawZoneParallax(c, skyName, ridgeName, ridgeH, lvl, cam, viewW) {
  if (!drawTiled(c, skyName, cam.x * 0.2, 0, lvl.groundY, viewW)) return false;
  if (ridgeName) {
    drawTiled(c, ridgeName, cam.x * 0.45, lvl.groundY - ridgeH, ridgeH, viewW);
  }
  return true;
}

// Level 9's sky is the level's progress bar: it has to move from a frozen
// pre-dawn to a real dawn as the hearths light. Two generated skies, with the
// warm one faded in over the cold one by the thaw's own number, gets a
// continuous change out of two static images — and at skyT 0 and 3 it is
// exactly one of them, so the ends are as crisp as any other level's sky.
export function drawThawParallax(c, coldSky, warmSky, warmth, ridgeName, ridgeH, lvl, cam, viewW) {
  if (!drawTiled(c, coldSky, cam.x * 0.2, 0, lvl.groundY, viewW)) return false;
  if (warmth > 0) {
    c.save();
    c.globalAlpha = Math.min(1, warmth);
    drawTiled(c, warmSky, cam.x * 0.2, 0, lvl.groundY, viewW);
    c.restore();
  }
  if (ridgeName) drawTiled(c, ridgeName, cam.x * 0.45, lvl.groundY - ridgeH, ridgeH, viewW);
  return true;
}

export function drawBackground(c, lvl, cam, t, viewW) {
  if (drawParallax(c, lvl, cam, viewW)) return;
  drawStars(c, cam.x * 0.2, t);
  drawRidge(c, background.far, cam.x * 0.35, '#241543', lvl.groundY);
  drawRidge(c, background.near, cam.x * 0.6, '#2f1c55', lvl.groundY);
}
