// The Blackmire mud vent (level 6, x 2100): a 10 s bubble cycle — rise
// (1.2 s) from the mud to the pop point (y 480), bob there (5.0 s),
// sink (1.2 s), idle (2.6 s). The vent stays dormant until the winch's
// first socket is filled (the w1 beat sets vent.active); once the
// bubble is shot while up (arrows.js) vent.popped is set and the
// adder's cog floats at the pop point. The bubble is drawn by the
// world pass (render/mire.js); this module only advances the clock.
export const VENT_CYCLE = 10; // seconds per full cycle
export const VENT_TOP = 480;  // the bubble top at the pop point
const RISE = 1.2, BOB = 5.0, SINK = 1.2; // idle (2.6 s) fills the rest
const MUD = 560;               // the bubble rests below the mud line

export function updateVent(lvl, dt, fx) {
  const v = lvl.vent;
  if (!v || !v.active || v.popped) return;
  const prevT = v.t % VENT_CYCLE;
  v.t += dt;
  const t = v.t % VENT_CYCLE;
  let y;
  if (t < RISE) y = MUD + (VENT_TOP - MUD) * (t / RISE);
  else if (t < RISE + BOB) y = VENT_TOP + Math.sin((t - RISE) * 2) * 4;
  else if (t < RISE + BOB + SINK) y = VENT_TOP + (MUD - VENT_TOP) * ((t - RISE - BOB) / SINK);
  else y = MUD;
  v.bubbleY = y;
  // The bubble surfaces exactly once per cycle (rise -> bob edge).
  if (prevT < RISE && t >= RISE && t - prevT < 1) fx.play('puff');
}

// The 36×36 bubble, centered on the vent.
export function ventBubbleRect(lvl) {
  const v = lvl.vent;
  return { x: v.x - 18, y: v.bubbleY, w: 36, h: 36 };
}

// Up and shootable: within 8 px of the pop point.
export function ventBubbleUp(lvl) {
  const v = lvl.vent;
  return v.active && !v.popped && v.bubbleY <= VENT_TOP + 8;
}
