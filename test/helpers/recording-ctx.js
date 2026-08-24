// Recording canvas 2D context for render snapshot tests.
// Instead of drawing, it records every method call and property
// assignment as a line of text; the log is compared via
// toMatchSnapshot().
//
// Floats are rounded to 3 dp so last-ulp arithmetic reordering doesn't
// churn snapshots. save/restore are recorded so draw nesting is visible.

const round = v => (typeof v === 'number' ? Number(v.toFixed(3)) : v);

// well-known props that tooling may probe; never record them
const NO_RECORD = {
  toString: () => '[RecordingCtx]',
  valueOf: () => '',
  toJSON: () => null,
};

export function createRecordingCtx() {
  const lines = [];
  const target = {};
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop in NO_RECORD) return NO_RECORD[prop];
      if (prop in t) return t[prop];
      // any other property is treated as a canvas method
      return (...args) => { lines.push(`${prop}(${args.map(round).join(', ')})`); };
    },
    set(t, prop, v) {
      t[prop] = v;
      lines.push(`${prop}=${round(v)}`);
      return true;
    },
  });
  return { ctx, lines, text: () => lines.join('\n') };
}

// Indent the log between save()/restore() pairs so snapshots read like
// nested draw calls and diffs stay localised to the block that changed.
// depth is clamped so an unbalanced restore (a bug) can't underflow.
export function pretty(lines) {
  let depth = 0;
  const out = [];
  for (const line of lines) {
    if (line === 'save()') {
      out.push('  '.repeat(depth) + 'save()');
      depth++;
    } else if (line === 'restore()') {
      depth = Math.max(0, depth - 1);
      out.push('  '.repeat(depth) + 'restore()');
    } else {
      out.push('  '.repeat(depth) + line);
    }
  }
  return out.join('\n');
}
