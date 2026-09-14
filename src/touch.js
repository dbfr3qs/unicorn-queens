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

// The layout: two clusters, each a list of rows. Codes are what the key
// handlers already understand; the label is what the thumb sees.
export const LEFT = [
  [{ code: 'ArrowUp', label: '▲', size: 's' }, { code: 'ArrowDown', label: '▼', size: 's' }], // flight: up also jumps, as the key does
  [{ code: 'ArrowLeft', label: '◀' }, { code: 'ArrowRight', label: '▶' }],
];
export const RIGHT = [
  [{ code: 'KeyS', label: 'FLY', size: 's' }, { code: 'KeyX', label: 'FIRE' }],
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
#touch button { pointer-events: auto; touch-action: none; width: 64px; height: 64px; border-radius: 50%;
  border: 2px solid rgba(181,126,220,0.75); background: rgba(26,16,37,0.55); color: #e8dcff;
  font: bold 15px monospace; padding: 0; -webkit-tap-highlight-color: transparent; }
#touch button.s { width: 48px; height: 48px; font-size: 13px; }
#touch button.wide { width: 138px; border-radius: 32px; }
#touch button.down { background: rgba(181,126,220,0.6); }
body.touch footer { top: calc(8px + env(safe-area-inset-top)); left: calc(12px + env(safe-area-inset-left)); right: auto; bottom: auto; } /* out from under JUMP */
#touch .fs { position: absolute; top: calc(10px + env(safe-area-inset-top)); right: calc(10px + env(safe-area-inset-right)); width: 44px; height: 44px; font-size: 20px; }
`;

// Wire one button: its pointer down is the key down; the same pointer's up,
// cancel or wander off the button is the key up. Nothing else can release
// it, so two thumbs never release each other's keys.
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
  for (const [side, rows] of [['left', LEFT], ['right', RIGHT]]) {
    const cluster = document.createElement('div');
    cluster.className = `cluster ${side}`;
    for (const row of rows) {
      const el = document.createElement('div');
      el.className = 'row';
      for (const b of row) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = b.label;
        btn.className = [b.size === 's' ? 's' : '', b.wide ? 'wide' : ''].join(' ').trim();
        btn.setAttribute('aria-label', b.code);
        wire(btn, b.code, dispatch);
        el.appendChild(btn);
      }
      cluster.appendChild(el);
    }
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
