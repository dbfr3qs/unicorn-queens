// The Great Clock (level 8): one accumulator that moves every machine in
// the citadel on the same beat. The period lengthens with each mainspring
// cut (6.0 + 0.8·cuts) — the gears slow, the light dims, the chime
// flattens a notch. On each wrap the chime sounds (the level's heartbeat),
// the gear platform slides to its other slot, and the bookcase panel
// opens its 2.0 s window. The pendulum rod swings one full arc per period.
// When the Warden rests (M6) the clock stops — but his rest (dyingT)
// still runs down: the machine holds, the moment finishes.
export const CHIME_SLIDE = 0.5, PANEL_WINDOW = 2.0, GEAR_BASE = 6.0, GEAR_STEP = 0.8;
export const GEAR_X0 = 1700, GEAR_X1 = 1770;
const ROD_DIST = 19; // 7 px rod half + 12 px player allowance

export function clockCuts(lvl) { return (lvl.springs ?? []).filter(s => s.cut).length; }
export function periodFor(cuts) { return GEAR_BASE + GEAR_STEP * cuts; }
export function gearSpeed(cuts, stopped) { return stopped ? 0 : (4 - cuts) / 4; }
export function lightLevel(cuts, stopped) {
  return Math.max(0.2, 1 - 0.2 * (cuts + (stopped ? 1 : 0))); // the final dim (M6)
}
export function chimePitch(cuts) { return 0.94 ** cuts; } // -6% per cut

// The gear platform: rests at one slot, slides 70 px to the other in the
// 0.5 s after each chime (deviation 3). Pure read of (t, chimeCount).
export function gearPlatX(c) {
  const slot = n => (n % 2 === 0 ? GEAR_X0 : GEAR_X1);
  const rest = slot(c.chimeCount);
  if (c.t < CHIME_SLIDE) {
    const from = slot(c.chimeCount - 1);
    return from + (rest - from) * (c.t / CHIME_SLIDE);
  }
  return rest;
}

// The bookcase panel's slide frac: 0.4 s rise, 1.2 s hold, 0.4 s fall,
// closed for the rest of the period (deviation 2). `held` (no-crush) pins
// it open while a player is still inside the opening.
export function panelFrac(c, held) {
  if (held) return 1;
  if (c.t < 0.4) return c.t / 0.4;
  if (c.t < 1.6) return 1;
  if (c.t < PANEL_WINDOW) return (PANEL_WINDOW - c.t) / 0.4;
  return 0;
}

// The pendulum pose: pivot (4000, 100), arm 420, ±40°. One source of
// truth for the rod's collision and both renders (world pass + zone
// silhouette).
export function pendulumPose(lvl) {
  const c = lvl.clock;
  const th = (40 * Math.PI / 180) * Math.sin(2 * Math.PI * c.t / c.period);
  return { px: 4000, py: 100, tx: 4000 + 420 * Math.sin(th), ty: 100 + 420 * Math.cos(th) };
}

export function updateClock(lvl, p, enemies, dt, fx) {
  if (!lvl.clock) return;
  const c = lvl.clock;
  const cuts = clockCuts(lvl);
  // The Warden's rest runs down even once the clock has stopped (M6 adds
  // the toll at the 1.0 crossing).
  const w = enemies?.find(e => e.kind === 'warden' && e.dead);
  if (w && w.dyingT > 0) w.dyingT = Math.max(0, w.dyingT - dt);
  // The trapdoor (M5): the pearl-taken drops the lid over the shaft. Runs
  // every frame, even once the clock has stopped (the Warden's rest).
  if (lvl.trapdoor && !lvl.trapdoor.open && lvl.pearl && lvl.pearl.taken) {
    lvl.trapdoor.open = true;
    const lid = lvl.platforms.find(pl => pl.kind === 'trapdoor');
    if (lid) lid.hidden = true; // the lid drops; the shaft is open
    fx.play('seal');
  }
  if (c.stopped) return;

  c.t += dt;
  c.gearRot += gearSpeed(cuts, false) * dt * 0.6;
  if (c.t >= c.period) { // the chime: the beat's heartbeat
    c.t -= c.period;
    c.chimeCount++;
    lvl.shelfPanel.held = false;
    fx.play(p.x < 600 ? 'chimeFar' : 'chime', chimePitch(cuts));
  }

  const g = lvl.platforms.find(pl => pl.kind === 'gear');
  if (g) {
    const nx = gearPlatX(c);
    const dx = nx - g.x;
    // The carry: a grounded player standing on the plate rides the slide.
    if (dx !== 0 && p.onGround && Math.abs(p.y + p.h - g.y) < 4 &&
        p.x + p.w > g.x && p.x < g.x + g.w) p.x += dx;
    g.x = nx;
  }

  const panel = lvl.doors.find(d => d.kind === 'shelfpanel');
  if (panel) {
    const inOpen = p.x + p.w > panel.x && p.x < panel.x + panel.w;
    if (!inOpen) lvl.shelfPanel.held = false;
    if (c.t >= PANEL_WINDOW && inOpen) lvl.shelfPanel.held = true; // no crush
    panel.state = (c.t < PANEL_WINDOW || lvl.shelfPanel.held) ? 'open' : 'locked';
  }

  if (!p.dead) pushFromRod(p, pendulumPose(lvl)); // silent: the swing is the telegraph
}

// Push the player out of the rod (a capsule around the arm segment).
function pushFromRod(p, pose) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const { px, py, tx, ty } = pose;
  const dx = tx - px, dy = ty - py;
  const len2 = dx * dx + dy * dy;
  const s = Math.max(0, Math.min(1, ((cx - px) * dx + (cy - py) * dy) / len2));
  const qx = px + s * dx, qy = py + s * dy;
  const nx = cx - qx, ny = cy - qy;
  const d = Math.hypot(nx, ny);
  if (d >= ROD_DIST) return;
  if (d < 1e-6) { p.y -= ROD_DIST; return; } // degenerate: push up
  p.x += (nx / d) * (ROD_DIST - d);
  p.y += (ny / d) * (ROD_DIST - d);
}
