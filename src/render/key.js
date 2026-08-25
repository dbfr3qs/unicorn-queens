// The hidden key and its marker brick. The key: golden ring + shaft with
// a twinkling glint (world pass, gone once taken; hidden in the wall until
// the nook crumbles open). The marker: the weak brick of the nook wall
// (P8 draws the brick courses); this draws only its glint — faint at rest,
// bright for MARKER_GLINT seconds after an arrow hits it.
import { palette } from './theme.js';
import { MARKER_GLINT, CRUMBLE_T } from '../key.js';

// The key nook (level 3), drawn after the zone wall and before the
// platforms so the ledge and key sit inside it. Pre-reveal the wall over
// fissure 2 is intact: only a faint gold glint leaks through a crack where
// the key sits inside. Mid-crumble the section darkens and brick shards
// fall out of it. Post-reveal: a dark framed recess (the cell's alcove
// motif) holds the ledge and the key.
export function drawNook(c, lvl, t) {
  const nook = lvl.keyNook;
  if (!nook) return;
  const gy = lvl.groundY;
  const x0 = 1580, w = 120, top = gy - 312, bottom = gy - 128; // the wall section
  if (nook.revealed) {
    c.fillStyle = '#4a2d1c'; // frame: lintel, jambs, sill (cell motif)
    c.fillRect(x0 - 8, top - 14, w + 16, 14);
    c.fillRect(x0 - 8, top - 14, 8, bottom - top + 14);
    c.fillRect(x0 + w, top - 14, 8, bottom - top + 14);
    c.fillRect(x0 - 8, bottom, w + 16, 8);
    c.fillStyle = '#0d0703'; // dark recess interior
    c.beginPath();
    c.arc(x0 + w / 2, top + 60, w / 2, Math.PI, 0); // rounded top
    c.rect(x0, top + 60, w, bottom - top - 60);
    c.fill();
    return;
  }
  if (nook.crumbleT > 0) {
    const p = 1 - nook.crumbleT / CRUMBLE_T; // 0 -> 1 over the crumble
    c.globalAlpha = 0.3 * p; // the section darkens as it gives way
    c.fillStyle = '#000';
    c.fillRect(x0, top + 12, w, bottom - top - 12);
    c.globalAlpha = 1;
    for (let i = 0; i < 6; i++) { // brick shards falling out of the wall
      const sx = x0 + 8 + ((i * 53) % 104) + (i % 2 ? 1 : -1) * 5 * p;
      const sy = top + 20 + ((i * 17) % 60) + p * (150 + ((i * 37) % 40));
      c.fillStyle = i % 2 ? '#4a2d1c' : '#3a2412';
      c.fillRect(sx, sy, 6 + (i % 3) * 2, 5 + (i % 2) * 3);
    }
  }
  const k = lvl.key; // glint through the crack at the key's position
  if (k && !k.taken) {
    const flick = 0.5 + 0.5 * Math.sin(t * 3.1 + 1.7); // seeded flicker
    const a = nook.crumbleT > 0
      ? 0.15 + 0.5 * (1 - nook.crumbleT / CRUMBLE_T) // widens as the wall breaks
      : 0.05 + 0.1 * flick; // faint at rest: easy to miss across the corridor
    c.globalAlpha = a;
    c.fillStyle = palette.gold;
    c.fillRect(k.x + 6, k.y + 2, 2, 10); // the crack
    c.fillRect(k.x + 4, k.y + 6, 2, 2); // a bead of light
    c.globalAlpha = 1;
  }
}

export function drawKey(c, lvl, gameTime) {
  const key = lvl.key;
  if (!key || key.taken) return;
  if (lvl.keyNook && !lvl.keyNook.revealed) return; // still hidden in the wall
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
  if (lvl.keyNook && lvl.keyNook.revealed) return; // the brick crumbled away
  const a = m.glintT > 0
    ? 0.15 + 0.65 * (m.glintT / MARKER_GLINT) // bright, decaying after a hit
    : 0.1 + 0.08 * Math.sin(gameTime * 2); // faint idle shimmer
  c.globalAlpha = a;
  c.fillStyle = palette.gold;
  c.fillRect(m.x, m.y, m.w, m.h);
  c.globalAlpha = 1;
}
