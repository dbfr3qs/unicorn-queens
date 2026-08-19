// WebAudio sound effects: lazily-created context, beeps per game event.
// Safe to import in Node (no context is created until initAudio()).

let audioCtx = null;
export let muted = false;

export function toggleMuted() {
  muted = !muted;
}

export function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function beep(freq, endFreq, dur, type, vol, delay) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime + (delay || 0);
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
  g.gain.setValueAtTime(vol || 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfx(name) {
  switch (name) {
    case 'jump':  beep(300, 560, 0.12, 'square', 0.12); break;
    case 'stomp': beep(220, 70, 0.15, 'triangle', 0.3); break;
    case 'box':   beep(160, 55, 0.12, 'square', 0.25); break;
    case 'gem':   beep(880, 1500, 0.1, 'sine', 0.2); break;
    case 'heart': beep(520, 880, 0.12, 'sine', 0.22); break;
    case 'hurt':  beep(320, 90, 0.22, 'sawtooth', 0.25); break;
    case 'land':  beep(120, 55, 0.06, 'triangle', 0.15); break;
    case 'die':   beep(400, 70, 0.4, 'sawtooth', 0.25); break;
    case 'fire':  beep(700, 300, 0.07, 'square', 0.1); break;
    case 'thwack': beep(600, 100, 0.1, 'square', 0.18); break;
    case 'bow':   beep(440, 660, 0.15, 'triangle', 0.25); break;
    case 'boots': [330, 440, 660].forEach((f, i) => beep(f, f, 0.09, 'triangle', 0.16, i * 0.07)); break;
    case 'magnet': beep(600, 1200, 0.15, 'sine', 0.18); break;
    case 'grow':  beep(220, 660, 0.22, 'triangle', 0.3); break;
    case 'win':   [523, 659, 784, 1047].forEach((f, i) => beep(f, f, 0.12, 'square', 0.18, i * 0.09)); break;
    case 'fireball': beep(280, 140, 0.18, 'sawtooth', 0.1); break;
    case 'fizzle': beep(180, 60, 0.12, 'triangle', 0.08); break;
    case 'boss': beep(140, 40, 0.5, 'sawtooth', 0.25); break;
    case 'bossHit': beep(200, 55, 0.22, 'sawtooth', 0.24); break;
    case 'pearl': [1318, 1760].forEach((f, i) => beep(f, f, 0.14, 'sine', 0.2, i * 0.09)); break;
    case 'seal': beep(160, 35, 0.45, 'square', 0.28); beep(900, 250, 0.08, 'square', 0.1, 0.03); break;
    case 'gate': [392, 587].forEach((f, i) => beep(f, f, 0.22, 'sine', 0.2, i * 0.14)); break;
  }
}

// Default fx context: wires game logic to the WebAudio backend.
// Logic modules receive an fx object and call fx.play(name);
// tests can pass a recorder instead.
export const fx = { play: sfx };
