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
    if (seg.kind === 'stone') { // level 5 courtyard: cobbled grey-blue blocks
      c.fillStyle = '#343a52';
      c.fillRect(seg.x, top, seg.w, Math.max(0, lvl.height - top));
      c.fillStyle = '#454c68';
      for (let ry = top, row = 0; ry < lvl.height; ry += 12, row++) {
        const off = row % 2 ? 12 : 0;
        for (let rx = seg.x + off; rx < seg.x + seg.w; rx += 24) c.fillRect(rx + 1, ry + 1, 22, 10);
      }
      c.fillStyle = '#5a627e';
      c.fillRect(seg.x, top, seg.w, 4);
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
  for (const m of lvl.lava ?? []) { // lava / sludge / water: the level's gap fluid
    const top = lvl.groundY + 4;
    if (m.water) { // level 5: pond and stream (falling in = the pit rule)
      c.fillStyle = '#0d2b4e'; // body
      c.fillRect(m.x, top, m.w, Math.max(0, lvl.height - top));
      c.fillStyle = '#1d4e8e'; // surface line
      c.fillRect(m.x, top, m.w, 3);
      c.fillStyle = '#4e8ed4'; // a slow shimmer, drifting across the surface
      for (let i = 0; i < 4; i++) {
        const sx = m.x + Math.min(((t * 24 + i * (m.w / 4)) % m.w), m.w - 10);
        c.fillRect(sx, top + 6 + Math.sin(t * 2 + i * 1.7) * 2, 10, 2);
      }
      continue;
    }
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
  for (const p of lvl.platforms) if (!p.hidden && (!p.kind || p.kind === 'platform')) c.fillRect(p.x, p.y, p.w, 12); // hidden nook ledge: in the wall
  for (const p of lvl.platforms) { // kinds: branch, lily, log (L5); root, nest, altar (L6)
    // (the L6 bridge span is rendered by render/mire.js in all its states)
    if (p.hidden || !p.kind || p.kind === 'platform') continue;
    if (p.kind === 'branch') drawBranch(c, p);
    else if (p.kind === 'lily') drawLily(c, p);
    else if (p.kind === 'log') drawLog(c, p);
    else if (p.kind === 'root') drawRoot(c, p);
    else if (p.kind === 'nest') drawNest(c, p);
    else if (p.kind === 'altar') drawAltar(c, p);
  }
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

// Level 5 platform kinds. The solid top edge stays at p.y (the collision
// rect is the plain one-way platform); the dressing hangs off it.
function drawBranch(c, p) {
  c.fillStyle = '#6b4a2a'; // the limb
  c.fillRect(p.x, p.y + 4, p.w, 8);
  c.fillStyle = '#3e8a44'; // a leaf tuft
  c.fillRect(p.x + p.w / 2 - 16, p.y - 8, 32, 10);
  c.fillStyle = '#57a857';
  c.fillRect(p.x + p.w / 2 - 9, p.y - 14, 18, 8);
}

function drawLily(c, p) {
  c.fillStyle = '#2e6a34'; // the pad, floating on the water
  c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 6, p.w / 2, 6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#57a857'; // the lighter top
  c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 4, p.w / 2 - 4, 3.5, 0, 0, Math.PI * 2); c.fill();
}

function drawLog(c, p) {
  c.fillStyle = '#6b4a2a'; // the trunk
  c.fillRect(p.x, p.y, p.w, 14);
  c.fillStyle = '#8a6a3e'; // lit top
  c.fillRect(p.x, p.y, p.w, 5);
  c.fillStyle = '#4a3418'; // rings on the cut end
  c.beginPath(); c.arc(p.x + p.w - 8, p.y + 7, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8a6a3e';
  c.beginPath(); c.arc(p.x + p.w - 8, p.y + 7, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4a3418'; // bark notches
  c.fillRect(p.x + 14, p.y + 10, 10, 2);
  c.fillRect(p.x + 44, p.y + 10, 12, 2);
}

// Level 6 platform kinds. The solid top edge stays at p.y (the collision
// rect is the plain one-way platform); the dressing hangs off it.
function drawRoot(c, p) { // a gnarled brown limb, knobby
  c.fillStyle = '#5a4326'; // the limb
  c.fillRect(p.x, p.y + 2, p.w, 9);
  c.fillStyle = '#6b5232'; // lit top
  c.fillRect(p.x, p.y, p.w, 3);
  c.fillStyle = '#43311c'; // knobby growths
  c.beginPath(); c.arc(p.x + 12, p.y + 2, 5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(p.x + p.w - 18, p.y + 1, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3a2c18'; // a dangling rootlet
  c.fillRect(p.x + p.w - 8, p.y + 10, 4, 12);
}

function drawNest(c, p) { // a stick nest
  c.fillStyle = '#4a3620'; // the bowl
  c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 8, p.w / 2, 10, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5d4226'; // sticks
  c.fillRect(p.x + 4, p.y + 2, p.w - 8, 4);
  c.fillStyle = '#3a2c18'; // stick ends
  c.fillRect(p.x - 4, p.y + 4, 8, 3);
  c.fillRect(p.x + p.w - 4, p.y + 6, 8, 3);
}

function drawAltar(c, p) { // a mossy stone dais, lit top
  c.fillStyle = '#3a4152'; // the dais block
  c.fillRect(p.x, p.y, p.w, 16);
  c.fillStyle = '#4a5268'; // lit top
  c.fillRect(p.x, p.y, p.w, 5);
  c.fillStyle = '#2c3242'; // wider base
  c.fillRect(p.x - 6, p.y + 16, p.w + 12, 8);
  c.fillStyle = '#2e4a2a'; // moss tufts
  c.fillRect(p.x + 8, p.y - 3, 12, 4);
  c.fillRect(p.x + p.w - 20, p.y - 2, 9, 3);
}
