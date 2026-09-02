import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { CandidateList } from '../components/CandidateList';
import { CARD_HEIGHT } from '../components/CandidateCard';
import { resolveView } from '../lib/route';
import { avatarUrl, displayName } from '../lib/auth';
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
  ['/dashboard', 'dashboard'],
  ['/dashboard/', 'dashboard'],
  ['/', null],
  ['', null],
  ['/nope', null],
  ['/widgetfoo', null],
  ['/webuixyz', null],
  ['/dashboardxyz', null],
];
for (const [path, expected] of routeCases) {
  const actual = resolveView(path);
  assert(actual === expected, `resolveView(${JSON.stringify(path)}) = ${actual}, expected ${expected}`);
}
console.log('routes checked   :', routeCases.length, 'paths, incl. unknown -> null');

// --- Discord avatar + display name ---
const withAvatar = { id: '80351110224678912', username: 'nelly', discriminator: '0',
                     global_name: 'Nelly', avatar: '8342729096ea3675442027381ff50dfe' };
const pomeloNoAvatar = { id: '80351110224678912', username: 'nelly', discriminator: '0',
                         global_name: null, avatar: null };
const legacyNoAvatar = { id: '80351110224678912', username: 'nelly', discriminator: '1337',
                         avatar: null };

assert(avatarUrl(withAvatar).startsWith(
  'https://cdn.discordapp.com/avatars/80351110224678912/8342729096ea3675442027381ff50dfe.png'),
  'custom avatar must use the avatars/<id>/<hash> CDN path');

// snowflake >> 22 exceeds 32 bits, so this is only right if BigInt is used
const expectedIndex = Number((BigInt('80351110224678912') >> 22n) % 6n);
assert(avatarUrl(pomeloNoAvatar) === `https://cdn.discordapp.com/embed/avatars/${expectedIndex}.png`,
  `pomelo default avatar index must be (id >> 22) % 6 = ${expectedIndex}`);
assert(avatarUrl(legacyNoAvatar) === `https://cdn.discordapp.com/embed/avatars/${1337 % 5}.png`,
  'legacy default avatar index must be discriminator % 5');
assert(displayName(withAvatar) === 'Nelly', 'global_name wins over username');
assert(displayName(pomeloNoAvatar) === 'nelly', 'username is the fallback when global_name is null');
console.log('discord avatars :', 'pomelo index', expectedIndex, '| legacy index', 1337 % 5, '| ok');

console.log('\nRENDER CHECK PASS');
