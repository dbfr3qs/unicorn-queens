// Touch controls: on-screen buttons for a phone or tablet, each one a key.
// Built here rather than in index.html so the page stays a canvas and a
// footer, and shown only where the pointer is coarse — a thumb, not a mouse.
//
// Like the gamepad, the buttons speak keyboard: a press dispatches keydown
// for the button's code and the release keyup, through the same dispatcher,
// so the game sees Space and ArrowLeft and knows nothing of thumbs. Pointer
// events rather than touch events because each finger is its own pointer:
// holding JUMP with one thumb while the other steers is two pointers, and
// each releases only its own key.
import { dispatchKey } from './gamepad.js';

// The layout: two clusters, each a list of rows; null is an empty cell.
// Codes are what the key handlers already understand; the label is what
// the thumb sees. The left cluster is a d-pad — a cross, the way a pad's
// is — so up (which also jumps, as the key does) and down sit where a thumb
// expects them, not in a row above.
export const LEFT = [
  [null, { code: 'ArrowUp', label: '▲', pad: true }, null],
  [{ code: 'ArrowLeft', label: '◀', pad: true }, { hub: true }, { code: 'ArrowRight', label: '▶', pad: true }],
  [null, { code: 'ArrowDown', label: '▼', pad: true }, null],
];
export const RIGHT = [
  [{ code: 'KeyS', label: 'FLY' }, { code: 'KeyX', label: 'FIRE' }],
  [{ code: 'Space', label: 'JUMP', wide: true }], // and dialogue, and restart: it is Space
];

export function wantsTouch() {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

const CSS = `
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 2; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
#touch .cluster { position: absolute; bottom: calc(14px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 10px; }
#touch .left { left: calc(14px + env(safe-area-inset-left)); }
#touch .right { right: calc(14px + env(safe-area-inset-right)); align-items: flex-end; }
#touch .row { display: flex; gap: 10px; justify-content: flex-end; }
#touch .left { gap: 0; }
#touch .left .row { gap: 0; justify-content: flex-start; }
#touch .cell { width: 58px; height: 58px; }
#touch .left { pointer-events: auto; touch-action: none; }
#touch button { pointer-events: auto; touch-action: none; width: 64px; height: 64px; border-radius: 50%;
  border: 2px solid rgba(181,126,220,0.75); background: rgba(26,16,37,0.55); color: #e8dcff;
  font: bold 15px monospace; padding: 0; -webkit-tap-highlight-color: transparent; }
#touch button.pad { width: 58px; height: 58px; border-radius: 10px; font-size: 18px; } /* the cross: square keys, touching */
#touch .hub { width: 58px; height: 58px; background: rgba(26,16,37,0.55); border: 2px solid rgba(181,126,220,0.35); box-sizing: border-box; }
#touch button.pad, #touch .hub { pointer-events: none; }
#touch button.wide { width: 138px; border-radius: 32px; }
#touch button.down { background: rgba(181,126,220,0.6); }
/* Make room: the game gives up its 1:1 before it lets the buttons sit on
   it. Landscape keeps a cluster's width clear each side; portrait keeps
   the bottom clear and lifts the game toward the top. */
@media (orientation: landscape) { body.touch canvas { max-width: calc(100vw - 420px); } }
@media (orientation: portrait) { body.touch { align-items: flex-start; padding-top: calc(12px + env(safe-area-inset-top)); box-sizing: border-box; } body.touch canvas { max-height: calc(100dvh - 240px); } }
body.touch footer { top: calc(8px + env(safe-area-inset-top)); left: calc(12px + env(safe-area-inset-left)); right: auto; bottom: auto; } /* out from under JUMP */
#touch .fs { position: absolute; top: calc(10px + env(safe-area-inset-top)); right: calc(10px + env(safe-area-inset-right)); width: 44px; height: 44px; font-size: 20px; }
`;

// The d-pad: where each finger is, not which button it landed on. A code is
// down while at least one pointer is on it; a pointer that slides to another
// cell (or onto the hub, or off the pad) swaps or drops its key, so two thumbs
// never release each other's keys and a slide needs no lift.
export function padCodeAt(x, y, rect) {
  const c = Math.floor((x - rect.left) / (rect.width / 3));
  const r = Math.floor((y - rect.top) / (rect.height / 3));
  if (c === 1 && r === 0) return 'ArrowUp';
  if (c === 1 && r === 2) return 'ArrowDown';
  if (r === 1 && c === 0) return 'ArrowLeft';
  if (r === 1 && c === 2) return 'ArrowRight';
  return null; // the hub, the corners, and anywhere outside
}

export function createPad(dispatch) {
  const at = new Map(); // pointerId -> code
  const engaged = new Set(); // pointers between their down and their lift, hub or not
  const held = code => [...at.values()].includes(code);
  const point = (id, code) => {
    engaged.add(id);
    const prev = at.get(id) ?? null;
    if (prev === code) return;
    if (code === null) at.delete(id); else at.set(id, code);
    if (prev !== null && !held(prev)) dispatch('keyup', prev);
    if (code !== null && [...at.values()].filter(c => c === code).length === 1) dispatch('keydown', code);
  };
  const lift = id => { point(id, null); engaged.delete(id); };
  const liftAll = () => { for (const id of [...engaged]) lift(id); };
  // A move only counts for a pointer that went down: a hovering mouse or pen moves unpressed.
  const move = (id, code) => { if (engaged.has(id)) point(id, code); };
  return { point, move, lift, liftAll };
}

// One set of listeners for the whole cross; its buttons ignore the pointer.
function wirePad(cluster, buttons, dispatch) {
  const pad = createPad((type, code) => {
    buttons[code]?.classList.toggle('down', type === 'keydown');
    dispatch(type, code);
  });
  const code = e => padCodeAt(e.clientX, e.clientY, cluster.getBoundingClientRect());
  const move = e => pad.move(e.pointerId, code(e));
  const up = e => pad.lift(e.pointerId);
  cluster.addEventListener('pointerdown', e => {
    try { cluster.setPointerCapture?.(e.pointerId); } catch { /* the pointer may already be gone */ }
    pad.point(e.pointerId, code(e));
  });
  cluster.addEventListener('pointermove', move);
  cluster.addEventListener('pointerup', up);
  cluster.addEventListener('pointercancel', up);
  cluster.addEventListener('lostpointercapture', up);
  cluster.addEventListener('contextmenu', e => e.preventDefault()); // a long press is a hold, not a menu
}

// Wire one action button: its pointer down is the key down; the same
// pointer's up, cancel or wander off the button is the key up. Nothing else
// can release it, so two thumbs never release each other's keys.
function wire(btn, code, dispatch) {
  let pointer = null;
  const down = e => {
    if (pointer !== null) return;
    pointer = e.pointerId;
    btn.setPointerCapture?.(e.pointerId);
    btn.classList.add('down');
    dispatch('keydown', code);
  };
  const up = e => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    btn.classList.remove('down');
    dispatch('keyup', code);
  };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', up);
  btn.addEventListener('contextmenu', e => e.preventDefault()); // a long press is a hold, not a menu
}

export function initTouch(onFullscreen, dispatch = dispatchKey) {
  if (typeof document === 'undefined' || !document.body || document.getElementById('touch')) return null;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'touch';
  const buttons = {};
  for (const [side, rows] of [['left', LEFT], ['right', RIGHT]]) {
    const cluster = document.createElement('div');
    cluster.className = `cluster ${side}`;
    for (const row of rows) {
      const el = document.createElement('div');
      el.className = 'row';
      for (const b of row) {
        if (!b || b.hub) { // an empty corner of the cross, or its centre
          const cell = document.createElement('div');
          cell.className = b ? 'cell hub' : 'cell';
          el.appendChild(cell);
          continue;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = b.label;
        btn.className = [b.pad ? 'pad' : '', b.wide ? 'wide' : ''].join(' ').trim();
        btn.setAttribute('aria-label', b.code);
        if (b.pad) buttons[b.code] = btn; else wire(btn, b.code, dispatch);
        el.appendChild(btn);
      }
      cluster.appendChild(el);
    }
    if (side === 'left') wirePad(cluster, buttons, dispatch);
    root.appendChild(cluster);
  }
  if (onFullscreen) { // real gesture, so the browser allows it here
    const fs = document.createElement('button');
    fs.type = 'button'; fs.className = 'fs'; fs.textContent = '⛶'; fs.setAttribute('aria-label', 'fullscreen');
    fs.addEventListener('click', onFullscreen);
    root.appendChild(fs);
  }
  document.body.classList.add('touch');
  document.body.appendChild(root);
  return root;
}
