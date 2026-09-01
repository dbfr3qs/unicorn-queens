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
    if (seg.kind === 'snow') { // level 7 snowfield: deep blue base, white cap
      c.fillStyle = '#26324e';
      c.fillRect(seg.x, top, seg.w, Math.max(0, lvl.height - top));
      c.fillStyle = '#e8f0f8'; // the cap
      c.fillRect(seg.x, top, seg.w, 10);
      c.fillStyle = '#b9c9e0'; // faint blue shadow line under the cap
      c.fillRect(seg.x, top + 10, seg.w, 3);
      continue;
    }
    if (seg.kind === 'ice') { // level 7 ice span: glossy pale blue, glint, cracks
      c.fillStyle = '#3a5a78';
      c.fillRect(seg.x, top, seg.w, Math.max(0, lvl.height - top));
      c.fillStyle = '#bfe4f0'; // the glossy top
      c.fillRect(seg.x, top, seg.w, 8);
      c.fillStyle = '#e8f7fc'; // glint streaks
      for (let px = seg.x + 10; px < seg.x + seg.w - 10; px += 26) c.fillRect(px, top + 2, 12, 2);
      c.fillStyle = '#7fb8d4'; // a thin crack line
      c.fillRect(seg.x + Math.max(8, seg.w / 2), top + 8, 3, 8);
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
  for (const m of lvl.lava ?? []) { // lava / sludge / water / crevasse / cauldron
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
    if (m.crevasse) { // level 7: a crevasse — a deep blue-black shaft, ice lips
      c.fillStyle = '#0a1220'; // body
      c.fillRect(m.x, top, m.w, Math.max(0, lvl.height - top));
      c.fillStyle = '#1d3a5c'; // a faint glow deep down
      c.fillRect(m.x, lvl.height - 16, m.w, 4);
      c.fillStyle = '#e8f0f8'; // the ice lips at the surface
      c.fillRect(m.x, lvl.groundY - 2, 6, 6);
      c.fillRect(m.x + m.w - 6, lvl.groundY - 2, 6, 6);
      continue;
    }
    if (m.cauldron) { // level 7: the cauldron pit — dark purple liquid, glow
      c.fillStyle = '#2a1245'; // body
      c.fillRect(m.x, top, m.w, Math.max(0, lvl.height - top));
      c.fillStyle = '#6a3a9a'; // liquid surface
      c.fillRect(m.x, top, m.w, 4);
      c.fillStyle = '#9a6ac4'; // slow bubbles (a pure function of t)
      for (let i = 0; i < 3; i++) {
        const bx = m.x + 16 + i * ((m.w - 32) / 2);
        const by = top + 8 + Math.sin(t * 1.4 + i * 2.3 + m.x * 0.05) * 3;
        c.beginPath();
        c.arc(bx, by, 2.5, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 0.15; // purple glow on the stone above
      c.fillStyle = '#9a6ac4';
      c.fillRect(m.x - 8, lvl.groundY - 26, m.w + 16, 30);
      c.globalAlpha = 1;
      continue;
    }
    if (m.kind === 'grate') { // level 8: the machine grate — a dark pit with a glow far down
      c.fillStyle = '#0d0b1e'; // body
      c.fillRect(m.x, top, m.w, Math.max(0, lvl.height - top));
      c.globalAlpha = 0.4; // a faint blue-lavender glow at the bottom
      c.fillStyle = '#6a5a9a';
      c.fillRect(m.x, lvl.height - 16, m.w, 4);
      c.globalAlpha = 1;
      c.fillStyle = '#b8860b'; // 2-px brass rims on both gap edges
      c.fillRect(m.x - 2, lvl.groundY - 2, 2, 6);
      c.fillRect(m.x + m.w, lvl.groundY - 2, 2, 6);
      continue;
    }
    if (m.kind === 'shaft') { // level 8: the cloud shaft — dark at the lip, cloud glow below
      c.fillStyle = '#0d0b1e'; // body
      c.fillRect(m.x, top, m.w, Math.max(0, lvl.height - top));
      const fade = ['#141030', '#241d40', '#2e2650', '#3a3560']; // the fade to cloud glow
      const step = Math.max(4, Math.floor((lvl.height - top) / fade.length));
      for (let i = 0; i < fade.length; i++) {
        c.fillStyle = fade[i];
        c.fillRect(m.x, top + i * step, m.w, step);
      }
      c.globalAlpha = 0.3; // two drifting mist bands (a pure function of t)
      c.fillStyle = '#b8a8d8';
      const off = (t * 12) % 40;
      c.fillRect(m.x + 2 + off, top + 12, Math.max(0, m.w - 4 - off), 3);
      const off2 = (t * 12 + 20) % 40;
      c.fillRect(m.x + 2 + (m.w - 4 - off2), top + 26, Math.max(0, off2), 3);
      c.globalAlpha = 1;
      c.fillStyle = '#d4aa3e'; // the brighter brass rim
      c.fillRect(m.x - 3, lvl.groundY - 2, 3, 6);
      c.fillRect(m.x + m.w, lvl.groundY - 2, 3, 6);
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
    else if (p.kind === 'ice') drawIceBridge(c, p);
    else if (p.kind === 'dais') drawDais(c, p, lvl.groundY);
    else if (p.kind === 'gear') drawGearPlat(c, p, lvl);
    else if (p.kind === 'shelf') drawShelfPlat(c, p);
    else if (p.kind === 'pend') drawPendPlat(c, p);
    else if (p.kind === 'pedestal') drawPedestal(c, p, lvl.groundY);
    else if (p.kind === 'trapdoor') drawTrapdoor(c, p, lvl);
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

// Level 7 platform kinds. The solid top edge stays at p.y (the collision
// rect is the plain one-way platform); the dressing hangs off it.
function drawIceBridge(c, p) { // the ice bridge over crevasse 2
  c.fillStyle = '#bfe4f0'; // the glossy slab (6 px, at water level)
  c.fillRect(p.x, p.y, p.w, 6);
  c.fillStyle = '#e8f7fc'; // glint streaks
  for (let px = p.x + 8; px < p.x + p.w - 10; px += 30) c.fillRect(px, p.y + 1, 14, 2);
  c.fillStyle = '#7fb8d4'; // the underside shadow
  c.fillRect(p.x, p.y + 6, p.w, 3);
}

function drawDais(c, p, gy) { // a snow-capped stone dais on a pillar
  c.fillStyle = '#3a4152'; // the slab
  c.fillRect(p.x, p.y, p.w, 10);
  c.fillStyle = '#e8f0f8'; // the snow cap
  c.fillRect(p.x, p.y, p.w, 4);
  c.fillStyle = '#5a627e'; // the rim trim
  c.fillRect(p.x - 2, p.y + 10, p.w + 4, 3);
  if (gy - p.y - 13 > 0) { // the pillar down to the ground (the tall daises)
    c.fillStyle = '#2c3242';
    c.fillRect(p.x + 10, p.y + 13, p.w - 20, gy - p.y - 13);
    c.fillStyle = '#454c68'; // pillar joints
    for (let ry = p.y + 24; ry < gy; ry += 14) c.fillRect(p.x + 10, ry, p.w - 20, 2);
  }
}

// Level 8 platform kinds. The solid top edge stays at p.y (the collision
// rect is the plain one-way platform); the dressing hangs off it.
function drawGearPlat(c, p, lvl) { // the clock's gear platform: brass plate, turning gear below
  const cx = p.x + p.w / 2;
  const rot = (lvl.clock ? lvl.clock.gearRot : 0) * Math.PI * 2;
  c.fillStyle = '#b8860b'; // the plate
  c.fillRect(p.x, p.y, p.w, 12);
  c.fillStyle = '#8a6a1e'; // the plate's rim
  c.fillRect(p.x, p.y + 10, p.w, 2);
  const hy = p.y + 30; // the hub center, hanging below the plate
  c.globalAlpha = 0.2; // the faint cyan glow ring
  c.strokeStyle = '#7ec8ff';
  c.lineWidth = 2;
  c.beginPath(); c.arc(cx, hy, 24, 0, Math.PI * 2); c.stroke();
  c.globalAlpha = 1;
  c.fillStyle = '#7a5c1e'; // the gear body
  c.beginPath(); c.arc(cx, hy, 18, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#b8860b'; // the eight teeth (turn with the clock)
  for (let i = 0; i < 8; i++) {
    const a = rot + i * Math.PI / 4;
    c.fillRect(cx + Math.cos(a) * 21 - 3, hy + Math.sin(a) * 21 - 3, 6, 6);
  }
  c.fillStyle = '#8a6a1e'; // the hub
  c.beginPath(); c.arc(cx, hy, 6, 0, Math.PI * 2); c.fill();
}

function drawShelfPlat(c, p) { // a bookcase shelf: wood top, book spines on it
  c.fillStyle = '#4a3220';
  c.fillRect(p.x, p.y, p.w, 12);
  c.fillStyle = '#332414'; // the underside
  c.fillRect(p.x, p.y + 10, p.w, 2);
  const spines = ['#5a3a5e', '#3a4a6a', '#6a4a2e', '#3e5a4a'];
  for (let i = 0; i < 5; i++) { // five 4-px book spines, hashed by x
    c.fillStyle = spines[(p.x + i * 7) % 4];
    c.fillRect(p.x + 6 + i * Math.floor((p.w - 18) / 5), p.y - 10, 4, 10);
  }
}

function drawPendPlat(c, p) { // a brass bridge plate, rim rivets
  c.fillStyle = '#8a6a2e';
  c.fillRect(p.x, p.y, p.w, 12);
  c.fillStyle = '#b8860b'; // the lit top
  c.fillRect(p.x, p.y, p.w, 4);
  c.fillStyle = '#5e4a1e'; // the three rivets
  c.fillRect(p.x + 6, p.y + 6, 3, 3);
  c.fillRect(p.x + p.w / 2 - 1, p.y + 6, 3, 3);
  c.fillRect(p.x + p.w - 9, p.y + 6, 3, 3);
}

function drawPedestal(c, p, gy) { // the astrolabe plinth: stone base, brass ring, pillar
  c.fillStyle = '#3a3358'; // the base
  c.fillRect(p.x + 4, p.y, p.w - 8, 16);
  c.fillStyle = '#b8860b'; // the brass ring on top
  c.fillRect(p.x, p.y, p.w, 4);
  c.fillStyle = '#2a2440'; // the base flare
  c.fillRect(p.x - 4, p.y + 16, p.w + 8, 6);
  if (gy - p.y - 22 > 0) { // the pillar down to the deck
    c.fillStyle = '#2a2440';
    c.fillRect(p.x + 10, p.y + 22, p.w - 20, gy - p.y - 22);
  }
}

function drawTrapdoor(c, p, lvl) { // the lid over the cloud shaft
  if (lvl.trapdoor && lvl.trapdoor.open) { // M7: the lid swung down into the shaft
    c.fillStyle = '#8a6a2e';
    c.fillRect(p.x + 4, p.y + 20, p.w - 8, 10);
    c.fillStyle = '#5e4a1e';
    c.fillRect(p.x + 4, p.y + 20, p.w - 8, 3);
    return;
  }
  c.fillStyle = '#8a6a2e'; // the flush lid
  c.fillRect(p.x, p.y, p.w, 12);
  c.fillStyle = '#b8860b'; // the lit top
  c.fillRect(p.x, p.y, p.w, 3);
  c.fillStyle = '#5e4a1e'; // the rim handle
  c.fillRect(p.x + p.w / 2 - 10, p.y + 6, 20, 3);
  c.fillStyle = '#d4aa3e'; // the star motif
  c.fillRect(p.x + p.w / 2 - 1, p.y + 2, 2, 6);
  c.fillRect(p.x + p.w / 2 - 4, p.y + 4, 8, 2);
}
