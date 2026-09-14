// Gamepad support: a PlayStation (or any "standard"-mapped) controller, read
// once a frame and turned into the same keyboard events the game already
// handles. Nothing downstream knows a pad exists — jump is still Space,
// so Cross also advances dialogue and restarts, exactly as Space does; the
// audio unlock, the mute keys and the cast's one-frame flag all come free.
//
// The Gamepad API is polled, not evented: navigator.getGamepads() is read
// each frame, the buttons and sticks are reduced to the set of key codes
// they stand for, and that set is diffed against the previous frame's to
// produce keydown on the way in and keyup on the way out.
//
// Standard-mapping indices (what Chrome and Firefox report a DualShock 4 as):
//   0 Cross  1 Circle  2 Square  3 Triangle   4 L1  5 R1  6 L2  7 R2
//   8 Share  9 Options  12-15 d-pad up/down/left/right
//   axes 0/1: left stick x/y (y is negative upward)
const BUTTON_CODES = {
  0: ['Space'], // Cross: jump — and dialogue advance, and restart, like Space
  1: ['KeyX'], // Circle: fire
  2: ['KeyX'], // Square: fire
  3: ['KeyS'], // Triangle: the flight spell
  5: ['KeyX'], // R1: fire, for anyone who shoots from the shoulder
  7: ['KeyX'], // R2
  4: ['KeyS'], // L1: fly
  6: ['KeyS'], // L2
  9: ['Enter'], // Options: advance dialogue (Enter does nothing else)
  12: ['ArrowUp'], // d-pad: the arrow keys, so up is jump + ascend, down descends
  13: ['ArrowDown'],
  14: ['ArrowLeft'],
  15: ['ArrowRight'],
};
export const DEADZONE = 0.4; // sticks rest off-centre; below this is "nothing"

// The key codes a pad's current state stands for. Pure: it reads only the
// fields it is given, so a plain object with buttons/axes tests it.
export function padCodes(gp) {
  const codes = new Set();
  if (!gp) return codes;
  const b = gp.buttons ?? [];
  for (const i in BUTTON_CODES) {
    if (b[i] && (b[i].pressed || b[i].value > 0.5)) for (const c of BUTTON_CODES[i]) codes.add(c);
  }
  const [ax = 0, ay = 0] = gp.axes ?? [];
  if (ax < -DEADZONE) codes.add('ArrowLeft');
  if (ax > DEADZONE) codes.add('ArrowRight');
  if (ay < -DEADZONE) codes.add('ArrowUp');
  if (ay > DEADZONE) codes.add('ArrowDown');
  return codes;
}

// Every connected pad, merged: two people on two pads both steer, which is
// harmless and simpler than choosing one.
export function allPadCodes(pads) {
  const codes = new Set();
  for (const gp of pads ?? []) for (const c of padCodes(gp)) codes.add(c);
  return codes;
}

let held = new Set();

// Called once a frame from the main loop. `dispatch` defaults to firing real
// KeyboardEvents on the window, so both of the game's keydown listeners
// (input.js's and main.js's restart handler) see them; tests pass their own.
export function pollGamepads(getPads = defaultGetPads, dispatch = defaultDispatch) {
  const now = allPadCodes(getPads());
  for (const c of now) if (!held.has(c)) dispatch('keydown', c);
  for (const c of held) if (!now.has(c)) dispatch('keyup', c);
  held = now;
}

export function resetGamepads() { held = new Set(); }

function defaultGetPads() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
  try { return Array.from(navigator.getGamepads()).filter(Boolean); } catch { return []; }
}

// The one way anything that is not a keyboard talks to the game: a synthetic
// key event on the window. Shared with the touch controls.
export function dispatchKey(type, code) {
  // `key` is filled in for completeness; everything here keys off `code`
  dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
}
const defaultDispatch = dispatchKey;
