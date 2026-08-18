// Shared palette + fonts for the render modules.
// Colors used by 2+ render files (plus HUD-only colors and fonts) live here;
// single-use colors stay local to their draw function.
export const palette = {
  gold: '#ffd75e',         // horn, crown, goal knob, grow sparkle, win text
  lavender: '#cbb8ff',     // stars, goal pole, HUD subtext
  pink: '#ff6f91',         // hearts, goal flag, loot heart
  teal: '#6fe3e1',         // score, gem
  wood: '#d9b380',         // bow limb, arrow shaft
  unicornWhite: '#fff5fa', // unicorn body, game-over text
  night: '#2d1b4e',        // ground fill, slime feet
  white: '#fff',           // slime eye, bow string
  clear: '#0d0815',        // screen clear

  // HUD
  heartEmpty: '#33234f',
  hint: '#5d4a80',
  bowHint: '#8d76b8',
  overlay: 'rgba(13, 8, 21, 0.7)',
};

export const fonts = {
  hud: '18px monospace',
  title: '28px monospace',
  sub: '16px monospace',
  hint: '12px monospace',
};
