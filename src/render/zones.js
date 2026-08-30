// Zone backgrounds for multi-zone levels (level 2): outdoor sky with the
// usual ridges, castle-interior stone with arched windows + flickering
// torches, and the boss hall with columns and banners. Screen space with
// parallax, like drawBackground; zones come from level data.
import { background, drawRidge, drawStars } from './background.js';

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
      drawStars(c, cam.x * 0.2, t);
      drawRidge(c, background.far, cam.x * 0.35, '#241543', lvl.groundY);
      drawRidge(c, background.near, cam.x * 0.6, '#2f1c55', lvl.groundY);
      c.restore();
    } else if (z.kind === 'dungeon' || z.kind === 'dungeon-hall') {
      drawDungeon(c, z.kind === 'dungeon-hall', z.x0, z.x1, sx0, sx1, lvl, cam, t);
    } else if (z.kind === 'deep' || z.kind === 'deep-hall') {
      drawDeep(c, z.kind === 'deep-hall', z.x0, z.x1, sx0, sx1, lvl, cam, t);
    } else if (z.kind === 'gate') {
      drawGate(c, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else if (z.kind === 'forest') {
      drawForestZone(c, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else if (z.kind === 'miregate' || z.kind === 'mire' || z.kind === 'mire-deep') {
      drawMireZone(c, z.kind === 'mire-deep', z.kind === 'miregate', z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
    } else if (z.kind === 'peakgate' || z.kind === 'snowfield' || z.kind === 'spire' || z.kind === 'throne') {
      drawPeakZone(c, z.kind, z.x0, z.x1, sx0, sx1, lvl, cam, t, viewW);
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
function drawDungeon(c, isHall, zx0, zx1, sx0, sx1, lvl, cam, t) {
  const gy = lvl.groundY;
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
  const every = isHall ? 200 : 250; // torch interval
  for (let wx = Math.ceil(zx0 / every) * every + 60; wx < zx1; wx += every) {
    const x = wx - cam.x;
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
    c.fillStyle = '#0d0703'; // dark alcove between the torches
    c.beginPath();
    c.arc(x + every / 2, 250, 34, Math.PI, 0);
    c.rect(x + every / 2 - 34, 250, 68, 100);
    c.fill();
  }
  if (isHall) {
    for (let wx = zx0 + 120; wx < zx1; wx += 240) { // big pillars
      const x = wx - cam.x;
      c.fillStyle = '#31200f';
      c.fillRect(x - 14, gy - 260, 28, 260);
      c.fillStyle = '#41290f';
      c.fillRect(x - 18, gy - 274, 36, 14); // capital
    }
  }
}

// The Dragon's Layer: green-black stone, moss tufts on the brick joints,
// seeded drips, floor puddles, phosphorescent moss glow spots (the layer's
// own dim light), dim torches. The hall variant: darker wall, dark-green
// pillars, bone dressing. All decoration is a pure function of world x and
// time — no RNG, so snapshots stay text-stable.
function drawDeep(c, isHall, zx0, zx1, sx0, sx1, lvl, cam, t) {
  const gy = lvl.groundY;
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
    for (const px of [3680, 3940, 4420, 4700]) { // dark-green pillars, clear of the shaft
      const x = px - cam.x;
      c.fillStyle = '#1a241a';
      c.fillRect(x - 14, gy - 260, 28, 260);
      c.fillStyle = '#243324';
      c.fillRect(x - 18, gy - 274, 36, 14); // capital
    }
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

// The castle gate (level 5 opening): the day sky painted across the zone,
// then the castle wall over it with the arch cut out — sun and hills read
// through the 280–460 opening before the player walks under it.
function drawGate(c, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  c.save();
  c.beginPath(); c.rect(sx0, 0, sx1 - sx0, lvl.groundY); c.clip();
  drawDaySky(c, sx0, sx1 - sx0, lvl, cam, t, viewW);
  drawHillRidge(c, background.far, 1360, cam.x * 0.35, '#79b86a', lvl.groundY, null);
  drawHillRidge(c, background.near, 1760, cam.x * 0.6, '#4e9a4e', lvl.groundY, '#3a7d42');
  c.restore();
  c.fillStyle = '#211537'; // the castle wall (the hall's purple stone)
  c.fillRect(sx0, 0, 280, lvl.groundY); // west of the arch
  c.fillRect(460 - cam.x, 0, 40, lvl.groundY); // east of the arch (460–500)
  c.beginPath(); // lintel with the arched underside (arch top at y 300)
  c.moveTo(280 - cam.x, 0);
  c.lineTo(460 - cam.x, 0);
  c.lineTo(460 - cam.x, 390);
  c.arc(370 - cam.x, 390, 90, 0, Math.PI, true);
  c.closePath();
  c.fill();
  c.strokeStyle = '#3a2a5c'; // stone trim around the opening
  c.lineWidth = 10;
  c.beginPath();
  c.arc(370 - cam.x, 390, 100, 0, Math.PI, true);
  c.stroke();
  c.fillStyle = '#3a2a5c';
  c.fillRect(275 - cam.x, 390, 10, lvl.groundY - 390); // jambs
  c.fillRect(455 - cam.x, 390, 10, lvl.groundY - 390);
}

// The enchanted forest (level 5): the day sky across the zone, then the
// deep-woods darkening band over world x >= DEEP_X.
function drawForestZone(c, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  c.save();
  c.beginPath(); c.rect(sx0, 0, sx1 - sx0, lvl.groundY); c.clip();
  drawDaySky(c, sx0, sx1 - sx0, lvl, cam, t, viewW);
  drawHillRidge(c, background.far, 1360, cam.x * 0.35, '#79b86a', lvl.groundY, null);
  drawHillRidge(c, background.near, 1760, cam.x * 0.6, '#4e9a4e', lvl.groundY, '#3a7d42');
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

// The mire gate (level 6 opening): the gloom painted across the zone, then
// the green-black stone wall over it with the arch cut out — moon and peak
// read through the 240–420 opening, stone on BOTH sides (the L2 castle gate
// shape: 180-wide opening, 10 px jambs centred on each edge).
function drawMireGateWall(c, sx0, lvl, cam) {
  const gy = lvl.groundY;
  // one world-anchored structure spanning 0–500: every x is scrolled by
  // the camera — sx0 alone (or raw screen x) leaves parts of the wall
  // pinned to the screen while the rest scrolls out from under them.
  c.fillStyle = '#232b23'; // stone either side of the opening (0–240, 420–500)
  c.fillRect(sx0, 0, 240, gy);
  c.fillRect(420 - cam.x, 0, 80, gy);
  c.beginPath(); // lintel with the arched underside (arch top at y 300)
  c.moveTo(240 - cam.x, 0);
  c.lineTo(420 - cam.x, 0);
  c.lineTo(420 - cam.x, 390);
  c.arc(330 - cam.x, 390, 90, 0, Math.PI, true);
  c.closePath();
  c.fill();
  c.strokeStyle = '#39442f'; // stone trim around the opening
  c.lineWidth = 10;
  c.beginPath();
  c.arc(330 - cam.x, 390, 100, 0, Math.PI, true);
  c.stroke();
  c.fillStyle = '#39442f'; // jambs centred on each edge of the opening
  c.fillRect(235 - cam.x, 390, 10, gy - 390);
  c.fillRect(415 - cam.x, 390, 10, gy - 390);
}

// The mire sky zone (level 6): gate, mire, and the darker mire-deep.
function drawMireZone(c, deep, gate, zx0, zx1, sx0, sx1, lvl, cam, t, viewW) {
  c.save();
  c.beginPath(); c.rect(sx0, 0, sx1 - sx0, lvl.groundY); c.clip();
  drawMireSky(c, sx0, sx1 - sx0, lvl, cam, deep);
  drawMireMountain(c, cam, deep, lvl.groundY);
  drawMireWizard(c, t, viewW);
  drawMireFog(c, t, viewW, deep);
  drawCypressLine(c, cam, viewW, lvl.groundY, 0.5, 170, 70, 50, deep ? '#141d14' : '#16201a', false);
  drawCypressLine(c, cam, viewW, lvl.groundY, 0.7, 230, 100, 70, deep ? '#101810' : '#121c12', deep);
  drawMireFireflies(c, zx0, zx1, cam, t);
  c.restore();
  if (gate) drawMireGateWall(c, sx0, lvl, cam);
}

// ---- The Peak (level 7) ----
// Starlit sky (the first starlit level), a silver moon, the spire
// silhouette, falling snow, pine lines, the spire's interior with its
// floating orbs, and the open-air throne above the clouds. All pure
// functions of world x / screen x and time — no RNG, snapshot-stable.

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
function drawSpireSilhouette(c, cam, t, gy) {
  const sx = (4800 - cam.x) * 0.2;
  const base = gy - 40, top = 60;
  c.save();
  c.fillStyle = '#150e22';
  c.beginPath(); // the shaft
  c.moveTo(sx - 90, base);
  c.lineTo(sx - 34, top + 150);
  c.lineTo(sx - 14, top);
  c.lineTo(sx + 14, top);
  c.lineTo(sx + 34, top + 150);
  c.lineTo(sx + 90, base);
  c.closePath();
  c.fill();
  c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 0.8); // the tip's faint glow
  c.fillStyle = '#5a4a8a';
  c.beginPath(); c.arc(sx, top + 6, 16, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;
  c.restore();
}

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
function drawPineLine(c, cam, viewW, gy, par, period, hMin, hVar, color) {
  const shift = cam.x * par;
  const start = Math.floor((shift - 120) / period) * period;
  for (let k = start; k < shift + viewW + 120; k += period) {
    const i = ((k / period) % 97 + 97) % 97; // seeded index
    const jx = (i * 71) % 80;
    const x = k + jx - shift;
    const h = hMin + ((i * 37) % hVar);
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
}

// The gate zone (level 7 opening): the starlit sky painted across the
// zone, then the stone wall over it with the arch cut out — the snowfield
// sky and the spire read through the 240–420 opening (the L6 gate shape,
// mirrored: the stair the player climbed is behind the spawn, x 0–100).
function drawPeakGateWall(c, sx0, lvl, cam) {
  const gy = lvl.groundY;
  c.fillStyle = '#2c3450'; // stone either side of the opening (0–240, 420–500)
  c.fillRect(sx0, 0, 240, gy);
  c.fillRect(420 - cam.x, 0, 80, gy);
  c.beginPath(); // lintel with the arched underside (arch top at y 300)
  c.moveTo(240 - cam.x, 0);
  c.lineTo(420 - cam.x, 0);
  c.lineTo(420 - cam.x, 390);
  c.arc(330 - cam.x, 390, 90, 0, Math.PI, true);
  c.closePath();
  c.fill();
  c.strokeStyle = '#454c68'; // stone trim around the opening
  c.lineWidth = 10;
  c.beginPath();
  c.arc(330 - cam.x, 390, 100, 0, Math.PI, true);
  c.stroke();
  c.fillStyle = '#454c68'; // jambs centred on each edge of the opening
  c.fillRect(235 - cam.x, 390, 10, gy - 390);
  c.fillRect(415 - cam.x, 390, 10, gy - 390);
  c.fillStyle = '#e8f0f8'; // snow caps on the wall tops
  c.fillRect(240 - cam.x, 0, 180, 4);
  c.fillRect(420 - cam.x, 0, 80, 4);
}

// The spire interior: purple-black stone (a deeper hall variant) with
// brick courses, and the seven floating orbs (seeded Lissajous drifts,
// warm amber, alpha pulse ~2 s — the level's only warm color).
function drawSpireInterior(c, zx0, zx1, sx0, sx1, lvl, cam, t) {
  const gy = lvl.groundY;
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
    drawPeakSky(c, sx0, sx1 - sx0, lvl, cam, t, true);
    drawCloudSea(c, sx0, sx1 - sx0, lvl, cam, t, viewW);
  } else { // peakgate + snowfield: the starlit sky
    drawPeakSky(c, sx0, sx1 - sx0, lvl, cam, t, false);
    drawSpireSilhouette(c, cam, t, lvl.groundY);
    drawSnowLayer(c, zx0, zx1, lvl, cam, t, 0.3, 40, 2, 26, 0); // far, small, slow
    drawSnowLayer(c, zx0, zx1, lvl, cam, t, 0.5, 24, 3, 46, 0); // near, larger, faster
    drawPineLine(c, cam, viewW, lvl.groundY, 0.5, 190, 60, 40, '#16233c');
    drawPineLine(c, cam, viewW, lvl.groundY, 0.7, 260, 90, 50, '#0f1a30');
  }
  c.restore();
  if (kind === 'peakgate') drawPeakGateWall(c, sx0, lvl, cam);
}

function drawStone(c, isHall, zx0, zx1, sx0, sx1, lvl, cam, t) {
  c.fillStyle = isHall ? '#191031' : '#211537'; // wall
  c.fillRect(sx0, 0, sx1 - sx0, lvl.groundY);
  if (isHall) {
    for (let wx = zx0 + 90; wx < zx1; wx += 180) { // columns
      const x = wx - cam.x;
      c.fillStyle = '#2c1c4a';
      c.fillRect(x - 12, lvl.groundY - 250, 24, 250);
      c.fillStyle = '#3a2760';
      c.fillRect(x - 16, lvl.groundY - 262, 32, 14); // capital
    }
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
