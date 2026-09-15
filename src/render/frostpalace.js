// World-pass dressing for The Frozen Throne (level 9). Camera-translated
// world space, drawn after drawLevel and before the entities.
//
// Everything here is decoration that MOVES: the fountain the first seed is
// caught in, the three hearths, the three ice blocks, the hall's frozen
// people, the three seals, the throne, and the King. Not one of them has
// collision — the seals' collision is door.js, the shelves' is the platform
// list. Every animation is a pure function of level state and time, so the
// render snapshots stay stable.
//
// The zone pass owns anything with parallax (the sky, the palace silhouette,
// the facade, the vein of light); this pass owns anything at world scale.
import { beamX } from '../ending9.js';
import { spriteReady } from '../sprites.js';
import { drawSpriteFeet, scaleToHeight, drawTileGrid } from './sprite.js';

export const BRAZIERS = [950, 2600, 4400]; // hearths A, B, C
// Where the Queen sits, frozen. M4's roster entry is this exact rect, so the
// decoration and the live enemy are the same pose in the same place and the
// swap from one to the other is invisible.
export const QUEEN_SEAT = { x: 5672, y: 400, w: 56, h: 60 };

// Every prop in this pass stands on a floor line, so they all want the same
// call: translate to where its feet are, draw the sheet to a known height.
// Returns false when the sheet has not decoded, so each caller falls through
// to the vector art it replaces.
function prop(c, name, cx, feet, px) {
  if (!spriteReady(name)) return false;
  c.save();
  c.translate(cx, feet);
  const drew = drawSpriteFeet(c, name, 0, scaleToHeight(name, px));
  c.restore();
  return drew;
}

export function drawFrostPalace(c, lvl, t = 0) {
  if (!lvl.thaw) return; // level 9 only
  const gy = lvl.groundY;
  drawFountain(c, lvl, t, gy);
  drawFrozenWave(c, lvl, t, gy);
  for (let k = 0; k < 3; k++) drawBrazier(c, lvl, k, t, gy);
  drawRings(c, lvl, t, gy);
  drawIceBlock(c, lvl.frozenHare, 'hare', t);
  drawIceBlock(c, lvl.frozenWraith, 'wraith', t);
  drawIceBlock(c, lvl.frozenBird, 'bird', t);
  for (const f of lvl.hallFigures ?? []) drawHallFigure(c, f, t, gy);
  for (const f of lvl.hallFountains ?? []) drawHallFountain(c, f, t, gy);
  for (const pc of lvl.frostPatches ?? []) drawFrostPatch(c, pc, gy);
  for (const d of lvl.doors ?? []) if (d.kind === 'frostseal') drawFrostSeal(c, lvl, d, t);
  drawThrone(c, lvl, t, gy);
  drawKing(c, lvl, t);
  drawThawBeam(c, lvl, gy);
  drawEndingRobin(c, lvl, t, gy);
}

// The thaw beam: a warm band sweeping west to east across the whole level,
// and the only warm light the game has ever put on this ground. Behind it the
// world is already healing — every state change is keyed to the same x.
function drawThawBeam(c, lvl, gy) {
  const e = lvl.ending9;
  if (!e?.started) return;
  const bx = beamX(e);
  if (bx < 0 || bx > 6200) return;
  c.globalAlpha = 0.30;
  c.fillStyle = '#ffd75e';
  c.fillRect(bx - 30, 0, 60, gy);
  c.globalAlpha = 0.16;
  c.fillRect(bx - 90, 0, 180, gy); // the shimmer either side of it
  c.globalAlpha = 0.10;
  c.fillStyle = '#ffe9b0';
  c.fillRect(0, 0, Math.max(0, bx - 30), gy); // everything it has already passed
  c.globalAlpha = 1;
}

// The robin comes back and perches on the throne rim. The first warm colour
// in the level is a bird, not a fire.
function drawEndingRobin(c, lvl, t, gy) {
  const r = lvl.ending9?.robin;
  if (!r) return;
  const fly = Math.min(1, r.t / 1.5);
  const x = 5200 + (5760 - 5200) * fly;
  const y = gy - 40 - 180 * (1 - fly) - Math.sin(fly * Math.PI) * 40;
  drawCreature(c, 'bird', x, y, 1, t);
}

// A warm glow: concentric circles at very low alpha, the undercroft torches'
// pattern. Canvas gradients are objects the recording context cannot
// serialise, so every glow in this game is stacked like this — and it has to
// be circles, because a stack of rects reads as a box, not as light.
function glow(c, cx, cy, r, colour, peak) {
  c.save();
  c.fillStyle = colour;
  for (let i = 4; i >= 1; i--) {
    c.globalAlpha = peak * 0.3;
    c.beginPath();
    c.arc(cx, cy, r * i / 4, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

// ---- the fountain (seed 1's shell) --------------------------------------
// A splash caught mid-air. The warm glint deep in the water every ~4 s is the
// level-5 bush cue, retuned: something is in here, and it is not cold.
function drawFountain(c, lvl, t, gy) {
  const f = lvl.fountain;
  if (!f) return;
  if (f.shattered) { // the two halves fall away over 0.6 s and stay down
    const k = Math.min(1, f.t / 0.6);
    c.fillStyle = '#8fd3f4';
    c.globalAlpha = 1 - k * 0.6;
    c.fillRect(f.x - 14 - k * 26, f.y + k * 90, 16, 60 - k * 30);
    c.fillRect(f.x + f.w - 2 + k * 26, f.y + k * 90, 16, 60 - k * 30);
    c.globalAlpha = 1;
    return;
  }
  const lit = prop(c, 'frozen_fountain', f.x + f.w / 2, f.y + f.h, f.h);
  if (lit) { drawFountainGlint(c, f, t); return; }
  const slice = f.h / 10;
  c.fillStyle = '#7ec8b8'; // the column: clear blue-green ice, tapering up
  for (let i = 0; i < 10; i++) {
    const inset = (9 - i) * 1.6;
    c.fillRect(f.x + inset, f.y + i * slice, f.w - inset * 2, slice + 1);
  }
  c.fillStyle = '#c8f0ff'; // frozen droplets, hashed off their index
  for (let i = 0; i < 7; i++) {
    c.fillRect(f.x + ((i * 13) % 34), f.y + ((i * 29) % (f.h - 12)), 4, 4);
  }
  drawFountainGlint(c, f, t);
}

// The warm glint deep in the water, every ~4 s: the level-5 bush cue, and the
// only reason to shoot a decorative fountain. It is drawn over whichever
// column is in use, because it is the message, not the sculpture.
function drawFountainGlint(c, f, t) {
  const glint = Math.max(0, Math.sin(t * Math.PI * 2 / 4));
  if (glint <= 0) return;
  c.globalAlpha = glint * 0.8;
  c.fillStyle = '#ffd75e';
  c.fillRect(f.x + 16, f.y + f.h * 0.55, 8, 8);
  c.globalAlpha = 1;
}

// ---- the hearths ---------------------------------------------------------
// Unlit: an iron frame around a flame sculpted in ice. Lit: the same frame
// with a real flame rising out of it over 0.8 s. The ember glint appears only
// on the NEXT brazier while its seed is held — the strict "plant me here" cue.
function drawBrazier(c, lvl, k, t, gy) {
  const th = lvl.thaw, ring = th.rings[k];
  const x = BRAZIERS[k], y = gy - 56;
  // The iron is a sheet; the flame is not. Whether a hearth is lit is the
  // level's whole state of play, so its fire stays a pure function of the
  // ring and is drawn over the bowl either way.
  if (!prop(c, 'brazier', x + 24, gy, 64)) {
    c.fillStyle = '#3a3f48'; // the iron frame
    c.fillRect(x + 6, y + 34, 36, 22);
    c.fillRect(x, y + 52, 48, 4);
    c.fillStyle = '#2a2e36';
    c.fillRect(x + 20, y + 44, 8, 12);
  }
  if (!ring.lit) {
    const shimmer = 0.75 + 0.15 * Math.sin(t * 1.5 + k);
    c.globalAlpha = shimmer;
    c.fillStyle = '#bfe4f0'; // the flame, sculpted in ice and going nowhere
    c.beginPath();
    c.moveTo(x + 24, y);
    c.lineTo(x + 38, y + 34);
    c.lineTo(x + 10, y + 34);
    c.closePath();
    c.fill();
    c.fillStyle = '#e8f7fc';
    c.fillRect(x + 21, y + 12, 6, 20);
    c.globalAlpha = 1;
    if (nextHearth(lvl, k)) { // the warm ember: the only warm thing until it lights
      c.globalAlpha = 0.5 + 0.4 * Math.sin(t * 4);
      c.fillStyle = '#ffd75e';
      c.fillRect(x + 21, y + 40, 6, 6);
      c.globalAlpha = 1;
    }
    return;
  }
  const rise = ring.igniteT; // 0 -> 1 over IGNITE_FLAME
  const h = 10 + rise * 34;
  const flick = Math.sin(t * 9 + k * 2) * 3 * rise;
  glow(c, x + 24, y + 40, 120, '#ffb347', 0.22 + 0.05 * Math.sin(t * 7 + k));
  c.fillStyle = '#ff8c42';
  c.beginPath();
  c.moveTo(x + 24 + flick, y + 34 - h);
  c.lineTo(x + 38, y + 34);
  c.lineTo(x + 10, y + 34);
  c.closePath();
  c.fill();
  c.fillStyle = '#ffd75e';
  c.fillRect(x + 20, y + 34 - h * 0.55, 8, h * 0.55);
}

// Ring k glints when it is the FIRST unlit ring and its own seed is held.
function nextHearth(lvl, k) {
  const th = lvl.thaw;
  if (th.rings[k].lit) return false;
  for (let i = 0; i < k; i++) if (!th.rings[i].lit) return false;
  return (lvl.relics ?? []).some(r => r.id === 'seed' + (k + 1) && r.taken && !r.planted);
}

// The melt ring's receding edge: a circle of water drips shrinking from 140 px
// to nothing as the floor under it turns from ice to wet stone.
function drawRings(c, lvl, t, gy) {
  for (const r of lvl.thaw.rings) {
    if (!r.lit || r.t >= 1) continue;
    const rad = 140 * (1 - r.t), cx = r.x + 24;
    c.strokeStyle = '#8fb4cc';
    c.lineWidth = 2;
    c.globalAlpha = 0.6;
    c.beginPath();
    c.moveTo(cx - rad, gy - 2);
    c.lineTo(cx + rad, gy - 2);
    c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = '#a8d0e8'; // drips falling off the edge
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      c.fillRect(cx + side * rad - 1, gy - 10 + ((t * 40 + i * 7) % 10), 2, 4);
    }
  }
}

// ---- the three ice blocks ------------------------------------------------
// A matte block with the creature visible inside it. The states past 'frozen'
// belong to M2 (the shatter) and M3 (the release); the draw reads them now so
// those milestones are data-only.
function drawIceBlock(c, b, kind, t) {
  if (!b || b.state === 'gone') return;
  if (b.state === 'frozen' || b.state === 'releasing' || b.state === 'thawing') {
    const crack = b.state === 'frozen' ? 0 : Math.min(1, b.t / 0.5);
    c.globalAlpha = 0.85 - crack * 0.5;
    c.fillStyle = '#8fb8d8'; // the block
    c.fillRect(b.x, b.y, b.w, b.h);
    c.fillStyle = '#b8dcf0';
    c.fillRect(b.x + 3, b.y + 3, b.w - 6, 6);
    c.globalAlpha = 1;
    drawCreature(c, kind, b.x + b.w / 2, b.y + b.h, 1, t);
    if (crack > 0) { // crack lines racing across the face
      c.strokeStyle = '#e8f7fc';
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(b.x + 6 + i * 13, b.y + 4);
        c.lineTo(b.x + 2 + i * 13 + crack * 10, b.y + 4 + crack * (b.h - 8));
        c.stroke();
      }
    }
    return;
  }
  if (b.state === 'shattered') { // the block is gone; the creature is not
    drawCreature(c, kind, b.x + b.w / 2, b.y + b.h, 1, t);
    return;
  }
  if (b.state === 'running') { // the hare, going home, in hops
    const hop = Math.abs(Math.sin(b.t * 9)) * 7;
    drawCreature(c, kind, b.x + b.w / 2, b.y + b.h - hop, 1, t);
    return;
  }
  // Each leaving takes its own time — the hare is gone in a third of a
  // second, the wraith takes a full one, the robin a second and a half — so
  // the fade is measured against the beat's own length, not a shared number.
  const FADE = { fading: kind === 'hare' ? 0.3 : 1.0, flying: 1.5 };
  const span = FADE[b.state];
  if (span) {
    const k = Math.min(1, b.t / span);
    c.globalAlpha = Math.max(0, 1 - k);
    const rise = kind === 'hare' ? 0 : k * (kind === 'bird' ? 60 : 20);
    const drift = kind === 'bird' ? k * 80 : 0; // the robin leaves eastward
    drawCreature(c, kind, b.x + b.w / 2 + drift, b.y + b.h - rise, 1, t);
    c.globalAlpha = 1;
  }
}

function drawCreature(c, kind, cx, feet, s, t) {
  if (kind === 'hare') {
    // the hare and the wraith already have sheets: they are level 7's, and
    // this level froze two of them
    if (prop(c, 'hare', cx, feet, 22 * s)) return;
    c.fillStyle = '#ffffff';
    c.fillRect(cx - 10 * s, feet - 18 * s, 20 * s, 14 * s); // body
    c.fillRect(cx + 4 * s, feet - 26 * s, 9 * s, 10 * s); // head
    c.fillRect(cx + 6 * s, feet - 36 * s, 3 * s, 11 * s); // ears
    c.fillRect(cx + 11 * s, feet - 35 * s, 3 * s, 10 * s);
  } else if (kind === 'wraith') {
    if (prop(c, 'wraith', cx, feet, 32 * s)) return;
    c.fillStyle = '#cfd8ff';
    c.fillRect(cx - 9 * s, feet - 30 * s, 18 * s, 22 * s);
    c.fillRect(cx - 6 * s, feet - 10 * s, 12 * s, 8 * s);
    c.fillStyle = '#ffffff';
    c.fillRect(cx - 4 * s, feet - 24 * s, 3 * s, 3 * s);
    c.fillRect(cx + 2 * s, feet - 24 * s, 3 * s, 3 * s);
  } else { // the robin
    if (prop(c, 'robin', cx, feet, 20 * s)) return;
    const flap = Math.sin(t * 14) * 3;
    c.fillStyle = '#5a4a3a';
    c.fillRect(cx - 7 * s, feet - 16 * s, 14 * s, 9 * s);
    c.fillStyle = '#e06a3a'; // the first warm colour in the level
    c.fillRect(cx - 5 * s, feet - 13 * s, 8 * s, 5 * s);
    c.fillStyle = '#5a4a3a';
    c.fillRect(cx + 5 * s, feet - 20 * s, 6 * s, 6 * s);
    c.fillRect(cx - 10 * s, feet - 18 * s + flap, 8 * s, 3 * s); // the wing
  }
}

// ---- the hall's people ---------------------------------------------------
// Matte blue-ice silhouettes, one pose each, 24x48 on the floor. The `drip`
// state (1 s) is the boss's wound answer and the hearth-C pre-taste; the
// ending (M7) is the only thing that actually releases them.
function drawHallFigure(c, f, t, gy) {
  if (f.state === 'gone') return;
  const x = f.x, feet = gy;
  const fade = f.state === 'dissolving' ? Math.max(0, 1 - f.t / 2) : 1;
  c.globalAlpha = 0.9 * fade;
  // One sheet for all five: a person frozen in ice. The couple is two of it
  // side by side and the child is the same figure smaller — five separate
  // drawings of a silhouette nobody gets closer than a screen to would be
  // five things to keep in step for no gain.
  if (spriteReady('ice_figure')) {
    const h = f.kind === 'child' ? 34 : 52;
    if (f.kind === 'couple') {
      const a = prop(c, 'ice_figure', x - 9, feet, h);
      const b = prop(c, 'ice_figure', x + 11, feet, h - 4);
      if (a && b) { c.globalAlpha = 1; drawFigureDrip(c, f, t, gy); return; }
    } else if (prop(c, 'ice_figure', x, feet, h)) {
      c.globalAlpha = 1;
      drawFigureDrip(c, f, t, gy);
      return;
    }
  }
  c.fillStyle = '#6f9ec0';
  if (f.kind === 'couple') { // two bodies, holding hands
    c.fillRect(x - 16, feet - 46, 14, 46);
    c.fillRect(x + 4, feet - 44, 14, 44);
    c.fillRect(x - 3, feet - 26, 8, 3);
  } else if (f.kind === 'child') {
    c.fillRect(x - 6, feet - 28, 12, 28);
    c.fillRect(x - 5, feet - 36, 10, 9);
  } else if (f.kind === 'scholar') { // stooped over a book
    c.fillRect(x - 8, feet - 42, 16, 42);
    c.fillRect(x - 6, feet - 50, 12, 9);
    c.fillRect(x + 6, feet - 34, 12, 4);
  } else if (f.kind === 'attendant') { // a tray held out
    c.fillRect(x - 7, feet - 46, 14, 46);
    c.fillRect(x - 6, feet - 55, 12, 10);
    c.fillRect(x + 6, feet - 32, 16, 3);
  } else { // the guard, mid-step, spear up
    c.fillRect(x - 8, feet - 48, 15, 48);
    c.fillRect(x - 7, feet - 58, 13, 11);
    c.fillRect(x + 9, feet - 66, 3, 66);
  }
  c.globalAlpha = 1;
  drawFigureDrip(c, f, t, gy);
}

// The crack lines and the running water: a wound of hers, or the ending.
function drawFigureDrip(c, f, t, gy) {
  const x = f.x, feet = gy;
  if (f.state === 'drip' || f.state === 'dissolving') {
    const k = f.state === 'drip' ? f.t / 1 : f.t / 2;
    c.strokeStyle = '#c8f0ff';
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(x - 6 + i * 6, feet - 50);
      c.lineTo(x - 8 + i * 6, feet - 50 + k * 40);
      c.stroke();
    }
    c.fillStyle = '#a8d0e8';
    for (let i = 0; i < 4; i++) c.fillRect(x - 6 + i * 4, feet - ((t * 60 + i * 11) % 30), 2, 4);
  }
}

// The hall's two fountains: frozen splashes until the ending's beam crosses
// them, then water again (M7 flips the state; the draw is ready for it).
function drawHallFountain(c, f, t, gy) {
  const x = f.x, base = gy;
  c.fillStyle = '#3d5478'; // the basin
  c.fillRect(x - 30, base - 18, 60, 18);
  if (f.state === 'flowing') {
    c.fillStyle = '#6fb0d8';
    for (let i = 0; i < 8; i++) {
      const k = ((t * 1.2 + i / 8) % 1);
      c.fillRect(x - 3 + Math.sin(i) * 14 * k, base - 100 + k * 82, 4, 8);
    }
    c.fillStyle = '#8fd3f4';
    c.fillRect(x - 26, base - 20, 52, 4);
    return;
  }
  c.fillStyle = '#8fd3f4'; // caught mid-splash
  c.fillRect(x - 5, base - 100, 10, 82);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI - Math.PI / 2;
    c.fillRect(x + Math.sin(a) * 26 - 3, base - 96 + Math.abs(Math.cos(a)) * 20, 6, 6);
  }
}

// ---- the wave shelves ------------------------------------------------------
// There was a frozen wave here — a crest stopped mid-break, the level's set
// piece, with the three shelves cut into its face — and drawn from its sheet
// it read as some strange frozen tree rather than as water, so it is gone.
// The shelves stay: they are the platform rects (level9.js), the way up and
// seed 2's seat, and their lips are drawn to match them.
function drawFrozenWave(c, lvl, t, gy) {
  drawWaveShelves(c, gy);
  void lvl; void t;
}

function drawWaveShelves(c, gy) {
  c.fillStyle = '#b8e8dc'; // shelf lips, matching the platform rects
  for (const [x, y, w] of [[2250, gy - 50, 80], [2330, gy - 105, 80], [2420, gy - 160, 70]]) {
    c.fillRect(x, y - 3, w, 3);
  }
}

// ---- the frost patches (M3 creates them, M4 makes them slide) ------------
function drawFrostPatch(c, pc, gy) {
  const fade = pc.t > 5 ? Math.max(0, 1 - (pc.t - 5)) : 1;
  c.globalAlpha = 0.75 * fade;
  c.fillStyle = '#bfe4f0';
  c.fillRect(pc.x, gy - 14, pc.w, 14);
  c.fillStyle = '#e8f7fc'; // the glint that says "this is new ice"
  c.fillRect(pc.x + 8, gy - 11, Math.max(0, pc.w - 30), 2);
  c.globalAlpha = 1;
}

// ---- the three frost seals ----------------------------------------------
// Drawn from the THAW state, not the door state: in M1 the doors spawn 'open'
// so the level is walkable, and they must still read as sealed. The branch is
// "has this seal's ring been lit, or has its melt begun" — nothing else.
function drawFrostSeal(c, lvl, door, t) {
  const k = lvl.doors.indexOf(door);
  const ring = lvl.thaw.rings[k];
  const melting = (ring && ring.lit) || door.openT > 0; // never door.state: M1's are 'open'
  const { x, w, h } = door;
  if (!melting) {
    // the ice is a texture on a fixed world grid, so all three seals are cut
    // from the same sheet and the hub is the only thing that marks one out
    if (!(drawTileGrid(c, 'tex_frostseal', x, x + w, 0, 0, h, 120, 130))) {
      c.fillStyle = '#7ec8e8'; // a wall of pale ice, floor to ceiling
      c.fillRect(x, 0, w, h);
      c.fillStyle = '#a8dcf0';
      for (let y = 0; y < h; y += 40) c.fillRect(x + 4, y + 6, w - 8, 26);
    }
    c.globalAlpha = 0.6 + 0.2 * Math.sin(t * 3); // the seal's hub, breathing
    c.fillStyle = '#1c3a52';
    c.fillRect(x + 6, h / 2 - 26, w - 12, 52);
    c.globalAlpha = 1;
    return;
  }
  // cracking (0.5 s of crack lines) -> melting (1.2 s of slabs sliding into the
  // floor) -> open (a 20 px remnant: the retreat pocket stays visible)
  const crack = door.state === 'cracking' ? Math.min(1, door.openT / 0.5) : 1;
  const melt = door.state === 'melting' ? Math.min(1, door.openT / 1.2)
    : door.state === 'open' ? 1 : 0;
  c.globalAlpha = 1 - melt;
  if (!(drawTileGrid(c, 'tex_frostseal', x, x + w, 0, melt * h, h, 120, 130))) {
    c.fillStyle = '#7ec8e8';
    c.fillRect(x, melt * h, w, h - melt * h);
  }
  c.globalAlpha = 1;
  if (crack > 0 && melt < 1) {
    c.strokeStyle = '#e8f7fc';
    c.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(x + 8 + i * 12, melt * h);
      c.lineTo(x + 4 + i * 12, melt * h + crack * (h - melt * h));
      c.stroke();
    }
  }
  if (melt > 0) { // water running off what is left
    c.fillStyle = '#a8d0e8';
    for (let i = 0; i < 5; i++) c.fillRect(x + 4 + i * 7, h - ((t * 90 + i * 21) % 60), 2, 6);
  }
  c.fillStyle = '#9ecfe4'; // the 20 px remnant in the floor
  c.fillRect(x, h - 20, w, 20);
}

// ---- the throne ----------------------------------------------------------
// Over the standard dais platform: the ice cap, the throne itself, and (until
// the Queen becomes a real enemy in M4) her frozen pose sitting on it. Once a
// queenboss exists, or the ending has started, this stops drawing her — one
// source of truth for her body.
function drawThrone(c, lvl, t, gy) {
  const dx = 5620, dy = gy - 40;
  c.fillStyle = '#cfe8f4'; // the ice cap over the dais
  c.fillRect(dx, dy - 4, 160, 6);
  c.fillStyle = '#8fb8d8';
  c.fillRect(dx - 6, dy + 12, 172, 4);
  const tx = 5650, ty = dy - 140;
  // The sheet carries its own lit crystal core, so the vein is the flat
  // throne's light source and only the flat throne's: over the carved one it
  // read as a hard bar of glare straight down the middle.
  if (!prop(c, 'ice_throne', tx + 50, dy, 168)) {
    c.fillStyle = '#a8c8ff'; // the vein of light, behind the seat: it lit the
    c.globalAlpha = 0.35 + 0.1 * Math.sin(t * 1.2); // throne before she sat on it
    c.fillRect(tx + 46, ty - 30, 8, 130);
    c.globalAlpha = 1;
    c.fillStyle = '#1d3350'; // the throne, carved dark blue ice
    c.fillRect(tx, ty, 100, 140);
    c.fillStyle = '#2a4668';
    c.fillRect(tx + 10, ty + 30, 80, 110);
  }
  // Her body is the roster entry's draw, sleeping or awake — one source of
  // truth, so the decoration becoming an enemy cannot pop or double up.
}

// The frozen Queen: arms raised, the ice staff, the frost crown. M4's roster
// entry is the same pose at the same spot, so the swap does not pop.
export function drawFrozenQueen(c, x, feet, t, awake = false) {
  const cx = x + 28;
  // Her body is one sheet in both states; frozen, a pale rime is laid over it
  // so the century of ice reads without a second drawing of her.
  if (spriteReady('frostqueen')) {
    c.save();
    c.translate(cx, feet);
    const drew = drawSpriteFeet(c, 'frostqueen', 0, scaleToHeight('frostqueen', 84));
    c.restore();
    if (drew) {
      if (!awake) { // the rime she has been sealed under, in streaks not a slab
        c.globalAlpha = 0.30 + 0.08 * Math.sin(t * 2);
        c.fillStyle = '#bfe4f0';
        for (let i = 0; i < 5; i++) {
          const w = 5 + (i % 3) * 3, h = 54 + (i % 2) * 20;
          c.fillRect(cx - 20 + i * 9, feet - h - (i % 2) * 6, w, h);
        }
        c.globalAlpha = 1;
      }
      return;
    }
  }
  c.globalAlpha = awake ? 1 : 0.92;
  c.fillStyle = awake ? '#4a7ea8' : '#7fb8d4'; // the gown, colder while she is ice
  c.beginPath();
  c.moveTo(cx - 22, feet);
  c.lineTo(cx - 9, feet - 40);
  c.lineTo(cx + 9, feet - 40);
  c.lineTo(cx + 22, feet);
  c.closePath();
  c.fill();
  c.fillStyle = '#a8dcf0'; // torso + arms raised
  c.fillRect(cx - 9, feet - 52, 18, 16);
  c.fillRect(cx - 20, feet - 62, 8, 16);
  c.fillRect(cx + 12, feet - 62, 8, 16);
  c.fillStyle = '#e8f7fc'; // the face, blank with cold
  c.fillRect(cx - 7, feet - 64, 14, 12);
  c.fillStyle = '#cfe8f4'; // the frost crown
  for (let i = 0; i < 5; i++) c.fillRect(cx - 10 + i * 5, feet - 72 - (i % 2) * 4, 3, 10);
  c.fillStyle = '#bfe4f0'; // the ice staff
  c.fillRect(cx + 22, feet - 78, 4, 78);
  c.globalAlpha = 0.6 + 0.2 * Math.sin(t * 2);
  c.fillStyle = '#e8f7fc';
  c.fillRect(cx + 18, feet - 88, 12, 12);
  c.globalAlpha = 1;
}

// ---- the King ------------------------------------------------------------
// The first warm thing in the level: a small dark silhouette with a warm glow
// at the horn. He walks with the player from M3; here he is drawn from
// whatever state the level has put him in.
function drawKing(c, lvl, t) {
  const k = lvl.king;
  if (!k) return;
  const bob = k.state === 'walk' ? Math.sin(t * 8) * 2 : 0;
  const feet = k.y + bob;
  const cx = k.x + k.w / 2;
  glow(c, cx, feet - 34, 34, '#ffd75e', 0.22); // the halo — visible from a screen away
  if (!prop(c, 'king', cx, feet, 56)) {
    c.fillStyle = '#1a1428'; // the body
    c.fillRect(cx - 10, feet - 30, 20, 30);
    c.fillRect(cx - 8, feet - 44, 16, 15);
    c.fillStyle = '#efe6ff'; // the horn
    c.fillRect(cx + 4, feet - 58, 4, 15);
  }
  if (k.state === 'raise' || k.state === 'beam') { // M7: the horn goes up
    c.fillStyle = '#e8c46a';
    c.fillRect(cx + 8, feet - 70, 22, 8);
    c.fillRect(cx + 26, feet - 76, 10, 18);
  }
  c.globalAlpha = 0.8 + 0.2 * Math.sin(t * 3); // the single white glint
  c.fillStyle = '#ffffff';
  c.fillRect(cx + 5, feet - 58, 2, 3);
  c.globalAlpha = 1;
}
