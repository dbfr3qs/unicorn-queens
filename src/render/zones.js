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
