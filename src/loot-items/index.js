// Registry for loot item definitions: kind -> { kind, weight, onPickup, update, draw }.
// Item files register here (P2+); loot.js and render/loot.js dispatch through it.

export const REGISTRY = new Map(); // insertion order = drop-table order

export function register(def) {
  REGISTRY.set(def.kind, def);
}

export function getItem(kind) {
  return REGISTRY.get(kind);
}
