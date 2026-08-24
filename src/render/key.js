// The hidden key and its marker brick. The key: golden ring + shaft with
// a twinkling glint (world pass, gone once taken). The marker: one
// out-of-pattern corridor brick (P8 draws the brick itself); this draws
// only its glint — faint at rest, bright for MARKER_GLINT seconds after
// an arrow hits it.
import { palette } from './theme.js';
import { MARKER_GLINT } from '../key.js';

export function drawKey(c, lvl, gameTime) {
  const key = lvl.key;
  if (!key || key.taken) return;
  const { x, y } = key;
  c.strokeStyle = palette.gold;
  c.lineWidth = 3;
  c.beginPath(); c.arc(x + 5, y + 5, 4, 0, Math.PI * 2); c.stroke(); // ring
  c.fillStyle = palette.gold;
  c.fillRect(x + 8, y + 3.5, 8, 3); // shaft
  c.fillRect(x + 12.5, y + 6.5, 2.5, 3.5); // teeth
  c.globalAlpha = 0.4 + 0.3 * Math.sin(gameTime * 5); // twinkle
  c.fillStyle = palette.white;
  c.fillRect(x + 3, y + 2, 3, 2);
  c.globalAlpha = 1;
}

export function drawMarker(c, lvl, gameTime) {
  const m = lvl.marker;
  if (!m) return;
  const a = m.glintT > 0
    ? 0.15 + 0.65 * (m.glintT / MARKER_GLINT) // bright, decaying after a hit
    : 0.1 + 0.08 * Math.sin(gameTime * 2); // faint idle shimmer
  c.globalAlpha = a;
  c.fillStyle = palette.gold;
  c.fillRect(m.x, m.y, m.w, m.h);
  c.globalAlpha = 1;
}
