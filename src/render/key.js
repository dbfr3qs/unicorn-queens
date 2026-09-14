// The hidden key and its marker brick. The key: golden ring + shaft with
// a twinkling glint (world pass, gone once taken; hidden in the wall until
// the nook crumbles open). The marker: the weak brick of the nook wall
// (P8 draws the brick courses); this draws only its glint — faint at rest,
// bright for MARKER_GLINT seconds after an arrow hits it.
import { palette } from './theme.js';
import { MARKER_GLINT, CRUMBLE_T, REVEAL_T } from '../key.js';
import { spriteReady } from '../sprites.js';
import { drawSpriteCentre, drawSpriteFeet, scaleToHeight, scaleToWidth } from './sprite.js';

// The key nook (level 3), drawn after the zone wall and before the
// platforms so the ledge and key sit inside it. Pre-reveal the wall over
// fissure 2 is intact: only a faint gold glint leaks through a crack where
// the key sits inside. Mid-crumble the section darkens and brick shards
// fall out of it. Post-reveal: a dark framed recess (the cell's alcove
// motif) holds the ledge and the key.
// The wall section the nook occupies. Exported because the dungeon zone hangs
// a decorative alcove every 250 px and one of them lands at 1685 — right
// behind this one. Two arches in the same hole read as a mistake, so the zone
// skips any of its own that overlaps this rect.
export const NOOK_RECT = { x: 1580, w: 120, top: 248, bottom: 432 };

// A 0..1 ramp over the [a, b] slice of the reveal, so the three parts of it —
// the hole, the carved face, the dust — can overlap instead of running in
// sequence. Nothing here eases: the crumble that precedes it is linear too.
const ramp = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));

// The alcove sheet, measured. It is drawn wider than the nook on purpose —
// the carved surround is supposed to overlap the wall the recess is cut into,
// the way the gate arches do — and everything below is where its opening ends
// up once it is that wide with its feet on the sill.
const ARCH_W = 160; // the drawn width of the whole sheet
const MOUTH_HW = 53; // half the opening
const MOUTH_RISE = 79; // where the opening's sides stop being vertical
const MOUTH_SILL = 2; // and its floor, below the recess's own bottom edge
// The recess stops short of the wall section that crumbles to open it: the
// section runs down past the marker brick you shot, but the niche itself sits
// just under the ledge. Given the full height it read as a doorway with a
// shelf hung near its top, which is not what a niche is.
const SILL_LIFT = 56;

// What the nook covers on the wall once that surround is drawn — wider than
// the section itself, which is the point of it. The dungeon zone keeps its
// own furniture (a torch every 250 px, an alcove between each pair) out of
// this span: the torch at 1560 was burning against the arch's left jamb.
export const NOOK_COVER = {
  x0: NOOK_RECT.x + NOOK_RECT.w / 2 - ARCH_W / 2,
  x1: NOOK_RECT.x + NOOK_RECT.w / 2 + ARCH_W / 2,
};

export function drawNook(c, lvl, t) {
  const nook = lvl.keyNook;
  if (!nook) return;
  const gy = lvl.groundY;
  const { x: x0, w } = NOOK_RECT;
  const top = gy - 312, bottom = gy - 128; // the wall section
  if (nook.revealed) {
    // The recess opens, it does not pop. The dark punches out from the middle
    // first, the carved surround resolves behind it, and the dust off the
    // section that just fell hangs over the lot and clears last. Once
    // nook.revealT has run out all three are pinned at their end state and
    // this is the plain draw again.
    const p = nook.revealT > 0 ? 1 - nook.revealT / REVEAL_T : 1;
    const hole = ramp(p, 0, 0.45); // the opening widening
    const face = ramp(p, 0.2, 0.75); // the surround coming through the dust
    const dust = 1 - ramp(p, 0.05, 1);
    const cx = x0 + w / 2;
    if (spriteReady('key_alcove')) {
      // The sheet was cut out free-standing, so its opening is transparent —
      // and behind it is the brick wall the recess is supposed to go INTO.
      // The dark goes down first, cut to the shape of that opening (a plain
      // rectangle would show past the brick at the arch's shoulders), then
      // the carved surround over it.
      const sill = bottom - SILL_LIFT + MOUTH_SILL;
      const hw = MOUTH_HW * hole, rise = MOUTH_RISE * hole;
      c.fillStyle = '#0d0703';
      c.beginPath();
      c.arc(cx, sill - rise, hw, Math.PI, 0);
      c.rect(cx - hw, sill - rise, hw * 2, rise);
      c.fill();
      c.save();
      if (face < 1) c.globalAlpha = face;
      c.translate(cx, bottom - SILL_LIFT + 8);
      drawSpriteFeet(c, 'key_alcove', 0, scaleToWidth('key_alcove', ARCH_W));
      c.restore();
      drawNookDust(c, x0, w, top, bottom, dust);
      return;
    }
    if (face < 1) c.globalAlpha = face;
    c.fillStyle = '#4a2d1c'; // frame: lintel, jambs, sill (cell motif)
    c.fillRect(x0 - 8, top - 14, w + 16, 14);
    c.fillRect(x0 - 8, top - 14, 8, bottom - top + 14);
    c.fillRect(x0 + w, top - 14, 8, bottom - top + 14);
    c.fillRect(x0 - 8, bottom, w + 16, 8);
    if (face < 1) c.globalAlpha = 1;
    c.fillStyle = '#0d0703'; // dark recess interior, opening the same way
    const spring = bottom - (bottom - top - 60) * hole;
    c.beginPath();
    c.arc(cx, spring, (w / 2) * hole, Math.PI, 0); // rounded top
    c.rect(cx - (w / 2) * hole, spring, w * hole, bottom - spring);
    c.fill();
    drawNookDust(c, x0, w, top, bottom, dust);
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

// The dust off the fallen wall section: a warm haze over the whole opening
// plus a few motes drifting down out of it. Draws nothing at all once the
// reveal has finished, so the settled nook costs exactly what it used to.
function drawNookDust(c, x0, w, top, bottom, dust) {
  if (dust <= 0) return;
  const cx = x0 + w / 2, h = bottom - top + 26, bands = 9, bh = h / bands;
  // A stack of bands, not one rectangle: a hard-edged box of haze reads as a
  // box, and this is a cloud coming off a wall. Both the width and the
  // opacity bulge in the middle, so the silhouette is a lens.
  c.fillStyle = '#6b4a2e'; // the colour of the brick that just came out
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1);
    const hw = (w / 2 + 14) * (0.5 + 0.5 * Math.sin(Math.PI * (0.12 + 0.76 * f)));
    c.globalAlpha = 0.5 * dust * (0.5 + 0.5 * Math.sin(Math.PI * f));
    c.fillRect(cx - hw, top - 16 + bh * i, hw * 2, bh + 1);
  }
  c.fillStyle = '#8a6a4a';
  for (let i = 0; i < 8; i++) { // motes, seeded off i like the crumble shards
    c.globalAlpha = dust * (0.35 + 0.5 * (((i * 31) % 7) / 7));
    c.fillRect(x0 - 6 + ((i * 47) % (w + 12)),
      top + ((i * 29) % (bottom - top)) + (1 - dust) * 90,
      3 + (i % 2) * 2, 3);
  }
  c.globalAlpha = 1;
}

export function drawKey(c, lvl, gameTime) {
  const key = lvl.key;
  if (!key || key.taken) return;
  if (lvl.keyNook && !lvl.keyNook.revealed) return; // still hidden in the wall
  const { x, y } = key;
  // The loot key's sheet, which this draw predates and never picked up. Drawn
  // at 30 px over the 16 px pickup box: it is the thing the whole nook chain
  // is for, and it has to read from across the corridor.
  if (spriteReady('key')) {
    c.save();
    c.translate(x + key.w / 2, y + key.h / 2);
    drawSpriteCentre(c, 'key', 0, scaleToHeight('key', 30));
    c.restore();
    c.globalAlpha = 0.4 + 0.3 * Math.sin(gameTime * 5); // the twinkle stays: it is the tell
    c.fillStyle = palette.white;
    c.fillRect(x + 3, y + 2, 3, 2);
    c.globalAlpha = 1;
    return;
  }
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
  // The crack is drawn, not generated. A 20 px brick has no subject in it, so
  // the generator kept inventing one — three rolls gave a tree stump and two
  // little armoured men. And it would have been the wrong answer anyway: the
  // wall behind this IS a sheet, so a crack cut into it shows the real
  // masonry through the gap, which no separate brick sprite could match.
  const cx = m.x + m.w / 2;
  c.fillStyle = '#1a0f08'; // the split, stepped so it reads as broken not sawn
  c.fillRect(cx - 1, m.y + 2, 2, 6);
  c.fillRect(cx + 1, m.y + 8, 2, 5);
  c.fillRect(cx - 2, m.y + 13, 2, 5);
  c.fillRect(m.x + 3, m.y + 9, 5, 2); // a branch off it, into the mortar
  c.fillRect(m.x + m.w - 7, m.y + 6, 5, 2);
  c.fillStyle = '#8a6a4a'; // the lit edge of the chip, one pixel off the split
  c.fillRect(cx + 1, m.y + 2, 1, 6);
  c.fillRect(cx + 3, m.y + 8, 1, 5);
  c.globalAlpha = a; // and the gold over it: the part that says "shoot here"
  c.fillStyle = palette.gold;
  c.fillRect(m.x, m.y, m.w, m.h);
  c.globalAlpha = 1;
}
