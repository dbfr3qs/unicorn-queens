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
