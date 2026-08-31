// The Peak's world pass (level 7): the stair silhouette behind the
// spawn, the wind vane (the level's tell), the sigil's ice block, the
// cauldron rim, the spire's outer wall + porthole, the King's cage on
// its dais, and the rainbow exit. Drawn in the camera-translated world
// pass (index.js) — after the mire pass, before the doors. All
// animation is a pure function of level time (or of the state the
// M2–M7 subsystems write), so snapshots stay text-stable.
import { game } from '../game.js';

// The stairway from level 6, receding up and out of frame to the west
// behind the spawn (the three-frame callback: you just came up it).
function drawStairs(c, lvl) {
  const gy = lvl.groundY;
  const steps = [[0, gy - 36, 84], [0, gy - 72, 64], [0, gy - 108, 44]];
  for (const [x, y, w] of steps) {
    c.fillStyle = '#2c3450';
    c.fillRect(x, y, w, 36);
    c.fillStyle = '#e8f0f8'; // the snow cap
    c.fillRect(x, y, w, 5);
  }
}

// The wind vane on its post at 700 (top at groundY−120): the level's
// tell, drawn from the phase the simulation stores (lvl.wind.phase):
// calm — still; telegraph — the tail flaps; gust — east + shiver; the
// updraft — the rooster points up, riding the lift.
function drawVane(c, lvl, t) {
  const gy = lvl.groundY;
  const x = 700, topY = gy - 120;
  const ph = lvl.wind?.phase ?? 'calm';
  c.fillStyle = '#2c3450'; // the post
  c.fillRect(x - 2, topY, 4, 120);
  c.fillStyle = '#454c68'; // the base
  c.fillRect(x - 8, gy - 8, 16, 8);
  c.fillStyle = '#8a93b8'; // the rooster
  const shiver = ph === 'gust' ? Math.sin(t * 40) * 1.5 : 0; // the gust shiver
  const flap = ph === 'telegraph' ? Math.sin(t * 14) * 3 : 0; // the tail flap
  if (ph === 'updraft') { // the rooster points up, riding the lift
    c.fillRect(x + 2, topY - 4, 8, 8); // body, compact
    c.fillRect(x + 4, topY - 12, 6, 8); // head, raised
    c.fillRect(x + 6, topY - 16, 2, 4); // beak, up
    c.fillRect(x - 4, topY - 2, 8, 4); // tail, dropped
  } else {
    c.fillRect(x + 2 + shiver, topY - 4, 20, 8); // body
    c.fillRect(x + 22 + shiver, topY - 6, 8, 6); // head
    c.fillRect(x + 30 + shiver, topY - 4, 4, 2); // beak
    c.fillRect(x - 4, topY - 10 + flap, 6, 10); // tail
    c.fillRect(x + 6, topY + 4, 3, 6); // leg
  }
}

// The sigil's ice block (M3 shatters it): a snow-capped stone cube with
// the black crystal set in its face; while intact a white glint pulses
// on a ~4 s seed (the "something is in here" cue, the bush pattern).
function drawSigilBlock(c, lvl, t) {
  const b = lvl.sigilBlock;
  if (!b) return;
  const gy = lvl.groundY;
  if (b.state === 'intact') {
    c.fillStyle = '#2c3242'; // the stone plinth (the cube sits on it)
    c.fillRect(b.x - 4, gy - 20, b.w + 8, 20);
    c.fillStyle = '#3a4152'; // the stone cube
    c.fillRect(b.x, b.y + 8, b.w, b.h - 8);
    c.fillStyle = '#e8f0f8'; // the snow cap
    c.fillRect(b.x, b.y, b.w, 10);
    c.fillStyle = '#1a1026'; // the black crystal, set in the face
    c.beginPath();
    c.moveTo(b.x + 14, b.y + 22);
    c.lineTo(b.x + b.w - 14, b.y + 22);
    c.lineTo(b.x + b.w / 2, b.y + b.h - 10);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.57 + b.x * 0.013); // the ~4 s glint
    c.fillStyle = '#ffffff';
    c.fillRect(b.x + 24, b.y + 24, 3, 2);
    c.globalAlpha = 1;
  } else if (b.shatterT > 0) { // the break: two halves fall apart, fading (pure in shatterT)
    const f = 1 - b.shatterT / 0.4; // 0 → 1 over the 0.4 s break
    c.fillStyle = '#3a4152';
    c.globalAlpha = 1 - f;
    c.fillRect(b.x - f * 12, b.y + 8 + f * 26, b.w / 2, b.h - 8); // left half, tipping out
    c.fillRect(b.x + b.w / 2 + f * 12, b.y + 8 + f * 30, b.w / 2, b.h - 8); // right half
    c.globalAlpha = 1;
  } else {
    c.fillStyle = '#3a4152'; // the broken stub
    c.fillRect(b.x, gy - 14, 18, 14);
    c.fillRect(b.x + 30, gy - 10, 16, 10);
    c.fillStyle = '#e8f0f8';
    c.fillRect(b.x, gy - 14, 18, 4);
  }
  const sig = lvl.sigil;
  if (sig && sig.visible && !sig.taken) { // the sigil on the ground
    c.fillStyle = '#ffd9a0'; // an amber crystal
    c.beginPath();
    c.moveTo(sig.x + 8, sig.y);
    c.lineTo(sig.x + sig.w, sig.y + 8);
    c.lineTo(sig.x + 8, sig.y + sig.h);
    c.lineTo(sig.x, sig.y + 8);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.57 + sig.x * 0.013);
    c.fillStyle = '#ffffff';
    c.fillRect(sig.x + 7, sig.y + 3, 3, 2);
    c.globalAlpha = 1;
  }
}

// The cauldron pit's stone rim lips (the liquid + bubbles are the
// `cauldron` recolor in render/level.js, under the dais).
function drawCauldronRim(c, lvl) {
  const gy = lvl.groundY;
  c.fillStyle = '#454c68';
  c.fillRect(3896, gy - 4, 8, 8);
  c.fillRect(4046, gy - 4, 8, 8);
}

// The spire's outer wall at the throne zone's west edge (the entrance
// behind the dissolved gate) + the porthole in the interior wall.
function drawSpireWallAndPorthole(c, lvl, t) {
  const gy = lvl.groundY;
  c.fillStyle = '#2c3450'; // the outer wall, 5400–5500
  c.fillRect(5400, 0, 100, gy);
  c.fillStyle = '#454c68';
  for (let wy = 40; wy < gy; wy += 28) c.fillRect(5400, wy, 100, 3);
  c.fillStyle = '#e8f0f8'; // the snow cap
  c.fillRect(5400, 0, 100, 5);
  // the porthole at 4500: r 40, iron rim, the starlit sky through it,
  // the King's cage far above in the glass (the visual goal, made
  // visible before it's reachable)
  const px = 4520, py = 330;
  c.fillStyle = '#0a1428'; // the glass: starlit sky
  c.beginPath(); c.arc(px, py, 40, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#cfd8ff';
  c.fillRect(px - 18, py - 20, 2, 2);
  c.fillRect(px + 10, py + 6, 2, 2);
  c.fillRect(px - 4, py + 18, 2, 2);
  c.fillStyle = '#3a4258'; // the cage silhouette, far above in the glass
  c.fillRect(px - 8, py - 26, 16, 2);
  c.fillRect(px - 8, py - 26, 2, 12);
  c.fillRect(px + 6, py - 26, 2, 12);
  c.fillStyle = '#3a4258'; // the iron rim
  c.lineWidth = 8;
  c.strokeStyle = '#3a4258';
  c.beginPath(); c.arc(px, py, 40, 0, Math.PI * 2); c.stroke();
  if (!game.dialogsFired.has('l7-king')) { // a faint glint while the beat is unspent
    c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.57 + px * 0.013);
    c.fillStyle = '#ffffff';
    c.fillRect(px - 24, py - 14, 3, 2);
    c.globalAlpha = 1;
  }
}

// The King's cage on the dais: iron bars, the King's silhouette inside,
// the lock glinting while sealed. M7 swings the door open (openT).
function drawCage(c, lvl, t) {
  const cage = lvl.cage;
  if (!cage) return;
  const { x, y, w, h } = cage;
  const open = cage.open;
  const swing = open ? (1 - cage.openT / 1.2) * 26 : 0; // the door swings out
  c.fillStyle = '#2c3440'; // the frame
  c.fillRect(x, y, w, 5); // top bar
  c.fillRect(x, y + h - 5, w, 5); // bottom bar
  for (const bx of [x, x + 12, x + 24, x + 36, x + 48]) { // the bars
    c.fillRect(bx, y, 4, h);
  }
  // the door (rightmost bay), swinging while openT runs
  c.fillRect(x + w - 6 + swing, y, 6, h);
  c.fillStyle = '#9aa4c8'; // the King's silhouette
  c.fillRect(x + 22, y + 34, 18, h - 39); // body
  c.beginPath(); c.arc(x + 31, y + 26, 7, 0, Math.PI * 2); c.fill(); // head
  c.fillStyle = '#e8f0f8'; // the horn
  c.beginPath();
  c.moveTo(x + 31, y + 19);
  c.lineTo(x + 34, y + 9);
  c.lineTo(x + 37, y + 19);
  c.closePath();
  c.fill();
  if (!open) { // the lock glint, sealed
    c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2.1 + x * 0.013);
    c.fillStyle = '#ffd75e';
    c.fillRect(x + w - 4, y + 30, 4, 6);
    c.globalAlpha = 1;
  }
}

// The rainbow exit: sealed — a faint dim arc, barely visible (the
// mistgate sealed pattern); lit — a full rainbow rising out of the top
// of the frame, shimmering (a pure function of t). Walk in → win.
function drawRainbow(c, lvl, t) {
  const e = lvl.exit;
  if (!e || e.kind !== 'rainbow') return;
  const cx = e.x + e.w / 2, gy = lvl.groundY;
  const radii = [40, 52, 64, 76];
  if (e.locked) {
    c.strokeStyle = '#4a527a';
    c.globalAlpha = 0.25;
    c.lineWidth = 10;
    c.beginPath(); c.arc(cx, gy, radii[1], Math.PI, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(cx, gy, radii[2], Math.PI, Math.PI * 2); c.stroke();
    c.globalAlpha = 1;
    return;
  }
  const colors = ['#e86a6a', '#f0a05e', '#f5e86a', '#6aa8e8'];
  for (let i = 0; i < radii.length; i++) {
    c.strokeStyle = colors[i];
    c.globalAlpha = 0.75 + 0.2 * Math.sin(t * 3 + i); // the shimmer
    c.lineWidth = 10;
    c.beginPath(); c.arc(cx, gy, radii[i], Math.PI, Math.PI * 2); c.stroke();
  }
  c.globalAlpha = 1;
  c.fillStyle = '#ffffff'; // a light crest at the base
  c.globalAlpha = 0.3 + 0.15 * Math.sin(t * 2.4);
  c.fillRect(cx - 30, gy - 10, 60, 6);
  c.globalAlpha = 1;
}

// The released war-pig (M7): stands where the fight ended (a small
// breath), then walks west with a bob (a pure function of its x).
function drawPig(c, lvl, t) {
  const pig = lvl.pig;
  if (!pig) return;
  const bob = pig.state === 'walk' ? Math.sin(pig.x * 0.35) * 2 : 0;
  const x = pig.x, y = pig.y - bob; // feet on the ground
  c.fillStyle = '#c98a9a'; // legs
  c.fillRect(x + 8, y - 10, 6, 10);
  c.fillRect(x + 18, y - 10, 6, 10);
  c.fillRect(x + 38, y - 10, 6, 10);
  c.fillRect(x + 48, y - 10, 6, 10);
  c.fillStyle = '#e8a8bc'; // the body, broad as a saddle
  c.beginPath(); c.ellipse(x + 32, y - 24, 28, 16, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x + 6, y - 30, 10, 9, 0, 0, Math.PI * 2); c.fill(); // head, west-bound
  c.fillStyle = '#f0c0d0'; // the snout
  c.fillRect(x - 6, y - 32, 8, 8);
  c.fillStyle = '#d890a8'; // the ear
  c.beginPath();
  c.moveTo(x + 2, y - 39); c.lineTo(x + 7, y - 46); c.lineTo(x + 10, y - 38);
  c.closePath(); c.fill();
  c.strokeStyle = '#d890a8'; // the tail
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(x + 59, y - 26); c.quadraticCurveTo(x + 66, y - 30, x + 63, y - 35); c.stroke();
  c.fillStyle = '#3a2a3c'; // the eye
  c.fillRect(x + 4, y - 33, 3, 3);
}

// The peak world pass.
export function drawPeak(c, lvl, t) {
  if (!lvl.sigilBlock) return; // the peak only (level 7)
  drawStairs(c, lvl);
  drawVane(c, lvl, t);
  drawSigilBlock(c, lvl, t);
  drawCauldronRim(c, lvl);
  drawSpireWallAndPorthole(c, lvl, t);
  drawCage(c, lvl, t);
  drawPig(c, lvl, t);
  drawRainbow(c, lvl, t);
}
