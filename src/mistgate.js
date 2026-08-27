// The mist gate (level 5): the exit at the wood's east edge. Locked until
// the queen's story beat (q3) unlocks the exit and starts the brightening
// (openT); this module only decays openT over MIST_OPEN s. The field
// stays open once brightened — the locked/unlocked state lives on
// lvl.exit (the same locked-rect pattern as the pearl seal and the troll
// door), so the render can read it directly.
export const MIST_OPEN = 1.5;

export function updateMistgate(lvl, dt = 0) {
  const m = lvl.mistgate;
  if (!m) return;
  if (m.openT > 0) m.openT = Math.max(0, m.openT - dt);
}
