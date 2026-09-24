// Difficulty: the three presets and the run's current choice. Hard is the
// game as designed; Medium and Easy loosen from it (DIFFICULTY-PLAN.md).
// Systems read `difficulty()` at use time, so a change applies from the
// next read — the picker only changes it between runs.

export const PRESETS = {
  easy: { hearts: 5, invuln: 2.0, pitDamage: 0, revive: true, bossHp: 0.6, bossCd: 1.4, bossTell: 1.5, projSpeed: 0.8, hazard: 0.7 },
  medium: { hearts: 4, invuln: 1.75, pitDamage: 1, revive: false, bossHp: 0.8, bossCd: 1.2, bossTell: 1.2, projSpeed: 0.9, hazard: 0.85 },
  hard: { hearts: 3, invuln: 1.5, pitDamage: 1, revive: false, bossHp: 1.0, bossCd: 1.0, bossTell: 1.0, projSpeed: 1.0, hazard: 1.0 },
};
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const DEFAULT_DIFFICULTY = 'hard';
const STORAGE_KEY = 'unicorn-queens.difficulty';

let current = DEFAULT_DIFFICULTY;

export function difficultyName() { return current; }
export function difficulty() { return PRESETS[current]; }

// Unknown names are ignored; returns whether the setting changed.
export function setDifficulty(name) {
  if (!PRESETS[name] || name === current) return false;
  current = name;
  return true;
}

// A boss's spawn hp under the preset: rounded to a multiple of `step` (the
// Frost Queen's three winters, the wizard's two stages), never below it.
export function scaleBossHp(hp, step = 1) {
  return Math.max(step, Math.round(hp * difficulty().bossHp / step) * step);
}

// ?difficulty=easy|medium|hard, or null when missing or unknown.
export function difficultyFromSearch(search = '') {
  const name = new URLSearchParams(search).get('difficulty')?.toLowerCase();
  return PRESETS[name] ? name : null;
}

// The remembered choice. Storage may be missing or throw (private
// windows, blocked site data): the game then just starts on the default.
export function loadDifficulty(storage = globalThis.localStorage) {
  try {
    const name = storage?.getItem(STORAGE_KEY);
    if (PRESETS[name]) current = name;
  } catch { /* storage unavailable: keep the default */ }
  return current;
}

export function saveDifficulty(storage = globalThis.localStorage) {
  try { storage?.setItem(STORAGE_KEY, current); } catch { /* not remembered; still applies this session */ }
}

// Boot order: the URL wins (a test link shouldn't overwrite the player's
// saved choice, so it isn't saved), else the remembered choice.
export function initDifficulty(search = '', storage = globalThis.localStorage) {
  const fromUrl = difficultyFromSearch(search);
  if (fromUrl) current = fromUrl;
  else loadDifficulty(storage);
  return current;
}
