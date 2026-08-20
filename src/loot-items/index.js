// Registry for loot item definitions: kind -> { kind, weight, onPickup, update, draw }.
// Item files register here (P2+); loot.js and render/loot.js dispatch through it.

const REGISTRY = new Map();

export function register(def) {
  REGISTRY.set(def.kind, def);
}

export function getItem(kind) {
  return REGISTRY.get(kind);
}
