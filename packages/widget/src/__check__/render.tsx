import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { CandidateList } from '../components/CandidateList';
import { CARD_HEIGHT } from '../components/CandidateCard';
import { resolveView } from '../lib/route';
import type { Candidate } from '../lib/types';

const c = (id: string, keyCode: string, name: string, votes: number): Candidate =>
  ({ id, keyCode, name, colorHex: '#06B6D4', votes, percentage: 0 });

// DOM order is 1,2,3 but Charlie leads -> he must be painted at row 0.
const candidates = [c('c1', '1', 'ALPHA', 5), c('c2', '2', 'BRAVO', 9), c('c3', '3', 'CHARLIE', 12)];
const html = renderToStaticMarkup(
  React.createElement(CandidateList, { candidates, gap: 8, isSessionEnded: true })
);

const offsets = [...html.matchAll(/translateY\((\d+)px\)/g)].map((m) => Number(m[1]));
const names = [...html.matchAll(/>([A-Z]{5,7})</g)].map((m) => m[1]);
const step = CARD_HEIGHT + 8;

console.log('CARD_HEIGHT      :', CARD_HEIGHT, '| step:', step);
console.log('DOM order        :', names.join(', '));
console.log('translateY by row:', offsets.join(', '));
console.log('container height :', /height:(\d+)px/.exec(html)?.[1]);
console.log('winner crowned   :', html.includes('WINNER'));

// throwing exits non-zero on its own, so this needs no @types/node
const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(`RENDER CHECK FAILED: ${msg}`);
};
assert(offsets[0] === 2 * step, 'ALPHA (fewest votes) must sit in the last row');
assert(offsets[1] === 1 * step, 'BRAVO must sit in the middle row');
assert(offsets[2] === 0, 'CHARLIE (most votes) must sit in the first row');
assert(html.includes(`height:${3 * step - 8}px`), 'container must be tall enough for 3 rows');
assert((html.match(/WINNER/g) || []).length === 1, 'exactly one winner badge');
// --- routing: each view owns its prefix, unknown paths resolve to null ---
const routeCases: ReadonlyArray<[string, ReturnType<typeof resolveView>]> = [
  ['/widget', 'widget'],
  ['/widget/', 'widget'],
  ['/widget/abc123', 'widget'],
  ['/WIDGET', 'widget'],
  ['/webui', 'webui'],
  ['/webui/abc123', 'webui'],
  ['/', null],
  ['', null],
  ['/nope', null],
  ['/widgetfoo', null],
  ['/webuixyz', null],
];
for (const [path, expected] of routeCases) {
  const actual = resolveView(path);
  assert(actual === expected, `resolveView(${JSON.stringify(path)}) = ${actual}, expected ${expected}`);
}
console.log('routes checked   :', routeCases.length, 'paths, incl. unknown -> null');

console.log('\nRENDER CHECK PASS');
