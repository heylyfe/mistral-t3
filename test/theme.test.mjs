// Checks the theme the way T3 Code does (test/t3 is T3 Code's own filter, MIT).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { THEME_CSS_MAX_LENGTH, THEME_NAME_MAX_LENGTH, HEX_COLOR, COLOR_ROLE_KEY, themeCssLoadsRemoteFiles, themeCssValueFetches } from './t3/theme-css.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const STATES = ['idle', 'thinking', 'working', 'reading', 'delegating', 'subagent', 'waiting', 'error', 'done', 'sleeping', 'compacting', 'terminal', 'editing', 'browsing', 'planning', 'listening', 'grooming', 'chonk', 'painting', 'peek', 'paw', 'chase', 'scratch', 'nap', 'yarn'];
const theme = () => JSON.parse(read('t3-mistral.json'));

test('build is current', () => {
  const before = read('t3-mistral.json');
  execFileSync(process.execPath, ['build.mjs'], { cwd: ROOT });
  assert.equal(read('t3-mistral.json'), before, 'run npm run build and commit');
});

test('theme matches the T3 Code schema', () => {
  const t = theme();
  assert.equal(t.version, 1);
  assert.ok(t.name.length > 0 && t.name.length <= THEME_NAME_MAX_LENGTH);
  assert.ok(['light', 'dark'].includes(t.appearance));
  for (const p of [t.colors, t.variants.light]) for (const [k, v] of Object.entries(p)) {
    assert.match(k, COLOR_ROLE_KEY); assert.match(v, HEX_COLOR, k);
  }
  assert.deepEqual(Object.keys(t.colors).sort(), Object.keys(t.variants.light).sort());
  assert.ok(t.css.length <= THEME_CSS_MAX_LENGTH, `css is ${t.css.length}`);
});

test('css loads nothing remote and has no backslashes', () => {
  const { css } = theme();
  assert.equal(themeCssLoadsRemoteFiles(css), false);
  assert.ok(!css.includes(String.fromCharCode(92)));
});

test('every sprite is defined once, accepted by T3 Code, and used', () => {
  const { css } = theme();
  for (const id of STATES) {
    const m = [...css.matchAll(new RegExp(`--mc-${id}:(url\\("[^"]*"\\))`, 'g'))];
    assert.equal(m.length, 1, id);
    assert.equal(themeCssValueFetches(m[0][1]), false, `${id} would be dropped`);
    assert.ok(css.includes(`var(--mc-${id})`), `${id} unused`);
  }
});

test('sprites are self-contained SVGs with no scripts', () => {
  for (const id of STATES) {
    const s = read(`cats/cat-${id}.svg`);
    assert.ok(s.startsWith('<svg'));
    assert.doesNotMatch(s, /<script|on\w+=|href='(?!#)|https?:\/\/(?!www\.w3\.org)/i, id);
  }
});

test('the build lists the same cats the tests check', async () => {
  const src = read('build.mjs');
  const order = src.match(/const ORDER = \[([^\]]*)\]/)[1].match(/'([a-z]+)'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(order, STATES);
});

test('the sprite-only mod file is valid on its own', () => {
  const css = read('cats/mistral-cats-mod.css');
  assert.equal(themeCssLoadsRemoteFiles(css), false);
  assert.ok(css.length < THEME_CSS_MAX_LENGTH);
});
