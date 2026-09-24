// Boss phase edges, relative to the hp the boss spawned with (e.maxHp —
// the difficulty sets it). Each edge is written at its designed hp;
// phaseEdge scales it in proportion, so at hard, where maxHp is the
// designed hp, it is exactly the number written.
export function phaseEdge(e, at, baseHp) {
  return Math.round(at * (e.maxHp ?? baseHp) / baseHp);
}

// How many pips a boss's bar shows: the hp it spawned with.
export function pipMax(e, baseHp) {
  return e.maxHp ?? baseHp;
}
