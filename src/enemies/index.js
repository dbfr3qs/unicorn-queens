// Registry for enemy kind definitions: kind -> { kind, w, h, stompable,
// tuning..., update, draw, onHit?, hitSound?, deathSound?, deathFx? }.
// Kind files register here (P2+); enemies.js and render/enemies.js
// dispatch through it.
const REGISTRY = new Map();

export function register(def) {
  REGISTRY.set(def.kind, def);
}

export function getKind(kind) {
  return REGISTRY.get(kind);
}
