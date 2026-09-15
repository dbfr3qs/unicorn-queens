// Zone backgrounds for multi-zone levels (level 2): outdoor sky with the
// usual ridges, castle-interior stone with arched windows + flickering
// torches, and the boss hall with columns and banners. Screen space with
// parallax, like drawBackground; zones come from level data.
import { background, drawRidge, drawStars, drawParallax, drawZoneParallax, drawThawParallax } from './background.js';
import { spriteReady } from '../sprites.js';
import { NOOK_COVER } from './key.js'; // level 3: the wall the key nook owns
import { drawWall, drawSpriteFeet, scaleToHeight, scaleToWidth } from './sprite.js';
import { lightLevel, clockCuts } from '../clock.js'; // level 8: the spring dim (M3 shared read)

export function drawZones(c, lvl, cam, t, viewW) {
  const left = cam.x - 160, right = cam.x + viewW + 160; // margin for parallax
  for (const z of lvl.zones) {
    if (z.x1 < left || z.x0 > right) continue;
    const sx0 = z.x0 - cam.x;
    const sx1 = z.x1 - cam.x;
    if (z.kind === 'outdoor') {
      c.save();
      c.beginPath();
      c.rect(sx0, 0, sx1 - sx0, lvl.groundY);
      c.clip();
      if (!(drawParallax(c, lvl, cam, viewW))) {
        drawStars(c, cam.x * 0.2, t);
        drawRidge(c, background.far, cam.x * 0.35, '#241543', lvl.groundY);
        drawRidge(c, background.near, cam.x * 0.6, '#2f1c55', lvl.groundY);
      }
      c.restore();
    } else if (z.kind === 'dungeon' || z.kind === 'dungeon-hall') {
      drawDungeon(c, z.kind === 'dungeon-hall', z.x0, z.x1, sx0, sx1, lvl, cam, t);
    } else if (z.kind === 'deep' || z.kind === 'deep-hall') {
      drawDeep(c, z.kind === 'deep-hall', z.x0, z.x1, sx0, sx1, lvl, cam, t);
    } else if (z.kind === 'forest') {
      drawForestZone(c, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else if (z.kind === 'mire' || z.kind === 'mire-deep') {
      drawMireZone(c, z.kind === 'mire-deep', z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else if (z.kind === 'snowfield' || z.kind === 'spire' || z.kind === 'throne') {
      drawPeakZone(c, z.kind, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else if (z.kind === 'skybridge' || z.kind === 'citadel' || z.kind === 'citadel-deep' || z.kind === 'observatory') {
      drawCitadelZone(c, z.kind, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else if (z.kind === 'glacier' || z.kind === 'palace' || z.kind === 'frosthall' || z.kind === 'frostthrone') {
      drawFrozenThroneZone(c, z.kind, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else {
      drawStone(c, z.kind === 'hall', z.x0, z.x1, sx0, sx1, lvl, cam, t);
    }
  }
}

// The undercroft: brown brick courses (world-anchored so the pattern is
// stable while the camera scrolls), a torch sconce per interval with a
// seeded per-torch flicker + warm concentric glow (no gradients, so the
// snapshot stays text), and a dark alcove between torches. The hall
// variant: darker brick, denser torches, big pillars.
// A hall's pillar from a sheet — one per hall stone, each in its wall's own
// palette — with the old two-rectangle column as the fallback. `h` is the
// column's height without its capital, as the vector one was sized.
function drawPillar(c, sheet, x, gy, h, shaft, cap, w = 28) {
  if (spriteReady(sheet)) {
    c.save();
    c.translate(x, gy);
    const drew = drawSpriteFeet(c, sheet, 0, scaleToHeight(sheet, h + 14));
    c.restore();
    if (drew) return;
  }
  c.fillStyle = shaft;
  c.fillRect(x - w / 2, gy - h, w, h);
  c.fillStyle = cap;
  c.fillRect(x - w / 2 - 4, gy - h - 14, w + 8, 14); // capital
}

function drawDungeon(c, isHall, zx0, zx1, sx0, sx1, lvl, cam, t) {
  const gy = lvl.groundY;
  if (!(drawWall(c, 'wall_dungeon', zx0, zx1, cam.x, gy))) {
    c.fillStyle = isHall ? '#20120a' : '#281810'; // wall
    c.fillRect(sx0, 0, sx1 - sx0, gy);
    c.fillStyle = isHall ? '#150b05' : '#1a0f08'; // mortar
    for (let wy = 40; wy < gy; wy += 28) c.fillRect(sx0, wy, sx1 - sx0, 3); // courses
    for (let wy = 40, row = 0; wy < gy; wy += 28, row++) {
      const off = row % 2 ? 32 : 0; // staggered vertical joints
      for (let wx = Math.floor(zx0 / 64) * 64 + off; wx < zx1; wx += 64) {
        c.fillRect(wx - cam.x, wy, 3, 28);
      }
    }
  }
  const every = isHall ? 200 : 250; // torch interval
  const clear = a => !(lvl.keyNook && a > NOOK_COVER.x0 - 12 && a < NOOK_COVER.x1 + 12);
  for (let wx = Math.ceil(zx0 / every) * every + 60; wx < zx1; wx += every) {
    const x = wx - cam.x;
    if (clear(wx)) { // a torch, unless the nook's arch stands where it would
      const fl = Math.sin(t * 7 + (wx * 0.71) % 6.28) * 2; // seeded flicker
      c.save(); // warm glow
      c.fillStyle = '#ff9a3c';
      c.globalAlpha = 0.05;
      c.beginPath(); c.arc(x, 300, 70, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.07;
      c.beginPath(); c.arc(x, 300, 42, 0, Math.PI * 2); c.fill();
      c.restore();
      c.fillStyle = isHall ? '#3a2a18' : '#4a3420'; // sconce
      c.fillRect(x - 3, 306, 6, 18);
      c.fillStyle = '#ff8c42';
      c.fillRect(x - 4 + fl * 0.5, 292 + fl * 0.3, 8, 14);
      c.fillStyle = '#ffd166';
      c.fillRect(x - 2, 296 + fl * 0.3, 4, 8);
    }
    // the decorative alcove between the torches — except where the key nook
    // already puts a real one in the wall
    const ax = wx + every / 2;
    if (clear(ax - 34) && clear(ax + 34)) {
      c.fillStyle = '#0d0703';
      c.beginPath();
      c.arc(x + every / 2, 250, 34, Math.PI, 0);
      c.rect(x + every / 2 - 34, 250, 68, 100);
      c.fill();
    }
  }
  if (isHall) {
    for (let wx = zx0 + 120; wx < zx1; wx += 240) drawPillar(c, 'pillar_dungeon', wx - cam.x, gy, 260, '#31200f', '#41290f'); // big pillars
  }
}

// The Dragon's Layer: green-black stone, moss tufts on the brick joints,
// seeded drips, floor puddles, phosphorescent moss glow spots (the layer's
// own dim light), dim torches. The hall variant: darker wall, dark-green
// pillars, bone dressing. All decoration is a pure function of world x and
// time — no RNG, so snapshots stay text-stable.
function drawDeep(c, isHall, zx0, zx1, sx0, sx1, lvl, cam, t) {
  const gy = lvl.groundY;
  const deepWall = drawWall(c, 'wall_deep', zx0, zx1, cam.x, gy);
  if (!deepWall) {
  c.fillStyle = isHall ? '#101712' : '#141d16'; // wall
  c.fillRect(sx0, 0, sx1 - sx0, gy);
  c.fillStyle = '#0c130e'; // mortar
  for (let wy = 40; wy < gy; wy += 28) c.fillRect(sx0, wy, sx1 - sx0, 3); // courses
  for (let wy = 40, row = 0; wy < gy; wy += 28, row++) {
    const off = row % 2 ? 32 : 0; // staggered vertical joints
    for (let wx = Math.floor(zx0 / 64) * 64 + off; wx < zx1; wx += 64) {
      c.fillStyle = '#0c130e';
      c.fillRect(wx - cam.x, wy, 3, 28);
      if ((wx * 7 + row * 13) % 11 === 0) { // moss tuft on the joint
        c.fillStyle = '#2e4a2a';
        c.fillRect(wx - cam.x - 3, wy - 3, 8, 4);
        c.fillRect(wx - cam.x + 1, wy - 5, 4, 3);
      }
    }
  }
  } // the generated wall_deep texture is already mossy, so its tufts come with the bricks
  c.fillStyle = '#4a7a3a'; // phosphorescent moss glow spots
  for (let wx = Math.ceil(zx0 / 260) * 260 + 90; wx < zx1; wx += 260) {
    c.globalAlpha = 0.08 + Math.sin(t * 0.8 + (wx * 0.13) % 6.28) * 0.03;
    c.beginPath(); c.arc(wx - cam.x, 380, 26, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  c.fillStyle = '#3a5a4a'; // drips: seeded x, time-phased fall
  for (let wx = Math.ceil(zx0 / 140) * 140 + 40; wx < zx1; wx += 140) {
    const ph = (t * 0.45 + (wx * 0.37) % 1) % 1;
    c.fillRect(wx - cam.x, 200 + ph * (gy - 210), 2, 7);
  }
  for (let wx = Math.ceil(zx0 / 230) * 230 + 60; wx < zx1; wx += 230) { // puddles
    if ((lvl.lava ?? []).some(m => wx + 24 > m.x && wx - 24 < m.x + m.w)) continue;
    c.fillStyle = '#0a120c';
    c.fillRect(wx - cam.x - 24, gy, 48, 5);
    c.fillStyle = '#1d3324'; // faint reflection streak
    c.fillRect(wx - cam.x - 18, gy, 30, 2);
  }
  const every = isHall ? 250 : 320; // torch interval
  for (let wx = Math.ceil(zx0 / every) * every + 60; wx < zx1; wx += every) {
    const x = wx - cam.x;
    const fl = Math.sin(t * 7 + (wx * 0.71) % 6.28) * 2; // seeded flicker
    c.save(); // warm glow, dimmer than the undercroft
    c.fillStyle = '#ff9a3c';
    c.globalAlpha = 0.04;
    c.beginPath(); c.arc(x, 300, 70, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.05;
    c.beginPath(); c.arc(x, 300, 42, 0, Math.PI * 2); c.fill();
    c.restore();
    c.fillStyle = '#2a3a2a'; // sconce
    c.fillRect(x - 3, 306, 6, 18);
    c.fillStyle = '#ff8c42';
    c.fillRect(x - 4 + fl * 0.5, 292 + fl * 0.3, 8, 14);
    c.fillStyle = '#ffd166';
    c.fillRect(x - 2, 296 + fl * 0.3, 4, 8);
  }
  if (isHall) {
    for (const px of [3680, 3940, 4420, 4700]) drawPillar(c, 'pillar_deep', px - cam.x, gy, 260, '#1a241a', '#243324'); // dark-green pillars, clear of the shaft
    for (const px of [3820, 4300, 4600]) drawBones(c, px - cam.x, gy);
  } else {
    for (const px of [2750, 3350]) drawBones(c, px - cam.x, gy); // vault dressing
    drawTreasure(c, 3480 - cam.x, gy);
  }
}

// The deep-woods band: from this world x the forest sky and dressing
// shift one shade darker (level 5).
const DEEP_X = 3700;

// Daylight sky shared by the gate and forest zones: sky band, warm sun
// disc with two halo rings (slowest parallax), and four drifting cloud
// blobs (a pure time function with wrap — no particle state, like the
// deep zone's drips). All text-snapshot friendly (no gradients).
function drawDaySky(c, sx0, w, lvl, cam, t, viewW) {
  c.fillStyle = '#7ec8f0';
  c.fillRect(sx0, 0, w, lvl.groundY);
  const sunX = 640 - cam.x * 0.05, sunY = 88;
  c.save();
  c.fillStyle = '#ffe9a3';
  c.globalAlpha = 0.18;
  c.beginPath(); c.arc(sunX, sunY, 52, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.3;
  c.beginPath(); c.arc(sunX, sunY, 40, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  c.beginPath(); c.arc(sunX, sunY, 28, 0, Math.PI * 2); c.fill();
  c.restore();
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) {
    const span = viewW + 260;
    const cx = ((i * 230 + 80 - t * (8 + i * 3)) % span + span) % span - 130;
    const cy = 56 + ((i * 67) % 110);
    c.globalAlpha = 0.75;
    c.beginPath(); c.ellipse(cx, cy, 34 + i * 4, 10 + i, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(cx + 24 + i * 3, cy + 4, 24 + i * 3, 8 + i, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(cx - 22 - i * 2, cy + 5, 20 + i * 2, 7 + i, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
}

// A daylight ridge tiled so a 5600 px level stays covered (the shared
// background ridges only span ~1360/1760 px). `trees` optionally draws a
// conifer on each peak — the tree line along the near ridge.
function drawHillRidge(c, peaks, period, off, color, gy, trees) {
  const shift = off % period;
  c.save();
  c.translate(-shift, 0);
  c.fillStyle = color;
  for (const k of [0, 1]) {
    c.beginPath();
    c.moveTo(k * period - 200, gy);
    for (const p of peaks) {
      const x = p.x + k * period;
      c.lineTo(x, gy);
      c.lineTo(x + p.w / 2, gy - p.h);
      c.lineTo(x + p.w, gy);
    }
    c.lineTo(k * period + 2000, gy);
    c.closePath();
    c.fill();
    if (trees) {
      c.fillStyle = trees;
      for (const p of peaks) {
        const tx = p.x + p.w / 2 + k * period;
        c.beginPath();
        c.moveTo(tx - 9, gy - p.h);
        c.lineTo(tx, gy - p.h - 26);
        c.lineTo(tx + 9, gy - p.h);
        c.closePath();
        c.fill();
      }
      c.fillStyle = color;
    }
  }
  c.restore();
}




// The enchanted forest (level 5): the day sky across the zone, then the
// deep-woods darkening band over world x >= DEEP_X.
function drawForestZone(c, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  c.save();
  c.beginPath(); c.rect(sx0, 0, sx1 - sx0, lvl.groundY); c.clip();
  if (!(drawZoneParallax(c, 'bg_forest_sky', 'bg_forest_hills', 220, lvl, cam, viewW))) {
    drawDaySky(c, sx0, sx1 - sx0, lvl, cam, t, viewW);
    drawHillRidge(c, background.far, 1360, cam.x * 0.35, '#79b86a', lvl.groundY, null);
    drawHillRidge(c, background.near, 1760, cam.x * 0.6, '#4e9a4e', lvl.groundY, '#3a7d42');
  }
  c.restore();
  if (zx1 > DEEP_X) { // the deep woods: one shade darker
    const dx0 = Math.max(zx0, DEEP_X) - cam.x;
    const dw = Math.min(zx1, lvl.width) - Math.max(zx0, DEEP_X);
    if (dw > 0) {
      c.fillStyle = 'rgba(8, 30, 16, 0.18)';
      c.fillRect(dx0, 0, dw, lvl.groundY);
    }
  }
}

// Dragon bones: rib base, three ribs, skull with eye sockets.
function drawBones(c, x, gy) {
  c.fillStyle = '#c9c2a8';
  c.fillRect(x, gy - 6, 26, 6);
  c.fillRect(x + 4, gy - 12, 4, 8);
  c.fillRect(x + 12, gy - 14, 4, 10);
  c.fillRect(x + 20, gy - 11, 4, 7);
  c.beginPath(); c.arc(x + 34, gy - 9, 7, 0, Math.PI * 2); c.fill(); // skull
  c.fillStyle = '#101712';
  c.fillRect(x + 31, gy - 10, 2, 3);
  c.fillRect(x + 36, gy - 10, 2, 3);
}

// A mound of gold with a few bright coins.
function drawTreasure(c, x, gy) {
  c.fillStyle = '#b8860b';
  c.fillRect(x, gy - 8, 40, 8);
  c.fillRect(x + 8, gy - 13, 24, 5);
  c.fillStyle = '#ffd75e';
  c.fillRect(x + 6, gy - 6, 4, 4);
  c.fillRect(x + 18, gy - 10, 4, 4);
  c.fillRect(x + 30, gy - 6, 4, 4);
}

// ---- The Blackmire (level 6) ----
// Gloom sky, pale moon, the snow-capped peak (the story's anchor), the
// wizard's fly-by, drifting fog, fireflies, bare cypress lines. All pure
// functions of world x / screen x and time — no RNG, snapshot-stable.
// `deep` (mire-deep) darkens a shade and brightens + grows the peak.

// The mire sky: green-black bands (flat fills, no gradients) + the pale
// moon at a fixed screen position (slowest parallax, two halo rings).
function drawMireSky(c, sx0, w, lvl, cam, deep) {
  c.fillStyle = deep ? '#0a130d' : '#0d1a12';
  c.fillRect(sx0, 0, w, lvl.groundY);
  c.fillStyle = deep ? '#101d14' : '#13221a'; // faintly lighter horizon band
  c.fillRect(sx0, lvl.groundY - 140, w, 140);
  const mx = 620 - cam.x * 0.05, my = 90;
  c.save();
  c.fillStyle = '#cfe8c8';
  c.globalAlpha = 0.1;
  c.beginPath(); c.arc(mx, my, 54, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.2;
  c.beginPath(); c.arc(mx, my, 42, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  c.beginPath(); c.arc(mx, my, 26, 0, Math.PI * 2); c.fill();
  c.restore();
}

// The peak: a big snow-capped mountain, world-anchored at parallax 0.2.
function drawMireMountain(c, cam, deep, gy) {
  const s = deep ? 1.15 : 1;
  const sx = (5000 - cam.x) * 0.2; // parallax world anchor
  const top = gy - 340 * s;
  c.fillStyle = deep ? '#1d2c20' : '#182418';
  c.beginPath();
  c.moveTo(sx - 320 * s, gy);
  c.lineTo(sx, top);
  c.lineTo(sx + 320 * s, gy);
  c.closePath();
  c.fill();
  c.fillStyle = deep ? '#d8e4d4' : '#c4d4c0'; // snow cap with a ragged base
  c.beginPath();
  c.moveTo(sx - 70 * s, top + 80 * s);
  c.lineTo(sx, top);
  c.lineTo(sx + 70 * s, top + 80 * s);
  c.lineTo(sx + 42 * s, top + 60 * s);
  c.lineTo(sx + 16 * s, top + 76 * s);
  c.lineTo(sx - 12 * s, top + 58 * s);
  c.lineTo(sx - 40 * s, top + 74 * s);
  c.closePath();
  c.fill();
}

// The wizard on his flying pig: every ~40 s he crosses the sky (a pure t
// function, visible ~6 s of the cycle) — the easter-egg story glue.
function drawMireWizard(c, t, viewW) {
  const cyc = t % 40;
  if (cyc > 6) return;
  const pr = cyc / 6; // 0..1 across the sky
  const x = -40 + pr * (viewW + 80);
  const y = 150 - Math.sin(pr * Math.PI) * 18;
  c.save();
  c.globalAlpha = 0.55;
  c.fillStyle = '#42546b'; // dim silhouette
  c.beginPath(); c.ellipse(x, y, 11, 6, 0, 0, Math.PI * 2); c.fill(); // pig body
  c.fillRect(x + 9, y - 5, 6, 4); // head
  c.fillRect(x - 4, y + 4, 2, 5); // legs
  c.fillRect(x + 3, y + 4, 2, 5);
  c.beginPath(); c.ellipse(x - 2, y - 8, 6, 3, -0.4, 0, Math.PI * 2); c.fill(); // wing
  c.fillRect(x - 3, y - 14, 5, 6); // wizard body
  c.beginPath(); // hat
  c.moveTo(x - 5, y - 14); c.lineTo(x + 1, y - 22); c.lineTo(x + 4, y - 14);
  c.closePath(); c.fill();
  c.restore();
}

// Drifting fog bands: screen-space wrap (like the daylight clouds), the
// per-band drift speed encodes the parallax (0.15/0.3/0.45), alpha pulses.
function drawMireFog(c, t, viewW, deep) {
  const n = deep ? 4 : 3;
  c.fillStyle = '#9fb8a0';
  for (let i = 0; i < n; i++) {
    const span = viewW + 420;
    const cx = (((i * 330 + 100 - t * (6 + i * 5)) % span) + span) % span - 210;
    const cy = 170 + i * 95;
    c.globalAlpha = 0.05 + Math.sin(t * 0.3 + i * 1.9) * 0.02;
    c.beginPath(); c.ellipse(cx, cy, 260 + i * 60, 16 + i * 3, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(cx + 140 + i * 30, cy + 8, 160 + i * 40, 12 + i * 2, 0, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

// Seven fireflies on seeded Lissajous drifts, world-anchored to the zone.
function drawMireFireflies(c, zx0, zx1, cam, t) {
  c.fillStyle = '#ffd97a';
  for (let i = 0; i < 7; i++) {
    const hx = zx0 + 60 + i * ((zx1 - zx0 - 120) / 6);
    const hy = 240 + ((i * 53) % 200);
    const x = hx + Math.sin(t * 0.4 + i * 1.7) * 30 - cam.x;
    const y = hy + Math.sin(t * 0.7 + i * 2.3) * 18;
    c.globalAlpha = Math.max(0.1, 0.45 + Math.sin(t * 2 + i * 2.9) * 0.35);
    c.fillRect(x, y, 2, 2);
  }
  c.globalAlpha = 1;
}

// A bare cypress line tiled in parallax space: trunks with drooping
// branch nubs. `webs` adds overhead web threads between trunks
// (the mire-deep only).
function drawCypressLine(c, cam, viewW, gy, par, period, hMin, hVar, color, webs) {
  const shift = cam.x * par;
  const start = Math.floor((shift - 120) / period) * period;
  let prev = null;
  for (let k = start; k < shift + viewW + 120; k += period) {
    const i = ((k / period) % 97 + 97) % 97; // seeded index
    const jx = (i * 71) % 80;
    const x = k + jx - shift;
    const h = hMin + ((i * 37) % hVar);
    c.fillStyle = color;
    c.fillRect(x - 2, gy - h, 4, h); // trunk
    for (let b = 1; b <= 4; b++) { // drooping nubs
      const by = gy - h + (h * b) / 5;
      const len = 9 + ((i * 13 + b * 7) % 8);
      c.fillRect(x - 2 - len, by, len, 2);
      c.fillRect(x + 2, by + 4, len, 2);
    }
    if (webs) {
      const ty = gy - h + 6;
      if (prev) {
        c.strokeStyle = 'rgba(230, 238, 226, 0.18)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(prev.x, prev.y);
        c.lineTo(x - 2, ty);
        c.stroke();
      }
      prev = { x: x + 2, y: ty };
    }
  }
}


// The mire sky zone (level 6): mire, and the darker mire-deep.
function drawMireZone(c, deep, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  c.save();
  c.beginPath(); c.rect(sx0, 0, sx1 - sx0, lvl.groundY); c.clip();
  if (!(drawZoneParallax(c, 'bg_mire_sky', 'bg_mire_trees', 240, lvl, cam, viewW))) {
    drawMireSky(c, sx0, sx1 - sx0, lvl, cam, deep);
    drawMireMountain(c, cam, deep, lvl.groundY);
  }
  drawMireWizard(c, t, viewW);
  drawMireFog(c, t, viewW, deep);
  drawCypressLine(c, cam, viewW, lvl.groundY, 0.5, 170, 70, 50, deep ? '#141d14' : '#16201a', false);
  drawCypressLine(c, cam, viewW, lvl.groundY, 0.7, 230, 100, 70, deep ? '#101810' : '#121c12', deep);
  drawMireFireflies(c, zx0, zx1, cam, t);
  c.restore();
}

// ---- The Peak (level 7) ----
// Starlit sky (the first starlit level), a silver moon, the spire
// silhouette, falling snow, pine lines, the spire's interior with its
// floating orbs, and the open-air throne above the clouds. All pure
// functions of world x / screen x and time — no RNG, snapshot-stable.
import { windPhase } from '../wind.js';

// The starlit sky: deep blue-black bands (flat fills, no gradients),
// ~40 seeded stars at parallax 0.05 with a slow alpha twinkle, and the
// silver moon (parallax 0.05, two low-alpha halo rings). `clear` (the
// throne zone) is higher, thinner air: more stars.
function drawPeakSky(c, sx0, w, lvl, cam, t, clear) {
  c.fillStyle = '#0a1428';
  c.fillRect(sx0, 0, w, lvl.groundY);
  c.fillStyle = '#1a2c4a'; // faintly lighter horizon band
  c.fillRect(sx0, lvl.groundY - 120, w, 120);
  c.fillStyle = '#cfd8ff';
  const n = clear ? 70 : 40;
  for (let i = 0; i < n; i++) { // seeded star field, parallax 0.05
    const x = ((i * 331 + 97) % 997) / 997 * 1200 - cam.x * 0.05;
    const y = ((i * 211 + 41) % 883) / 883 * (lvl.groundY - 160);
    c.globalAlpha = 0.4 + 0.3 * Math.sin(t * 1.3 + i * 1.7);
    c.fillRect(x, y, 2, 2);
  }
  c.globalAlpha = 1;
  const mx = 560 - cam.x * 0.05, my = 96; // the silver moon
  c.fillStyle = '#e8f0f8';
  c.globalAlpha = 0.1;
  c.beginPath(); c.arc(mx, my, 58, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 0.2;
  c.beginPath(); c.arc(mx, my, 44, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  c.beginPath(); c.arc(mx, my, 26, 0, Math.PI * 2); c.fill();
}

// The spire silhouette: a tall dark purple-black spire at parallax 0.2,
// right of centre, a faint dark glow at its tip (the visual anchor of the
// goal, seen across the snowfield).
// Falling snow: one parallax layer. Flake i is seeded in world x and
// falls at `speed` with wrap; `tilt` (M2: the gust) offsets the drift.
function drawSnowLayer(c, zx0, zx1, lvl, cam, t, par, n, r, speed, tilt) {
  const w = zx1 - zx0;
  c.fillStyle = '#dfe9f5';
  for (let i = 0; i < n; i++) {
    const seed = (i * 733 + 29) % 997;
    const wx = zx0 + (seed / 997) * w;
    const fall = (t * speed + (seed * 13) % lvl.groundY) % lvl.groundY;
    const x = wx - cam.x * par + tilt;
    c.globalAlpha = par > 0.4 ? 0.8 : 0.5;
    c.fillRect(x, fall, r, r);
  }
  c.globalAlpha = 1;
}

// A pine line tiled in parallax space: dark blue-green conifers (three
// stacked triangles) with sparse snow caps, seeded per trunk.
// `haze` fades the far line toward the sky behind it. The two lines used to
// be told apart by colour — a lighter navy far, a darker one near — which a
// single sheet cannot do; distance reading as atmosphere is the same trick
// and it works on art the flat fills could not carry.
function drawPineLine(c, cam, viewW, gy, par, period, hMin, hVar, color, haze = 1) {
  const shift = cam.x * par;
  const start = Math.floor((shift - 120) / period) * period;
  const sheet = spriteReady('pine_snow');
  if (sheet && haze < 1) c.globalAlpha = haze;
  for (let k = start; k < shift + viewW + 120; k += period) {
    const i = ((k / period) % 97 + 97) % 97; // seeded index
    const jx = (i * 71) % 80;
    const x = k + jx - shift;
    const h = hMin + ((i * 37) % hVar);
    if (sheet) {
      c.save();
      c.translate(x, gy);
      // the seeded index also flips every other pine, so a line of one sheet
      // does not read as one tree stamped over and over
      if (i % 2) c.scale(-1, 1);
      drawSpriteFeet(c, 'pine_snow', 0, scaleToHeight('pine_snow', h + 30));
      c.restore();
      continue;
    }
    c.fillStyle = color;
    for (let s = 0; s < 3; s++) { // three stacked triangles
      const yy = gy - (h * s) / 3;
      const hw = 16 + s * 6;
      c.beginPath();
      c.moveTo(x - hw, yy);
      c.lineTo(x, yy - h / 3 - 8);
      c.lineTo(x + hw, yy);
      c.closePath();
      c.fill();
    }
    c.fillStyle = '#dfe9f5'; // a sparse snow cap (seeded: not every pine)
    if (i % 3 === 0) c.fillRect(x - 5, gy - h - 6, 10, 3);
  }
  if (sheet && haze < 1) c.globalAlpha = 1;
}


// The spire interior: purple-black stone (a deeper hall variant) with
// brick courses, and the seven floating orbs (seeded Lissajous drifts,
// warm amber, alpha pulse ~2 s — the level's only warm color).
function drawSpireInterior(c, zx0, zx1, sx0, sx1, lvl, cam, t) {
  const gy = lvl.groundY;
  if (!(drawWall(c, 'wall_spire', zx0, zx1, cam.x, gy))) {
    c.fillStyle = '#1a1026'; // wall
    c.fillRect(sx0, 0, sx1 - sx0, gy);
    c.fillStyle = '#221631'; // mortar courses
    for (let wy = 40; wy < gy; wy += 28) c.fillRect(sx0, wy, sx1 - sx0, 3);
    for (let wy = 40, row = 0; wy < gy; wy += 28, row++) {
      const off = row % 2 ? 32 : 0; // staggered vertical joints
      for (let wx = Math.floor(zx0 / 64) * 64 + off; wx < zx1; wx += 64) {
        c.fillRect(wx - cam.x, wy, 3, 28);
      }
    }
  }
  for (let i = 0; i < 7; i++) { // the floating orbs
    const hx = zx0 + 150 + i * ((zx1 - zx0 - 300) / 6);
    const x = hx + Math.sin(t * 0.3 + i * 1.9) * 40 - cam.x;
    const y = 200 + Math.sin(t * 0.45 + i * 2.6) * 90 + ((i * 53) % 120);
    c.fillStyle = '#ffd9a0';
    c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3 + i * 2.2); // the ~2 s pulse
    c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.6 + 0.2 * Math.sin(t * 3 + i * 2.2);
    c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

// The throne zone: a clearer starfield (higher is thinner air) and the
// sea of clouds far below — a soft white-lavender band with drifting
// puffs (parallax 0.1, a pure time function with wrap).
function drawCloudSea(c, sx0, w, lvl, cam, t, viewW) {
  const gy = lvl.groundY;
  c.fillStyle = '#c8c4e8'; // the band
  c.fillRect(sx0, gy - 60, w, 60);
  c.fillStyle = '#e4e0f8';
  for (let i = 0; i < 5; i++) { // the drifting puffs
    const span = viewW + 420;
    const cx = (((i * 300 + 120 - t * (10 + i * 3)) % span) + span) % span - 210 + sx0;
    c.beginPath(); c.ellipse(cx, gy - 46 + (i % 2) * 10, 90 + i * 14, 14 + i * 2, 0, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = '#f0eefc'; // the bright crest line
  c.fillRect(sx0, gy - 52, w, 4);
}

// The peak sky zone (level 7): gate, snowfield, spire interior, throne.
function drawPeakZone(c, kind, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  c.save();
  c.beginPath(); c.rect(sx0, 0, sx1 - sx0, lvl.groundY); c.clip();
  if (kind === 'spire') {
    drawSpireInterior(c, zx0, zx1, sx0, sx1, lvl, cam, t);
  } else if (kind === 'throne') {
    if (!(drawZoneParallax(c, 'bg_peak_sky', null, 0, lvl, cam, viewW))) {
      drawPeakSky(c, sx0, sx1 - sx0, lvl, cam, t, true);
    }
    drawCloudSea(c, sx0, sx1 - sx0, lvl, cam, t, viewW);
  } else { // snowfield: the starlit sky
    if (!(drawZoneParallax(c, 'bg_peak_sky', 'bg_peak_snow', 260, lvl, cam, viewW))) {
      drawPeakSky(c, sx0, sx1 - sx0, lvl, cam, t, false);
    }
    // the flakes tilt with the wind (the level's read): lean west into the
    // telegraph, swing hard + fall 2.5× in the gust, drift east in the lift
    const ph = windPhase(t);
    const tilt = ph === 'gust' ? -40 : ph === 'updraft' ? 18 : ph === 'telegraph' ? -12 : 0;
    const speedMul = ph === 'gust' ? 2.5 : 1;
    drawSnowLayer(c, zx0, zx1, lvl, cam, t, 0.3, 40, 2, 26 * speedMul, tilt); // far, small, slow
    drawSnowLayer(c, zx0, zx1, lvl, cam, t, 0.5, 24, 3, 46 * speedMul, tilt); // near, larger, faster
    drawPineLine(c, cam, viewW, lvl.groundY, 0.5, 190, 60, 40, '#16233c', 0.55);
    drawPineLine(c, cam, viewW, lvl.groundY, 0.7, 260, 90, 50, '#0f1a30');
  }
  c.restore();
}

function drawStone(c, isHall, zx0, zx1, sx0, sx1, lvl, cam, t) {
  if (!(drawWall(c, 'wall_stone', zx0, zx1, cam.x, lvl.groundY))) {
    c.fillStyle = isHall ? '#191031' : '#211537'; // wall
    c.fillRect(sx0, 0, sx1 - sx0, lvl.groundY);
  }
  if (isHall) {
    for (let wx = zx0 + 90; wx < zx1; wx += 180) drawPillar(c, 'pillar', wx - cam.x, lvl.groundY, 250, '#2c1c4a', '#3a2760', 24); // columns
    for (let wx = zx0 + 180; wx < zx1; wx += 360) { // banners
      const x = wx - cam.x;
      c.fillStyle = '#5a2b6e';
      c.beginPath();
      c.moveTo(x - 16, 90);
      c.lineTo(x + 16, 90);
      c.lineTo(x + 16, 170);
      c.lineTo(x, 190);
      c.lineTo(x - 16, 170);
      c.closePath();
      c.fill();
    }
    return;
  }
  for (let wx = zx0 + 100; wx < zx1 - 60; wx += 300) { // windows + torches
    const x = wx - cam.x;
    c.fillStyle = '#0e0a20'; // night sky through the arch
    c.beginPath();
    c.arc(x + 30, 230, 30, Math.PI, 0);
    c.rect(x, 230, 60, 90);
    c.fill();
    c.fillStyle = '#cfd8ff'; // a few stars, deterministic from world x
    for (let i = 0; i < 4; i++) {
      c.fillRect(x + 8 + ((wx * 7 + i * 29) % 44), 200 + ((wx * 13 + i * 41) % 100), 2, 2);
    }
    const tx = x + 80;
    c.fillStyle = '#8a5f22'; // torch bracket
    c.fillRect(tx, 320, 4, 14);
    const fl = Math.sin(t * 7 + wx * 0.01) * 2; // flicker
    c.fillStyle = '#ff8c42';
    c.fillRect(tx - 2 + fl * 0.5, 306 + fl * 0.3, 8, 12);
    c.fillStyle = '#ffd166';
    c.fillRect(tx, 310 + fl * 0.3, 4, 7);
  }
}

// Level 8 zone pass: the twilight skybridge, the brass interiors, the gear
// hall, the open-ceiling observatory. All animation is a pure function of
// (t, cam.x, the spring cuts, the clock's t/period/gearRot) — no
// Math.random at draw time, so snapshots stay text-stable.
function drawCitadelZone(c, kind, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  c.save();
  c.beginPath(); c.rect(sx0, 0, sx1 - sx0, lvl.groundY); c.clip();
  const gy = lvl.groundY;
  const clock = lvl.clock;
  let light = lightLevel(clockCuts(lvl), clock ? clock.stopped : false); // the dim as the springs go (M3)
  if (clock && !clock.stopped && clock.t < 0.3) light = Math.min(1, light + 0.15); // the chime pulse
  if (kind === 'skybridge') {
    if (!(drawZoneParallax(c, 'bg_citadel_sky', 'bg_citadel_clouds', 220, lvl, cam, viewW))) {
      drawCitadelSky(c, sx0, sx1 - sx0, gy, cam, t, false);
    }
    drawRainbowTail(c, cam, gy);
    drawCloudBands(c, sx0, sx1 - sx0, gy, t);
  } else if (kind === 'observatory') {
    if (!(drawZoneParallax(c, 'bg_citadel_sky', null, 0, lvl, cam, viewW))) {
      drawCitadelSky(c, sx0, sx1 - sx0, gy, cam, t, true);
    }
    drawStarMap(c, zx0, zx1, cam);
    drawCloudDrop(c, sx0, sx1 - sx0, gy, t);
  } else {
    drawCitadelWall(c, kind === 'citadel-deep', zx0, zx1, sx0, sx1, lvl, cam, t);
  }
  if (light < 1) { // the light level, over the sky (the world pass stays bright)
    c.globalAlpha = (1 - light) * 0.6;
    c.fillStyle = '#08061a';
    c.fillRect(sx0, 0, sx1 - sx0, gy);
    c.globalAlpha = 1;
  }
  c.restore();
  if (kind === 'observatory') drawRailing(c, lvl, cam);
}

function drawCitadelSky(c, x, w, gy, cam, t, observatory) { // twilight, banded (no gradients)
  const bands = ['#14122c', '#1a1836', '#201c40', '#262350', '#2c2a52'];
  const step = Math.floor(gy / bands.length);
  for (let i = 0; i < bands.length; i++) {
    c.fillStyle = bands[i];
    c.fillRect(x, i * step, w, step + 1);
  }
  const n = observatory ? 26 : 16; // the star field: index-hashed, parallax 0.2
  const off = (cam.x * 0.2) % 1200;
  c.fillStyle = '#cfd8ff';
  for (let i = 0; i < n; i++) {
    const sxp = x + (((i * 173 + 37) % 1200) - off + 1200) % 1200;
    if (sxp > x + w) continue;
    c.fillRect(sxp, 12 + ((i * 97 + 11) % 300), 2, 2);
  }
  if (observatory) { // three bright stars with a cross glint
    for (let i = 0; i < 3; i++) {
      const sxp = x + (((i * 431 + 89) % 1200) - off + 1200) % 1200;
      if (sxp > x + w) continue;
      const syp = 20 + i * 50;
      c.fillStyle = '#ffffff';
      c.fillRect(sxp, syp, 3, 3);
      c.globalAlpha = 0.6;
      c.fillRect(sxp - 4, syp + 1, 11, 1);
      c.fillRect(sxp + 1, syp - 4, 1, 11);
      c.globalAlpha = 1;
      c.fillStyle = '#cfd8ff';
    }
  }
}

function drawRainbowTail(c, cam, gy) { // the tail the queen climbed, fading west
  const cx = 500 - cam.x * 0.05; // parallax 0.05
  const cols = ['#7ec8ff', '#7ea8e8', '#b89ae8', '#e8a8c8', '#ffd7a8'];
  c.globalAlpha = 0.35;
  c.lineWidth = 6;
  for (let i = 0; i < cols.length; i++) {
    c.strokeStyle = cols[i];
    c.beginPath();
    c.arc(cx, gy + 320, 480 - i * 10, -1.25, -0.45);
    c.stroke();
  }
  c.globalAlpha = 1;
}

function drawCloudBands(c, x, w, gy, t) { // the sea of clouds, two drifting bands
  c.globalAlpha = 0.5;
  for (let band = 0; band < 2; band++) {
    const by = gy - 60 + band * 22;
    const off = (t * 8 + band * 40) % 160;
    c.fillStyle = band ? '#a898c8' : '#b8a8d8';
    for (let bx = x - 160 + off; bx < x + w + 160; bx += 160) {
      c.beginPath();
      c.ellipse(bx, by, 70, 14, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.globalAlpha = 1;
}

function drawCitadelWall(c, deep, zx0, zx1, sx0, sx1, lvl, cam, t) {
  const gy = lvl.groundY;
  const clock = lvl.clock;
  if (!(drawWall(c, 'wall_citadel', zx0, zx1, cam.x, gy))) {
    c.fillStyle = deep ? '#191330' : '#221c3e'; // the wall
    c.fillRect(sx0, 0, sx1 - sx0, gy);
  }
  // the great pendulum silhouette (parallax 0.3, 300 px, the clock's angle).
  // Anchored at 800: visible cam 0–2667, i.e. behind the gate hall and the
  // library (design: "swinging behind the hall") — the old 2000 anchor put
  // it off-view in its own zone (M8 viewport verification).
  const ang = (40 * Math.PI / 180) * Math.sin(2 * Math.PI * clock.t / clock.period);
  const px = 800 - cam.x * 0.3, py = 60;
  if (px > sx0 - 140 && px < sx1 + 140) {
    c.globalAlpha = deep ? 0.14 : 0.1;
    c.fillStyle = '#0a0818';
    c.fillRect(px - 20, py, 40, 24); // the housing
    c.strokeStyle = '#0a0818';
    c.lineWidth = 8;
    c.beginPath(); c.moveTo(px, py + 24); c.lineTo(px + 300 * Math.sin(ang), py + 300 * Math.cos(ang)); c.stroke();
    c.beginPath(); c.arc(px + 300 * Math.sin(ang), py + 300 * Math.cos(ang), 22, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  // the floor lattice: brass lines every 80 px, world-anchored
  c.globalAlpha = 0.15;
  c.fillStyle = '#b8860b';
  for (let wx = Math.floor(zx0 / 80) * 80; wx < zx1; wx += 80) c.fillRect(wx - cam.x, gy - 3, 2, 3);
  c.globalAlpha = 1;
  // the arched windows, every 400 px: twilight + a cloud band + a rainbow wisp
  for (let wx = Math.ceil(zx0 / 400) * 400; wx < zx1; wx += 400) {
    const x = wx - cam.x;
    if (x < sx0 - 80 || x > sx1) continue;
    c.fillStyle = '#1a1836'; // the sky through the arch
    c.beginPath();
    c.arc(x + 30, 200, 30, Math.PI, 0);
    c.rect(x, 200, 60, 110);
    c.fill();
    c.fillStyle = '#2c2a52'; // the cloud band through the glass
    c.fillRect(x, 262, 60, 14);
    c.globalAlpha = 0.5; // the far rainbow wisp
    c.fillStyle = '#e8a8c8';
    c.fillRect(x + 8, 270, 44, 4);
    c.globalAlpha = 1;
    c.fillStyle = '#8a6a2e'; // the brass trim
    c.fillRect(x - 4, 306, 68, 6);
    c.fillRect(x - 4, 196, 68, 4);
  }
  // the lamps, every 500 px: brass sconces, warm glow (the moths' anchors)
  for (let wx = Math.ceil(zx0 / 500) * 500; wx < zx1; wx += 500) {
    const x = wx - cam.x;
    if (x < sx0 - 40 || x > sx1) continue;
    c.fillStyle = '#8a6a2e'; // the sconce
    c.fillRect(x - 3, 330, 6, 26);
    c.beginPath(); c.arc(x, 330, 8, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 0.25; // the warm glow
    c.fillStyle = '#ffd75e';
    c.beginPath(); c.arc(x, 330, 26, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  // the dust motes: 6 per zone, hashed positions, a slow drift
  c.globalAlpha = 0.3;
  c.fillStyle = '#d8c8a8';
  const zw = Math.max(1, sx1 - sx0);
  for (let i = 0; i < 6; i++) {
    const mx = sx0 + ((zx0 * 7 + i * 149) % zw);
    const my = 120 + ((i * 211 + zx0) % 320) + Math.sin(t * 0.7 + i * 1.9) * 14;
    c.fillRect(mx, my, 2, 2);
  }
  c.globalAlpha = 1;
  if (deep) {
    drawClockFace(c, 3600, 180, 100, cam, clock); // the clock face above the gear
    // Anchored at 2100: on-view through the deep atrium (cam 3300–4600),
    // centred at the hub — the old 3600 anchor left it off-view at the face
    // (M8 viewport verification).
    drawGreatGear(c, 2100, 380, cam, clock); // the great gear (parallax 0.5)
  }
}

function drawClockFace(c, wx, wy, r, cam, clock) { // the brass face, one hand on the beat
  const x = wx - cam.x;
  c.fillStyle = '#12102a';
  c.beginPath(); c.arc(x, wy, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#8a6a2e';
  c.lineWidth = 6;
  c.beginPath(); c.arc(x, wy, r, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#b8860b'; // the twelve tick marks
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    c.fillRect(x + Math.cos(a) * (r - 14) - 2, wy + Math.sin(a) * (r - 14) - 2, 4, 4);
  }
  const ha = 2 * Math.PI * clock.t / clock.period - Math.PI / 2; // the hand
  c.strokeStyle = '#d4aa3e';
  c.lineWidth = 4;
  c.beginPath(); c.moveTo(x, wy); c.lineTo(x + Math.cos(ha) * (r - 24), wy + Math.sin(ha) * (r - 24)); c.stroke();
  c.fillStyle = '#b8860b'; // the hub cap
  c.beginPath(); c.arc(x, wy, 6, 0, Math.PI * 2); c.fill();
}

function drawGreatGear(c, wx, wy, cam, clock) { // the 500-px gear, turning with gearRot
  const x = wx - cam.x * 0.5;
  const r = 250;
  const rot = (clock.gearRot ?? 0) * Math.PI * 2;
  c.fillStyle = '#151228';
  c.beginPath(); c.arc(x, wy, r, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#241d40'; // the teeth: notched rectangles around the rim
  for (let i = 0; i < 16; i++) {
    const a = rot + i * Math.PI / 8;
    c.fillRect(x + Math.cos(a) * (r - 6) - 8, wy + Math.sin(a) * (r - 6) - 8, 16, 16);
  }
  c.strokeStyle = '#3a3060'; // the inner ring
  c.lineWidth = 10;
  c.beginPath(); c.arc(x, wy, r - 40, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#b8860b'; // the hub
  c.beginPath(); c.arc(x, wy, 26, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#241d40';
  c.beginPath(); c.arc(x, wy, 12, 0, Math.PI * 2); c.fill();
}

function drawStarMap(c, zx0, zx1, cam) { // brass lines joining five hashed gem points
  const span = Math.max(1, zx1 - zx0 - 240);
  const pts = [];
  for (let i = 0; i < 5; i++) {
    pts.push([zx0 + 120 + ((i * 389 + 53) % span) - cam.x, 60 + ((i * 271 + 17) % 240)]);
  }
  c.globalAlpha = 0.35;
  c.strokeStyle = '#8a6a2e';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 5; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
  c.fillStyle = '#ffd75e';
  for (const [sx, sy] of pts) c.fillRect(sx - 2, sy - 2, 4, 4);
  c.globalAlpha = 1;
}

function drawCloudDrop(c, x, w, gy, t) { // the clouds falling past the deck's west end
  c.globalAlpha = 0.4;
  c.fillStyle = '#b8a8d8';
  for (let i = 0; i < 4; i++) {
    const off = (t * 10 + i * 30) % 120;
    c.beginPath();
    c.ellipse(x + off + i * 300, gy - 20 - i * 8, 60, 12, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

function drawRailing(c, lvl, cam) { // brass railing: the shaft lip and the rim
  const spans = [[5660, 5820], [5940, 6000]];
  c.fillStyle = '#8a6a2e';
  for (const [a, b] of spans) {
    const x0 = a - cam.x, x1 = b - cam.x;
    if (x1 < -40 || x0 > 840) continue;
    c.fillRect(x0, lvl.groundY - 26, x1 - x0, 3); // the top rail
    for (let wx = a; wx <= b; wx += 40) c.fillRect(wx - cam.x, lvl.groundY - 26, 3, 26); // the posts
  }
}

// ---------------------------------------------------------------------------
// Level 9 — The Frozen Throne.
//
// The sky is the level's progress bar: four palette steps from frozen pre-dawn
// to dawn, one per hearth lit, lerped over 1.5 s (lvl.thaw.skyT is a float
// between step indices, so the sky is mid-change while the ring melts). The
// stars fade with it and the hall's frost film thins with it — one number,
// three readouts, so the player never has to be told the level is warming.
//
// Every motion here is a pure function of (t, cam.x, thaw.skyT, blizzard) —
// hashed, never Math.random at draw time, so the snapshots stay stable.
const DAWN = [
  ['#0e1230', '#1c2342', null], // 0 frozen pre-dawn
  ['#141233', '#2a2450', null], // 1 indigo-violet
  ['#241a44', '#4a3468', '#8a6a88'], // 2 mauve first light
  ['#2c2250', '#7a4a78', '#e8a87c'], // 3 dawn: the peach band
];

function lerpHex(a, b, f) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = i => Math.round(((pa >> i) & 255) + (((pb >> i) & 255) - ((pa >> i) & 255)) * f);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export function skyPalette(skyT) {
  const i = Math.max(0, Math.min(2, Math.floor(skyT))), f = Math.max(0, Math.min(1, skyT - i));
  const nb = DAWN[i + 1][2];
  return {
    top: lerpHex(DAWN[i][0], DAWN[i + 1][0], f),
    bottom: lerpHex(DAWN[i][1], DAWN[i + 1][1], f),
    // the horizon band only exists in the last two steps; it fades in over the
    // back half of the step so first light arrives after the sky has moved
    band: nb && f > 0.5 ? lerpHex(DAWN[i + 1][1], nb, (f - 0.5) * 2) : null,
  };
}
// Two straight ramps off the same number. The stars keep a floor — a dawn sky
// with no stars at all reads as daylight, and the level is not there yet; the
// hall's film goes to exactly nothing, because a clear hall IS the third
// hearth's reward and a leftover haze would read as a bug.
const ramp = skyT => Math.max(0, 1 - Math.max(0, skyT) / 3); // 1 at frozen, 0 at dawn
export const starAlpha = skyT => 0.15 + 0.85 * ramp(skyT);
export const hallFilmAlpha = skyT => 0.25 * ramp(skyT);

// The sky as bands rather than a gradient: gradients are objects the recording
// context cannot serialise, and the level's palette is only four steps wide.
function drawThawSky(c, sx0, w, lvl) {
  const gy = lvl.groundY, pal = skyPalette(lvl.thaw?.skyT ?? 0);
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    c.fillStyle = lerpHex2(pal.top, pal.bottom, i / (bands - 1));
    c.fillRect(sx0, Math.floor(gy * i / bands), w, Math.ceil(gy / bands) + 1);
  }
  if (pal.band) { // first light sitting on the horizon
    c.fillStyle = pal.band;
    c.fillRect(sx0, gy - 60, w, 60);
  }
}

// skyPalette already returns rgb() strings, so the band lerp needs an rgb-aware
// mixer rather than the hex one above.
function lerpHex2(a, b, f) {
  const pa = a.match(/\d+/g).map(Number), pb = b.match(/\d+/g).map(Number);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * f)).join(', ')})`;
}

// ~40 stars over the glacier, hashed off the index so the field is identical
// every frame and every run. Parallax 0.05: they are as far away as anything
// in the game gets.
function drawFrostStars(c, sx0, w, lvl, cam, t, skyT) {
  const a = starAlpha(skyT);
  if (a <= 0) return;
  c.fillStyle = '#e8f0ff';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 173 + 37) % 1600) - (cam.x * 0.05) % 1600;
    const y = 20 + ((i * 97 + 11) % 260);
    const sx = sx0 + ((x % 1600) + 1600) % 1600;
    if (sx < sx0 - 4 || sx > sx0 + w) continue;
    c.globalAlpha = a * (0.5 + 0.5 * Math.sin(t * 2 + i));
    c.fillRect(sx, y, 2, 2);
  }
  c.globalAlpha = 1;
}

// Two flake layers. `dense` (the P3 blizzard, a pure read of lvl.blizzard)
// triples the count and doubles the fall speed — the same layer, turned up.
function drawFrostFlakes(c, sx0, w, lvl, t, dense) {
  const h = lvl.groundY + 40;
  const mul = dense ? 3 : 1;
  for (let layer = 0; layer < 2; layer++) {
    const n = (layer ? 16 : 24) * mul;
    c.fillStyle = layer ? '#c8dcf0' : '#ffffff';
    c.globalAlpha = layer ? 0.3 : 0.5;
    for (let i = 0; i < n; i++) {
      const x = sx0 + ((i * 149 + layer * 61) % Math.max(1, Math.round(w)));
      // the phase offset matters as much as the speed: without it seven speeds
      // means seven rows of flakes marching down in formation
      const fall = (t * (18 + (i % 7)) * (dense ? 2 : 1) + i * 37 + layer * 91) % h;
      c.fillRect(x + Math.sin(t + i) * 10, fall - 20, layer ? 2 : 3, layer ? 2 : 3);
    }
  }
  c.globalAlpha = 1;
}

// The palace on the glacier's face: the visual goal, visible from the spawn.
// Parallax 0.2, anchored at 2500 so it sits ahead of the player and grows
// closer without ever being reached in this zone.
function drawPalaceSilhouette(c, lvl, cam) {
  const gy = lvl.groundY, bx = 2500 - cam.x * 0.2;
  c.globalAlpha = 0.5;
  c.fillStyle = '#2b3d63';
  c.fillRect(bx - 180, gy - 300, 360, 300); // the mass
  for (let i = 0; i < 5; i++) { // spires
    const x = bx - 150 + i * 75;
    const hgt = 80 + (i % 2) * 60;
    c.fillRect(x - 10, gy - 300 - hgt, 20, hgt);
    c.beginPath();
    c.moveTo(x - 14, gy - 300 - hgt);
    c.lineTo(x, gy - 330 - hgt);
    c.lineTo(x + 14, gy - 300 - hgt);
    c.closePath();
    c.fill();
  }
  c.fillStyle = '#7ec8ff'; // the cold glow in its arches
  c.globalAlpha = 0.28;
  for (let i = 0; i < 6; i++) c.fillRect(bx - 150 + i * 55, gy - 200, 22, 60);
  c.globalAlpha = 1;
}

// The frozen sea: one still band at the horizon, parallax 0.1. It does not
// move — that is the point. The ending sets it moving (M7).
function drawFrozenSea(c, sx0, w, lvl, cam) {
  const gy = lvl.groundY, off = -cam.x * 0.1;
  c.fillStyle = '#4a6a86';
  c.fillRect(sx0, gy - 90, w, 26);
  c.fillStyle = '#6f93ad'; // the caught crests
  for (let x = Math.floor((sx0 - off) / 60) * 60; x < sx0 + w - off; x += 60) {
    c.fillRect(x + off, gy - 96, 30, 7);
  }
}

// The mist the Sky Citadel's shaft dropped the player through, still hanging
// over the spawn: two slow bands, the three-frame callback to level 8.
function drawShaftMist(c, lvl, cam, t) {
  const gy = lvl.groundY;
  c.fillStyle = '#8fa8c8';
  for (let b = 0; b < 2; b++) {
    const x = (b * 40 + (t * 10) % 80) - cam.x * 0.05, y = gy - 340 + b * 40;
    c.globalAlpha = 0.18 - b * 0.05;
    for (let i = 0; i < 7; i++) { // puffs, not a bar: the shaft's mist still hanging
      c.fillRect(x - 60 + i * 44, y + Math.sin(t * 0.4 + i) * 5, 60 + (i % 3) * 34, 14 + (i % 2) * 10);
    }
  }
  c.globalAlpha = 1;
}

function drawFrozenThroneZone(c, kind, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  const gy = lvl.groundY, w = sx1 - sx0, skyT = lvl.thaw?.skyT ?? 0;
  const dense = !!(lvl.blizzard && lvl.blizzard.t > 0);
  c.save();
  c.beginPath(); c.rect(sx0, 0, w, gy); c.clip();
  if (kind === 'frosthall') { // the interior: no sky, no weather
    if (!(drawWall(c, 'wall_frosthall', zx0, zx1, cam.x, gy))) {
      c.fillStyle = '#1e2438';
      c.fillRect(sx0, 0, w, gy);
    }
    // The high windows are the hall's only view of the thaw: the sky the
    // hearths are changing, seen from inside. Arched, because a rectangle of
    // sky on a stone wall reads as a hole rather than a window.
    for (let wx = Math.floor(zx0 / 300) * 300 + 150; wx < zx1; wx += 300) {
      const x = wx - cam.x;
      const pal = skyPalette(skyT);
      const top = 120, bot = 262, half = 28;
      c.save();
      c.beginPath(); // the arch: a half-round over a straight-sided light
      c.moveTo(x - half, bot);
      c.lineTo(x - half, top + half);
      c.arc(x, top + half, half, Math.PI, 0);
      c.lineTo(x + half, bot);
      c.closePath();
      c.clip();
      c.fillStyle = pal.top;
      c.fillRect(x - half, top, half * 2, bot - top);
      c.fillStyle = pal.bottom; // the horizon sits low in the light
      c.fillRect(x - half, bot - 46, half * 2, 46);
      if (pal.band) { // at three thaws the peach reaches inside the hall
        c.fillStyle = pal.band;
        c.fillRect(x - half, bot - 22, half * 2, 22);
      }
      c.fillStyle = '#7f96b4'; // the mullion, and a transom across the spring line
      c.fillRect(x - 2, top, 4, bot - top);
      c.fillRect(x - half, top + half, half * 2, 3);
      c.restore();
      c.strokeStyle = '#9ab'; // pale ice trim: no brass in here
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x - half, bot);
      c.lineTo(x - half, top + half);
      c.arc(x, top + half, half, Math.PI, 0);
      c.lineTo(x + half, bot);
      c.stroke();
      c.fillStyle = '#9ab'; // the sill
      c.fillRect(x - half - 6, bot, half * 2 + 12, 6);
    }
    const film = hallFilmAlpha(skyT); // the hall's own progress bar
    if (film > 0) {
      c.globalAlpha = film;
      c.fillStyle = '#ffffff';
      c.fillRect(sx0, 0, w, gy);
      c.globalAlpha = 1;
    }
    c.restore();
    return;
  }
  // The sky is two generated skies with the warm one faded in over the cold
  // by the thaw's own number: at 0 and 3 thaws it is exactly one of them.
  const skySprite =     drawThawParallax(c, 'bg_glacier_cold', 'bg_glacier_dawn', skyT / 3,
      null, 0, lvl, cam, viewW);
  if (kind !== 'frostthrone' && !skySprite) drawThawSky(c, sx0, w, lvl);
  if (kind === 'glacier') {
    if (!skySprite) drawFrostStars(c, sx0, w, lvl, cam, t, skyT);
    drawShaftMist(c, lvl, cam, t);
    drawFrozenSea(c, sx0, w, lvl, cam); // world furniture, not sky: always drawn
    drawPalaceSilhouette(c, lvl, cam);
    drawFrostFlakes(c, sx0, w, lvl, t, dense);
  } else if (kind === 'palace') {
    if (!skySprite) drawFrostStars(c, sx0, w, lvl, cam, t, skyT);
    if (drawWall(c, 'wall_palace', zx0, zx1, cam.x, gy)) {
      // the generated facade carries its own windows and courses; the vector
      // ones below would only fight it
      drawFrostFlakes(c, sx0, w, lvl, t, dense);
      c.restore();
      return;
    }
    c.fillStyle = '#2a3a55'; // the carved ice facade
    c.fillRect(sx0, gy - 380, w, 380);
    // Parallax 0.3: the facade slides at a third of the camera, so a window is
    // placed by its own coordinate in that slower space rather than in world x.
    const off = -cam.x * 0.3;
    for (let fx0 = Math.floor((sx0 - off) / 200) * 200; fx0 < sx1 - off; fx0 += 200) {
      const px = fx0 + off;
      c.fillStyle = '#3d5478'; // the frozen window
      c.fillRect(px, gy - 320, 46, 90);
      c.globalAlpha = 0.25;
      c.fillStyle = '#7ec8ff';
      c.fillRect(px + 6, gy - 314, 34, 78);
      c.globalAlpha = 1;
      c.fillStyle = '#4a2b4e'; // a banner, caught mid-hang
      c.fillRect(px + 14 + Math.sin(t * 0.5 + fx0) * 2, gy - 220, 12, 40);
    }
    drawFrostFlakes(c, sx0, w, lvl, t, dense);
  } else { // frostthrone: an interior, under a vault — no sky and no horizon
    // It warms with the thaw rather than colouring: a dawn band indoors reads
    // as an orange stripe on the floor, not as first light.
    const warm = Math.min(1, skyT / 3);
    if (!(drawWall(c, 'wall_frostthrone', zx0, zx1, cam.x, gy))) {
      c.fillStyle = lerpHex('#141c30', '#2a2440', warm);
      c.fillRect(sx0, 0, w, gy);
      c.fillStyle = '#0d1526'; // the vaulted ice ceiling
      c.fillRect(sx0, 0, w, 160);
      for (let i = 0; i < 6; i++) { // the vault arcs
        c.fillStyle = i % 2 ? '#131d33' : '#0d1526';
        c.fillRect(sx0 + i * (w / 6), 120 + (i % 2) * 10, w / 6, 40);
      }
    }
    drawTimeVein(c, lvl, cam, t);
    c.fillStyle = '#b8d8e8'; // the east wall: the glacier closes the level
    c.fillRect(5950 - cam.x, 0, 60, gy);
    drawFrostFlakes(c, sx0, w, lvl, t, dense);
  }
  c.restore();
}

// The vein of light behind the throne: a frozen spiral of time that sways like
// a pendulum — the Great Clock's echo, three frames later and stopped. The
// ending dims it (M7).
function drawTimeVein(c, lvl, cam, t) {
  const cx = 5650 - cam.x, cy = 300;
  const dim = lvl.ending9?.started ? 0.25 : 1;
  const sway = (3 * Math.PI / 180) * Math.sin(t * 0.4);
  c.save();
  c.translate(cx, cy);
  c.rotate(sway);
  c.globalAlpha = (0.3 + 0.15 * Math.sin(t * 1.2)) * dim;
  c.fillStyle = '#a8c8ff';
  for (let i = 0; i < 30; i++) { // the spiral, as chunky segments
    const a = i * 0.42, r = 8 + i * 4.8;
    c.fillRect(Math.cos(a) * r - 3, Math.sin(a) * r * 0.55 - 3, 6, 6);
  }
  c.globalAlpha = 1;
  c.restore();
}
