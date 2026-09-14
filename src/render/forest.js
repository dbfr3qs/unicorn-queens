// World-pass dressing for the enchanted forest (level 5): seeded trees
// (one shade darker in the deep-woods band), the glade's big tree, the
// hollow tree (relic 2's home), flowers and grass, tall home flowers under
// each bee, and reeds at the water's edge. Pure functions of world x and
// time — no RNG, so snapshots stay text-stable. Drawn after drawLevel,
// behind the entities.
import { spriteReady } from '../sprites.js';
import { drawSpriteFeet, scaleToHeight } from './sprite.js';

const DEEP_X = 3700; // same band as the zone darkening (zones.js)

function circle(c, x, y, r) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

// The three tree silhouettes, each in a lit and a deep-woods shade. `tree` is
// the round-canopied one the level was laid out with; the other two exist
// so a stand of them stops reading as one tree stamped along the ground.
const SHAPES = ['tree', 'tree_tall', 'tree_wide'];

// A forest tree: 18 px trunk up to y ~180, two-tone canopy. `dark` is the
// deep-woods shade, `s` a size scale (the glade tree is bigger), `v` a seed
// that picks the shape, a little extra size, and which way it faces.
function drawTree(c, x, gy, dark, s, v = 0) {
  // The vector tree stands about 456*s tall on the ground line — a 380*s trunk with the
  // canopy circles reaching 76*s above it. The sheet is drawn to that same height so the
  // canopy lands where the level was laid out expecting it, whichever art is in use.
  const shape = SHAPES[v % SHAPES.length];
  let name = dark ? shape + '_deep' : shape;
  if (!spriteReady(name)) name = dark ? 'tree_deep' : 'tree'; // a variant still decoding: the round one, not the vector one
  if (spriteReady(name)) {
    const size = s * (0.78 + ((v * 37) % 9) / 25); // 0.78 .. 1.10 of the laid-out height: the tall shape at 1.2 ran off the top of the screen
    // The sheets end in a splay of roots with a flat cut under it, and stood
    // on the ground line that cut showed: a tree set down on a lawn, not one
    // growing out of it. So the foot goes SINK px under the line and the draw
    // is clipped to above it — the roots run into the earth — with a pool of
    // shade on the grass where the trunk meets it. The ground is already
    // painted by now (drawLevel runs first), hence the clip rather than
    // simply drawing lower.
    const sink = 14 * size;
    c.save();
    c.beginPath(); c.rect(x - 300, gy - 700, 600, 700); c.clip();
    c.translate(x, gy + sink);
    if ((v >> 2) & 1) c.scale(-1, 1); // half of them face the other way
    const drew = drawSpriteFeet(c, name, 0, scaleToHeight(name, 456 * size + sink));
    c.restore();
    if (drew) { // the shade where the roots meet the grass, over the foot of the trunk
      c.fillStyle = 'rgba(10, 30, 12, 0.4)';
      c.beginPath(); c.ellipse(x, gy, 36 * size, 6, 0, 0, Math.PI * 2); c.fill();
      return;
    }
  }
  const topY = gy - 380 * s;
  c.fillStyle = dark ? '#4a3620' : '#5d4226'; // trunk
  c.fillRect(x - 9 * s, topY, 18 * s, 380 * s);
  c.fillStyle = dark ? '#2e6a34' : '#3e8a44'; // canopy base
  circle(c, x, topY - 24 * s, 52 * s);
  circle(c, x - 38 * s, topY + 2 * s, 38 * s);
  circle(c, x + 38 * s, topY + 2 * s, 38 * s);
  c.fillStyle = dark ? '#3a7d42' : '#57a857'; // canopy light
  circle(c, x - 16 * s, topY - 34 * s, 26 * s);
  circle(c, x + 20 * s, topY - 14 * s, 24 * s);
}

// The hollow tree: a 60 px trunk centred at 2330 with a dark round hollow
// at (2330, 280) — the sapphire rests inside (relic 2). Decorative only.
// The sheet's hollow was cut into it at build time, and these are where it
// sits in the sheet: HOLE_UP px above the feet, HOLE_LEFT px west of the
// midline (the trunk leans). The draw is solved from them — the scale that
// puts the hole at y 280 with the feet sunk under the ground line, and the
// x that puts the hole, not the midline, over the relic. That scale works
// out around 1.33, and the crown runs off the top of the screen: it is the
// biggest tree in the wood, and the hollow has to be where the branch chain
// arrives.
const HOLE_UP = 221, HOLE_LEFT = 19.5, HOLE_Y = 280;
function drawHollowTree(c, x, gy) {
  if (spriteReady('tree_hollow')) {
    const sink = 14;
    const scale = (gy + sink - HOLE_Y) / HOLE_UP;
    c.save();
    c.beginPath(); c.rect(x - 300, gy - 700, 600, 700); c.clip();
    c.translate(x + HOLE_LEFT * scale, gy + sink);
    const drew = drawSpriteFeet(c, 'tree_hollow', 0, scale);
    c.restore();
    if (drew) {
      c.fillStyle = 'rgba(10, 30, 12, 0.4)';
      c.beginPath(); c.ellipse(x + HOLE_LEFT * scale, gy, 50, 6, 0, 0, Math.PI * 2); c.fill();
      return;
    }
  }
  const topY = 140;
  c.fillStyle = '#4a3620'; // trunk (2300–2360)
  c.fillRect(x - 30, topY, 60, gy - topY);
  c.fillStyle = '#5d4226'; // bark highlight
  c.fillRect(x - 30, topY, 14, gy - topY);
  c.fillStyle = '#2e6a34'; // canopy
  circle(c, x, topY - 30, 64);
  circle(c, x - 52, topY, 46);
  circle(c, x + 52, topY, 46);
  c.fillStyle = '#3e8a44';
  circle(c, x - 20, topY - 44, 34);
  circle(c, x + 26, topY - 20, 30);
  c.fillStyle = '#241811'; // hollow rim
  circle(c, x, 280, 30);
  c.fillStyle = '#0d0805'; // the hollow
  circle(c, x, 280, 24);
}

// A tall flower at a bee's home x — the "lives here" cue (none until M5
// adds the roster entries).
function drawHomeFlower(c, x, gy) {
  c.fillStyle = '#2e6a34'; // stem
  c.fillRect(x, gy - 52, 3, 52);
  c.fillStyle = '#ffd75e'; // bloom
  c.beginPath(); c.arc(x + 1, gy - 58, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#8a5f22';
  c.beginPath(); c.arc(x + 1, gy - 58, 3.5, 0, Math.PI * 2); c.fill();
}

// Cattails at a water edge.
function drawReeds(c, x, gy) {
  c.fillStyle = '#2e6a34';
  c.fillRect(x, gy - 18, 2, 18);
  c.fillRect(x + 6, gy - 26, 2, 26);
  c.fillStyle = '#7a5a2e'; // cattail head
  c.fillRect(x + 5, gy - 31, 4, 7);
}

export function drawForest(c, lvl, t = 0) {
  if (!lvl.zones?.some(z => z.kind === 'forest')) return;
  const gy = lvl.groundY;
  const water = (lvl.lava ?? []).filter(m => m.water);
  const inWater = x => water.some(m => x > m.x - 16 && x < m.x + m.w + 16);
  // Trees every ~300 px with a seeded jitter, clearing water, the hollow
  // tree, the queen's glade, and the mist gate. The first two stand where
  // the castle courtyard used to be, behind the spawn; they are placed by
  // hand rather than by extending the loop, so the seeded run is unchanged.
  drawTree(c, 120, gy, false, 1, 4); // 220 apart, and 220 to the first seeded one at 560
  drawTree(c, 340, gy, false, 1, 2);
  for (let x = 560, i = 0; x < 5540; x += 300, i++) {
    const tx = x + ((i * 53) % 130);
    if (tx > 5400 || inWater(tx)) continue;
    if (tx > 2200 && tx < 2450) continue; // the hollow tree's clearing
    if (tx > 3380 && tx < 3720) continue; // the queen's glade
    // i * 7 walks the shapes 0,1,2,0,1,2 with the flip bit changing at a
    // different rate, so neighbours differ in shape and facing both
    drawTree(c, tx, gy, tx >= DEEP_X, 1, i * 7);
  }
  drawTree(c, 3650, gy, false, 1.35); // the glade's big canopy tree: the round one, always
  drawHollowTree(c, 2330, gy);
  // Flowers and grass tufts along the ground, seeded from world x.
  for (let x = 14; x < 5560; x += 46) {
    const h = (x * 73) % 100;
    const fx = x + (h % 24);
    if (fx > 5420 || inWater(fx)) continue;
    if (h < 55) { // a flower
      c.fillStyle = '#2e6a34';
      c.fillRect(fx, gy - 8, 2, 8); // stem
      c.fillStyle = ['#ff6f91', '#fff5fa', '#ffd75e'][h % 3];
      c.fillRect(fx - 2, gy - 12, 6, 4); // bloom
    } else { // a grass tuft
      c.fillStyle = '#4e9a4e';
      c.fillRect(fx, gy - 6, 2, 6);
      c.fillRect(fx + 3, gy - 9, 2, 9);
      c.fillRect(fx + 6, gy - 5, 2, 5);
    }
  }
  for (const e of lvl.roster ?? []) {
    if (e.kind === 'bee') drawHomeFlower(c, e.x, gy);
  }
  for (const m of water) {
    drawReeds(c, m.x + 6, gy);
    drawReeds(c, m.x + m.w - 14, gy);
  }
}
