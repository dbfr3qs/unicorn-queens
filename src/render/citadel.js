// The Sky Citadel's world pass (level 8): the island cliff at the spawn,
// the bookcase forest and the sliding bookcase wall, the gear door, the
// pendulum arm + rod over the bridge, the astrolabe on its plinth, the
// King's silhouette (M7), and the Warden's statue (M6+). Drawn in the
// camera-translated world pass (index.js) — after the peak pass, before
// the doors. All animation is a pure function of level state and time
// (the clock's t/period/gearRot, the door's openT, dyingT), so snapshots
// stay text-stable.
import { game } from '../game.js';

export function drawCitadel(c, lvl, t) {
  if (!lvl.zones?.some(z => z.kind === 'skybridge' || z.kind === 'citadel')) return; // the citadel only
  drawIslandEdge(c, lvl);
  drawBookcaseForest(c, lvl);
  drawBookcaseWall(c, lvl);
  drawGearDoor(c, lvl, t);
  drawPendulumArm(c, lvl);
  drawAstrolabe(c, lvl);
  drawKingSil(c, lvl);
  drawWardenStatue(c, lvl);
}

// The island cliff under the skybridge: the keep floats on a brass-topped
// stone shelf, the deck ending at the citadel wall (600).
function drawIslandEdge(c, lvl) {
  const gy = lvl.groundY;
  c.fillStyle = '#1c1834'; // the cliff body
  c.beginPath();
  c.moveTo(0, gy + 4);
  c.lineTo(560, gy + 4);
  c.lineTo(600, gy + 40);
  c.lineTo(420, gy + 56);
  c.lineTo(300, gy + 40);
  c.lineTo(180, gy + 52);
  c.lineTo(0, gy + 44);
  c.closePath();
  c.fill();
  c.fillStyle = '#2c2a52'; // the lit face
  c.fillRect(0, gy + 4, 560, 10);
}

// The bookcase forest in the library (2350–2900): full-height bays of
// books behind the floor. Bay index hashes the spine colors.
function drawBookcaseForest(c, lvl) {
  const gy = lvl.groundY;
  const spines = ['#5a3a5e', '#3a4a6a', '#6a4a2e', '#3e5a4a'];
  for (let bay = 0; bay < 9; bay++) {
    const x = 2350 + bay * 60;
    c.fillStyle = bay % 2 ? '#2a2040' : '#2e2444'; // the bay, alternating shades
    c.fillRect(x, 140, 60, gy - 140);
    for (let row = 0; row < 8; row++) { // eight rows of spines
      const ry = 170 + row * 48;
      for (let i = 0; i < 6; i++) {
        c.fillStyle = spines[(bay * 7 + row * 3 + i) % 4];
        c.fillRect(x + 6 + i * 8, ry, 6, 34);
      }
      c.fillStyle = '#241a38'; // the shelf board
      c.fillRect(x + 4, ry + 34, 52, 4);
    }
  }
}

// The bookcase wall (2520–2760): two static bays and the sliding panel
// (2600–2720). The panel is a 320-px-tall bookcase slab; closed it covers
// 240..groundY, open it has risen 240 px. The slide frac is a pure read
// of clock.t (M2 exports panelFrac; the draw switches to it).
function drawBookcaseWall(c, lvl) {
  const gy = lvl.groundY;
  const clock = lvl.clock;
  const held = lvl.shelfPanel?.held ?? false;
  let frac;
  if (held) frac = 1;
  else if (clock.t < 0.4) frac = clock.t / 0.4;
  else if (clock.t < 1.6) frac = 1;
  else if (clock.t < 2.0) frac = (2.0 - clock.t) / 0.4;
  else frac = 0;
  const spines = ['#5a3a5e', '#3a4a6a', '#6a4a2e', '#3e5a4a'];
  const drawBay = (x, w0, yTop, yBot) => {
    c.fillStyle = '#2e2444';
    c.fillRect(x, yTop, w0, yBot - yTop);
    for (let y = yTop + 24; y + 38 < yBot; y += 48) {
      for (let i = 0; i < 6; i++) {
        c.fillStyle = spines[(Math.floor(x / 20) * 7 + Math.floor(y / 48) * 3 + i) % 4];
        c.fillRect(x + 6 + i * 8, y, 6, 34);
      }
      c.fillStyle = '#241a38';
      c.fillRect(x + 4, y + 34, w0 - 8, 4);
    }
  };
  drawBay(2520, 80, 0, gy); // the static west bay
  drawBay(2720, 40, 0, gy); // the static east bay
  drawBay(2600, 120, 0, 240); // the header above the panel
  const top = Math.max(0, 240 - frac * 240); // the panel slab at its slide position
  const bot = Math.min(gy, top + 320);
  if (bot > top) drawBay(2600, 120, top, bot);
}

// The gear door (4900–4940): a wall of five interlocking gears, the seal
// glowing at the middle hub while locked; open, the gears retract by
// 1 − door.openT / 1.2 (they slide apart and fade).
function drawGearDoor(c, lvl, t) {
  const gy = lvl.groundY;
  const door = lvl.doors?.find(d => d.kind === 'geardoor');
  if (!door) return;
  const retract = door.state === 'open' ? 1 : door.state === 'opening' ? 1 - door.openT / 1.2 : 0;
  c.fillStyle = '#241d40'; // the header over the door
  c.fillRect(4876, 0, 88, 16);
  const spots = [[4920, 60], [4898, 180], [4942, 290], [4898, 400], [4920, 500]];
  for (let i = 0; i < 5; i++) { // the five interlocking gears
    const [gx, gy2] = spots[i];
    const x = gx + (i % 2 ? 1 : -1) * retract * 160; // they slide apart
    c.globalAlpha = 1 - retract * 0.65;
    c.fillStyle = '#3a3060';
    c.beginPath(); c.arc(x, gy2, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#241d40'; // the teeth (a static hashed offset per gear)
    for (let k = 0; k < 8; k++) {
      const a = i * 0.7 + k * Math.PI / 4;
      c.fillRect(x + Math.cos(a) * 33 - 4, gy2 + Math.sin(a) * 33 - 4, 8, 8);
    }
    c.fillStyle = '#b8860b'; // the hub
    c.beginPath(); c.arc(x, gy2, 8, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
  if (door.state === 'locked') { // the seal at the middle hub
    c.globalAlpha = 0.6 + 0.2 * Math.sin(t * 3);
    c.fillStyle = '#7ec8ff';
    c.beginPath(); c.arc(4920, 290, 14, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
}

// The pendulum arm + rod over the bridge: the pivot housing at (4000, 100),
// the 420-px arm at θ = 40°·sin(2π·t/period), the blade at the tip. The
// same pose the M2 collision reads (pendulumPose — one source of truth).
function drawPendulumArm(c, lvl) {
  const clock = lvl.clock;
  const th = (40 * Math.PI / 180) * Math.sin(2 * Math.PI * clock.t / clock.period);
  const px = 4000, py = 100;
  const tx = px + 420 * Math.sin(th), ty = py + 420 * Math.cos(th);
  c.fillStyle = '#8a6a2e'; // the pivot housing
  c.fillRect(px - 30, 80, 60, 40);
  c.fillStyle = '#5e4a1e';
  c.fillRect(px - 30, 80, 60, 6);
  c.strokeStyle = '#b8860b'; // the arm
  c.lineWidth = 6;
  c.beginPath(); c.moveTo(px, py); c.lineTo(tx, ty); c.stroke();
  c.fillStyle = '#8a6a2e'; // the blade
  c.fillRect(tx - 7, ty - 20, 14, 40);
  c.fillStyle = '#d4aa3e'; // the blade's edge
  c.fillRect(tx - 7, ty + 16, 14, 4);
  c.fillStyle = '#b8860b'; // the pivot boss
  c.beginPath(); c.arc(px, py, 8, 0, Math.PI * 2); c.fill();
}

// The astrolabe on its plinth: a 60×40 brass disc, etched rings, star
// points, the pointer. The pearl (M5/M7) rests in front of it.
function drawAstrolabe(c, lvl) {
  const plat = lvl.platforms?.find(p => p.kind === 'pedestal');
  if (!plat) return;
  const cx = plat.x + plat.w / 2;
  const by = plat.y;
  c.fillStyle = '#8a6a2e'; // the disc
  c.beginPath(); c.ellipse(cx, by - 20, 30, 20, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#5e4a1e'; // the etched rings
  c.lineWidth = 2;
  c.beginPath(); c.ellipse(cx, by - 20, 20, 13, 0, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.ellipse(cx, by - 20, 10, 7, 0, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#ffd75e'; // the star points
  c.fillRect(cx - 12, by - 30, 3, 3);
  c.fillRect(cx + 8, by - 24, 3, 3);
  c.fillRect(cx - 4, by - 12, 3, 3);
  c.fillStyle = '#b8860b'; // the pointer
  c.fillRect(cx - 1, by - 44, 2, 12);
}

// The King's silhouette on the rim (M7 sets present): a dark figure with
// one white glint — the "thank you" without words.
function drawKingSil(c, lvl) {
  if (!lvl.kingSil?.present) return;
  const x = 5950, gy = lvl.groundY;
  c.fillStyle = '#0a0918';
  c.fillRect(x, gy - 44, 28, 44); // the figure
  c.fillRect(x + 6, gy - 58, 16, 14); // the head
  c.fillStyle = '#ffffff';
  c.fillRect(x + 18, gy - 40, 4, 4); // the single glint
}

// The Warden's statue (M6+): drawEnemies skips dead entities, so the world
// pass owns him. The head bows over dyingT 1.8 → 1.0 and holds; the core
// ember glows from the 3.3 → 1.8 dim.
function drawWardenStatue(c, lvl) {
  const e = game.enemies?.find(en => en.kind === 'warden' && en.dead);
  if (!e) return;
  const dt = e.dyingT ?? 0;
  const bow = dt > 1.8 ? 0 : dt < 1.0 ? 1 : (1.8 - dt) / 0.8;
  c.save();
  c.translate(e.x, e.y);
  c.fillStyle = '#8a6a2e'; // the brass frame
  c.fillRect(8, 16, 44, 40); // the torso
  c.fillStyle = '#5e4a1e';
  c.fillRect(8, 56, 44, 8); // the legs
  c.fillStyle = '#8a6a2e';
  c.beginPath(); c.arc(30, 10 + bow * 8, 12, 0, Math.PI * 2); c.fill(); // the head (bows)
  c.fillStyle = '#3a3060'; // the core window
  c.fillRect(22, 30, 16, 14);
  const ember = dt >= 1.8 ? 0.15 * ((3.3 - dt) / 1.5) : 0.15; // the ember, dimming in
  if (ember > 0) {
    c.globalAlpha = Math.max(0, ember);
    c.fillStyle = '#7ec8ff';
    c.fillRect(22, 30, 16, 14);
    c.globalAlpha = 1;
  }
  c.restore();
}
