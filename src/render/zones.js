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
