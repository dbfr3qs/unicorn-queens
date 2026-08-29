// The old bridge (level 6, x 5500): a plank span across the last pool.
// Raised (and non-solid: the platform's hidden flag) until the winch's
// final cog. When the w5 beat fires, bridge.state = 'lowering' with
// lowerT = LOWER_T: the span sinks 6 px to ground level over LOWER_T s
// (the creak is played by the beat) and turns solid when it lands.
export const LOWER_T = 1.2;
const RAISED_Y = 554, LOWERED_Y = 560;

export function updateBridge(lvl, dt) {
  const b = lvl.bridge;
  if (!b || b.state !== 'lowering') return;
  b.lowerT -= dt;
  const pl = lvl.platforms.find(pl => pl.kind === 'bridge');
  if (pl) pl.y = RAISED_Y + (LOWERED_Y - RAISED_Y) * (1 - Math.max(0, b.lowerT) / LOWER_T);
  if (b.lowerT <= 0) {
    b.state = 'down';
    if (pl) { pl.y = LOWERED_Y; pl.hidden = false; } // the span is a floor
  }
}
