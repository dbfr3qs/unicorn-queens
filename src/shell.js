// The page shell: fullscreen. Pure over a plain `doc`, so it tests in Node.
// The page (documentElement) goes fullscreen, not the canvas: the touch
// overlay is a sibling of the canvas in <body>, and a fullscreen canvas
// would leave it out of the fullscreen layer.

// Always a promise, never a rejection: a refusal (no gesture, denied) and
// the webkit calls that return undefined both settle to undefined.
const settle = fn => {
  try { return Promise.resolve(fn()).then(() => undefined, () => undefined); }
  catch { return Promise.resolve(); }
};

export function fullscreenApi(doc) {
  const el = doc?.documentElement;
  if (!el) return null;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return null;
  return {
    request: () => settle(() => req.call(el)),
    exit: () => settle(() => (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc)),
    active: () => !!(doc.fullscreenElement || doc.webkitFullscreenElement),
  };
}

// Toggle on a fullscreenApi; resolves true only if the page was ENTERED
// (really fullscreen afterwards), so callers can gate entry-only follow-ups.
export async function toggleFullscreenOn(fs) {
  if (fs.active()) { await fs.exit(); return false; }
  await fs.request();
  return fs.active();
}

// The end card ignores Space for this long, so a held or mashed jump from
// the death/win moment cannot dismiss it unread.
export const CARD_GUARD = 0.4;
export const cardOpen = t => t >= CARD_GUARD;

// F toggles fullscreen: a real, first press, with no modifier (Ctrl/Cmd+F is
// the browser's find, Alt+F a menu).
export const isFullscreenKey = e =>
  e.code === 'KeyF' && !e.repeat && e.isTrusted && !e.ctrlKey && !e.metaKey && !e.altKey;

// Keys that end the opening scene: not the mute/music/fullscreen keys, not
// anything modified.
const NOT_SKIP = new Set(['KeyM', 'KeyN', 'KeyF']);
export const skipsIntro = e => !NOT_SKIP.has(e.code) && !e.ctrlKey && !e.metaKey && !e.altKey;
