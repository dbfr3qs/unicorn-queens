// The Peak's wind: a pure function of level time (no drift, no RNG —
// snapshot-stable), with a one-shot state so the gust sfx plays once per
// cycle. Cycle (10 s): calm 0–6, telegraph 6–7 (the vane's tail flaps +
// the howl), gust 7–10 (a 100 px/s west push on grounded players in the
// snowfield) — every 4th gust (cycles 4, 8, …) is an UPDRAFT instead:
// flight time pauses and a neutral flyer is lifted gently.
export const WIND_CYCLE = 10;

export function windPhase(t) {
  const c = t % WIND_CYCLE, n = Math.floor(t / WIND_CYCLE);
  if (c < 6) return 'calm';
  if (c < 7) return 'telegraph';
  return n % 4 === 3 ? 'updraft' : 'gust';
}

// The wind zone: the snowfield, gate to spire.
export const WIND_X0 = 500, WIND_X1 = 3600;

export function inWindZone(x) {
  return x >= WIND_X0 && x < WIND_X1;
}

// Store the phase in level state and play the one howl per cycle at the
// calm→telegraph edge (zone-gated: the howl only if the player is in
// the snowfield, so the spire stays quiet).
export function updateWind(lvl, p, dt, fx, t) {
  const ph = windPhase(t);
  lvl.wind.phase = ph;
  if (ph !== lvl.wind.lastPhase) {
    if (ph === 'telegraph' && !p.dead && inWindZone(p.x + p.w / 2)) fx.play('gust');
    lvl.wind.lastPhase = ph;
  }
}
