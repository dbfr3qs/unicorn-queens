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
