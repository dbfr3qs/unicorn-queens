// World-pass dressing for the Blackmire (level 6). Two passes:
// drawMireBack (before drawLevel, like the L3 nook): the dead cypress
// trunks — behind the root platforms that grow off the great cypress.
// drawMire (after drawLevel, like L5's forest): ferns, the sunken temple,
// the vent rim + bubble, the nest web + glint, the egg sac, the Old
// Winch, the bridge (all three states), and the exit arch with the
// stairway to the peak. Pure functions of world x and time (state read
// from lvl), no RNG — snapshots stay text-stable.
import { spriteReady } from '../sprites.js';
import { drawSpriteFeet, scaleToHeight, scaleToWidth } from './sprite.js';
const BRIDGE_LOWER = 1.2; // must match src/bridge.js (M4)

function drawDeadCypress(c, x, gy, topY, w) {
  c.fillStyle = '#1a231a'; // trunk
  c.fillRect(x - w / 2, topY, w, gy - topY);
  c.fillStyle = '#232e22'; // bark highlight
  c.fillRect(x - w / 2, topY, w / 3, gy - topY);
  for (let b = 0; b < 4; b++) { // drooping branch nubs
    const by = topY + 14 + b * 34;
    if (by > gy - 20) break;
    const len = 16 + (b % 2) * 8;
    c.fillStyle = '#1a231a';
    c.fillRect(x - w / 2 - len, by, len, 3);
    c.fillRect(x + w / 2, by + 10, len, 3);
  }
}

export function drawMireBack(c, lvl, t = 0) {
  if (!lvl.zones?.some(z => z.kind === 'mire' || z.kind === 'mire-deep')) return;
  const gy = lvl.groundY;
  drawDeadCypress(c, 950, gy, 150, 26); // the great cypress (heron grove)
  for (const [x, top, w] of [
    [620, 300, 14], [1700, 280, 14], [2600, 320, 12], [3650, 300, 14],
    [4750, 330, 12], [5450, 310, 14], [6250, 290, 14],
  ]) drawDeadCypress(c, x, gy, top, w);
}

// A short strand of overhead web at a spider's anchor (M6): a few
// sagging horizontal threads with a radial glint at the anchor point.
function drawWebStrand(c, x, y) {
  c.strokeStyle = 'rgba(232, 232, 220, 0.35)';
  c.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(x - 26, y - 2 + i * 4);
    c.quadraticCurveTo(x, y + 2 + i * 4, x + 26, y - 2 + i * 4);
    c.stroke();
  }
  c.strokeStyle = 'rgba(232, 232, 220, 0.5)';
  c.beginPath();
  c.moveTo(x, y - 6);
  c.lineTo(x, y + 8);
  c.stroke();
}

// A giant dead fern: arched fronds from one base.
function drawFern(c, x, gy) {
  c.strokeStyle = '#2a3a24';
  c.lineWidth = 2;
  for (let f = -2; f <= 2; f++) {
    c.beginPath();
    c.moveTo(x, gy);
    c.quadraticCurveTo(x + f * 5, gy - 30, x + f * 11, gy - 16);
    c.stroke();
  }
}

// A broken temple column with a mossy fallen block.
function drawTemple(c, x, gy) {
  c.fillStyle = '#2c3438';
  c.fillRect(x, gy - 90, 22, 90);
  c.fillStyle = '#3a4448'; // capital
  c.fillRect(x - 4, gy - 100, 30, 10);
  c.fillStyle = '#232a2e'; // fallen block
  c.fillRect(x + 30, gy - 14, 34, 14);
  c.fillStyle = '#2e4a2a'; // moss
  c.fillRect(x + 2, gy - 106, 10, 4);
}

// A reed at a water's edge.
function drawReed(c, x, gy) {
  c.fillStyle = '#2a3a24';
  c.fillRect(x, gy - 16, 2, 16);
  c.fillStyle = '#7a5a2e';
  c.fillRect(x - 1, gy - 22, 4, 7);
}

// The mud vent's stone rim, sitting in its pool.
function drawVentRim(c, x, gy) {
  c.fillStyle = '#2c3438';
  c.beginPath(); c.ellipse(x, gy - 2, 26, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#0d2b1e'; // dark water inside
  c.beginPath(); c.ellipse(x, gy - 3, 18, 5, 0, 0, Math.PI * 2); c.fill();
}

// The vent's bubble while it is out of the water: a translucent green
// disc, a highlight arc, and the adder's cog visible inside (until pop).
// vent.bubbleY is the bubble's TOP edge (M3 owns the cycle physics).
function drawVentBubble(c, vent, t) {
  if (!vent || !vent.active || vent.popped || vent.bubbleY >= 554) return;
  const x = vent.x, y = vent.bubbleY + 18;
  c.save();
  c.globalAlpha = 0.25;
  c.fillStyle = '#9acd92';
  c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.5;
  c.strokeStyle = '#cfe8c8';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(x, y, 12, -2.4, -1.2); c.stroke(); // highlight
  c.globalAlpha = 0.7; // the cog, still sealed inside
  c.fillStyle = '#c98f3d';
  c.fillRect(x - 8, y - 8, 16, 16);
  c.restore();
}

// The heron's nest web: a white thread wrap while webbed (a 2x2 glint
// pulses on a ~4 s seed, the bush pattern); a fading thread-puff while
// unravelT > 0.
function drawNestWeb(c, nest, t) {
  if (!nest || (nest.state !== 'webbed' && nest.unravelT <= 0)) return;
  const a = nest.state === 'webbed' ? 0.5 : (nest.unravelT / 0.5) * 0.5;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = '#e8e8dc';
  c.lineWidth = 1;
  const { x, y, w, h } = nest;
  for (let i = 0; i < 5; i++) { // crossing threads
    c.beginPath(); c.moveTo(x + i * (w / 4), y); c.lineTo(x + i * (w / 4) + 14, y + h); c.stroke();
    c.beginPath(); c.moveTo(x + w - i * (w / 4), y); c.lineTo(x + w - i * (w / 4) - 14, y + h); c.stroke();
  }
  c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + w, y + 12); c.stroke();
  c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x + w, y + 10); c.stroke();
  c.restore();
  if (nest.state === 'webbed') {
    c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.57); // the glint
    c.fillStyle = '#ffffff';
    c.fillRect(x + w / 2 - 1, y + 8, 2, 2);
    c.globalAlpha = 1;
  }
}

// Loose cogs: drawn once released from their hiding spot (visible &&
// !taken) — the heron's hovering over the nest, the adder's at the vent's
// pop point, the weaver's over the dais. A gentle bob + a white glint.
function drawCogs(c, lvl, t) {
  for (let i = 0; i < lvl.cogs.length; i++) {
    const cog = lvl.cogs[i];
    if (!cog.visible || cog.taken || cog.installed) continue;
    const bob = Math.sin(t * 2 + i * 1.7) * 3;
    const x = cog.x, y = cog.y + bob;
    c.fillStyle = COG_COLS[i];
    c.beginPath(); c.arc(x + 8, y + 8, 8, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.25)'; // the inner ring
    c.beginPath(); c.arc(x + 8, y + 8, 4, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.57 + i * 2); // the glint
    c.fillStyle = '#ffffff';
    c.fillRect(x + 4, y + 2, 2, 2);
    c.globalAlpha = 1;
  }
}

// The egg sac on the dais: a web-wound blob + glint while present;
// broken husk halves after the pop.
function drawSac(c, sac, t) {
  if (!sac || !sac.present) return;
  const { x, y, w, h } = sac;
  if (sac.popped) {
    c.fillStyle = '#b8b4a8';
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + 8, y + 4); c.lineTo(x + 12, y + h); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x + w, y + h); c.lineTo(x + w - 8, y + 6); c.lineTo(x + w - 14, y + h); c.closePath(); c.fill();
    return;
  }
  c.fillStyle = '#d8d4c8';
  c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#8a8678'; // winding threads
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + w, y + 10); c.stroke();
  c.beginPath(); c.moveTo(x, y + 16); c.lineTo(x + w, y + 14); c.stroke();
  c.beginPath(); c.moveTo(x + 6, y); c.lineTo(x + 10, y + h); c.stroke();
  c.beginPath(); c.moveTo(x + w - 6, y); c.lineTo(x + w - 12, y + h); c.stroke();
  c.globalAlpha = Math.max(0.15, 0.3 + 0.35 * Math.sin(t * 1.57)); // the glint
  c.fillStyle = '#ffffff';
  c.fillRect(x + w / 2 - 1, y + 8, 2, 2);
  c.globalAlpha = 1;
}

// The Old Winch: a stone wheel on a beam, three hub notches (an
// installed cog sits in its notch, its colour per cog), a rune above
// each socket that glows when filled. The wheel angle is a pure time
// function — turning only after the last cog.
const COG_COLS = ['#e8e0d0', '#c98f3d', '#7a5fa0']; // heron, adder, weaver
function drawWinch(c, lvl, t) {
  const winch = lvl.winch;
  if (!winch) return;
  const gy = lvl.groundY;
  const cx = winch.x, cy = gy - 92, r = 42;
  c.fillStyle = '#39442f'; // beam + crossbeam
  c.fillRect(cx - 6, cy, 12, gy - cy);
  c.fillRect(cx - 40, cy - 8, 80, 10);
  c.fillStyle = '#2c3438'; // the wheel
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a4448';
  c.beginPath(); c.arc(cx, cy, r - 8, 0, Math.PI * 2); c.fill();
  const ang = winch.turning ? t * 0.5 : 0;
  for (let i = 0; i < 3; i++) {
    const a = ang + (i * Math.PI * 2) / 3;
    c.fillStyle = '#232a2e'; // spoke with a hub notch
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
    c.lineTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
    c.lineTo(cx + Math.cos(a + 0.12) * (r - 4), cy + Math.sin(a + 0.12) * (r - 4));
    c.lineTo(cx + Math.cos(a - 0.12) * (r - 4), cy + Math.sin(a - 0.12) * (r - 4));
    c.closePath();
    c.fill();
    if (winch.sockets[i]) { // the installed cog in its notch
      c.fillStyle = COG_COLS[i];
      c.beginPath(); c.arc(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14), 6, 0, Math.PI * 2); c.fill();
    }
  }
  for (let i = 0; i < 3; i++) { // the runes, one above each socket
    const rx = cx - 34 + i * 34, ry = cy - r - 22;
    c.globalAlpha = winch.sockets[i] ? 0.5 + 0.3 * Math.sin(t * 2 + i) : 0.25;
    c.fillStyle = winch.sockets[i] ? '#9fd0ff' : '#5a6a72';
    c.fillRect(rx - 4, ry - 5, 8, 10);
    c.fillStyle = winch.sockets[i] ? '#e8f4ff' : '#3a4448';
    c.fillRect(rx - 1.5, ry - 3, 3, 6);
    c.globalAlpha = 1;
  }
}

// The bridge over the pit, all three states from lvl.bridge: raised
// (the span standing vertical at the west bank), lowering (pivoting on
// its west end, angle a pure function of lowerT), lowered (the flat
// span). The rope runs from the span's far end to the winch arm.
function drawBridge(c, lvl) {
  const br = lvl.bridge;
  if (!br) return;
  const k = br.state === 'lowered' ? 1
    : br.state === 'lowering' ? 1 - br.lowerT / BRIDGE_LOWER : 0;
  const ang = (1 - k) * (Math.PI / 2); // vertical -> flat
  const px = br.x + 16, py = br.y + 4, L = br.w - 16;
  c.save();
  c.translate(px, py);
  c.rotate(-ang);
  c.fillStyle = '#5d3a1e'; // the span
  c.fillRect(0, -2, L, 12);
  c.fillStyle = '#8a5a2b';
  c.fillRect(0, -2, L, 4);
  c.fillStyle = '#3d2510';
  for (let sx = 22; sx < L; sx += 24) c.fillRect(sx, -2, 2, 8);
  c.restore();
  const ex = px + Math.cos(ang) * L, ey = py - Math.sin(ang) * L;
  c.strokeStyle = '#3d2510'; // the rope
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(br.x - 8, br.y - 90);
  c.lineTo(ex, ey);
  c.stroke();
  c.fillStyle = '#39442f'; // the winch arm
  c.fillRect(br.x - 20, br.y - 96, 40, 8);
}

// The exit at the hollow's east end: a gatehouse — a tower either side of
// the arch — with the dark of the way through behind its opening. Sealed:
// dimmed + a pulsing seal glow; unlocked: bright + rising sparkle motes
// (pure t). It used to stand in front of a vector stairway and a wedge of
// peak face; the sheet paints the dark of its own archway, so nothing is
// drawn behind it now.
const GATEHOUSE_W = 190; // drawn width: the sheet's opening then covers the 60 px exit box
function drawExitArch(c, lvl, t) {
  const ex = lvl.exit;
  if (!ex) return;
  const gy = lvl.groundY;
  const { x, w } = ex;
  if (spriteReady('gatehouse')) {
    // no dimming of the stone while sealed: the seal glow in the opening is
    // the locked tell, and a see-through gatehouse read as a ghost of one
    c.save();
    c.translate(x + w / 2, gy);
    drawSpriteFeet(c, 'gatehouse', 0, scaleToWidth('gatehouse', GATEHOUSE_W));
    c.restore();
  } else {
    c.save();
    if (ex.locked) c.globalAlpha = 0.55;
    c.fillStyle = '#0e1216';
    c.fillRect(x - 6, 420, w + 12, gy - 420);
    c.restore();
    c.fillStyle = '#2c3438'; // the stone arch frame
    c.fillRect(x - 14, 430, 14, gy - 430);
    c.fillRect(x + w, 430, 14, gy - 430);
    c.fillRect(x - 14, 418, w + 28, 16);
  }
  if (ex.locked) { // the seal glow
    c.globalAlpha = 0.3 + 0.15 * Math.sin(t * 2);
    c.fillStyle = '#9fd0ff';
    c.beginPath(); c.arc(x + w / 2, 480, 18, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  } else { // rising sparkle motes
    c.fillStyle = '#fff5fa';
    for (let i = 0; i < 3; i++) {
      const my = 540 - ((t * 26 + i * 42) % 110);
      c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3 + i * 2);
      c.fillRect(x + 14 + i * 14, my, 2, 2);
    }
    c.globalAlpha = 1;
  }
}

export function drawMire(c, lvl, t = 0) {
  if (!lvl.zones?.some(z => z.kind === 'mire' || z.kind === 'mire-deep')) return;
  const gy = lvl.groundY;
  for (const x of [180, 820, 2500, 3200, 3950, 4600, 5300, 6050, 6560]) drawFern(c, x, gy); // 180: where the gate passage was
  drawTemple(c, 4700, gy);
  drawTemple(c, 5400, gy);
  drawVentRim(c, lvl.vent?.x ?? 2100, gy);
  drawVentBubble(c, lvl.vent, t);
  drawNestWeb(c, lvl.nest, t);
  drawCogs(c, lvl, t);
  drawSac(c, lvl.sac, t);
  drawWinch(c, lvl, t);
  drawBridge(c, lvl);
  for (const spec of lvl.roster ?? []) { // overhead webs (M6 spiders)
    if (spec.kind === 'spider') drawWebStrand(c, spec.x, spec.y ?? 410);
  }
  drawExitArch(c, lvl, t);
  for (const m of lvl.lava ?? []) { // reeds at the water's edges
    if (!m.water) continue;
    drawReed(c, m.x + 4, gy);
    drawReed(c, m.x + m.w - 10, gy);
  }
}
