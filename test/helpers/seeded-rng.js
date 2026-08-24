// Installs a seeded PRNG (mulberry32) as Math.random.
// Side-effect module with no imports of its own: it must evaluate
// before any src/ module, so that import-time randomness (e.g. star
// generation in src/background.js) is deterministic. The harness
// imports it first.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 1234567;
Math.random = mulberry32(SEED);

// Restart the same sequence. The harness calls this in freshGame() so
// each test's snapshots are independent of test order and of how much
// randomness earlier tests consumed.
export function reseed() {
  Math.random = mulberry32(SEED);
}
