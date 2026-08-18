// Render snapshot tests: pin the draw-call log for representative game
// states, so visual regressions from refactors fail here instead of
// being found by playing the level. Intentional visual change ->
// `npx vitest -u` and review the .snap diff in git. See
// RENDER-TEST-PLAN.md.
//
// NOTE: the harness import below must stay first — it seeds
// Math.random before src/background.js generates its stars at import
// time.
import { test, expect } from 'vitest';
import { freshGame, step } from './helpers/render-harness.js';

test('initial frame', () => {
  freshGame();
  expect(step({}, 0)).toMatchSnapshot();
});
