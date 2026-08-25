// The shaft beat: once the pearl breaks the exit seal, the sealed lattice
// retracts up into the ceiling over SHAFT_OPEN s (rumble), leaving the
// golden light shaft. The pearl itself is generic (pearl.js); this module
// only watches the exit lock and animates the gate.
export const SHAFT_OPEN = 1.2;

export function updateShaft(lvl, fx, dt = 0) {
  const s = lvl.shaft;
  if (!s) return;
  if (s.state === 'sealed' && lvl.exit && !lvl.exit.locked) {
    s.state = 'opening';
    s.openT = SHAFT_OPEN;
    fx.play('rumble');
  } else if (s.state === 'opening') {
    s.openT -= dt;
    if (s.openT <= 0) s.state = 'open';
  }
}
