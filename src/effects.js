// Named particle-burst presets shared by the simulation modules.
// Leaf module: data only, no imports. Presets are read by burst(), never
// mutated, so a single shared object per effect is safe.
export const FX = {
  landing: { count: 6, colors: ['#8d76b8', '#5d4a80'], speed: 60, size: 4, grav: -200, life: 0.35 },
  boxBreak: { count: 14, colors: ['#c98f3d', '#8a5f22', '#e8b86d'], speed: 170, up: 120, size: 6, grav: 700, life: 0.6 },
  enemyDeath: { count: 12, colors: ['#b57edc', '#fff5fa'], speed: 160, up: 100, size: 5, grav: 400, life: 0.5 },
  hurt: { count: 10, colors: ['#ff6f91', '#e33'], speed: 140, size: 4, grav: 300, life: 0.45 },
  gem: { count: 10, colors: ['#6fe3e1', '#c8fbfa', '#fff'], speed: 120, size: 3, grav: -100, life: 0.4 },
  bow: { count: 12, colors: ['#ffd75e', '#d9b380', '#fff'], speed: 130, size: 3, grav: -100, life: 0.45 },
  boots: { count: 10, colors: ['#ffd75e', '#ffe9b0', '#fff'], speed: 110, size: 3, grav: -100, life: 0.4 },
  grow: { count: 16, colors: ['#ffd75e', '#fff', '#ffe9b0'], speed: 150, size: 4, grav: -150, life: 0.5 },
  heart: { count: 10, colors: ['#ff6f91', '#fff'], speed: 120, size: 3, grav: -100, life: 0.4 },
  win: { count: 40, colors: ['#ffd75e', '#6fe3e1', '#ff6f91', '#fff'], speed: 220, up: 160, size: 5, grav: 500, life: 0.9 },
  fireballFizzle: { count: 8, colors: ['#ff8c42', '#ffd166', '#c1440e'], speed: 70, size: 3, grav: -60, life: 0.25 },
  mageDeath: { count: 30, colors: ['#b57edc', '#ffd75e', '#fff5fa'], speed: 260, up: 160, size: 6, grav: 400, life: 0.9 },
};
