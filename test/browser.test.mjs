// Real-browser checks: a headless Chrome or Edge loads a fake T3 Code page, applies the
// theme with T3 Code's own loader, and reports which cat shows in each situation.
// Skipped when no Chromium browser is found (set CHROME_PATH to point at one).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildTestPage, CASES, SIDEBAR, SETTINGS, EXTRAS, STATE_IDS } from './mock-page.mjs';

const browser = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find((p) => p && fs.existsSync(p));

let tmp, results;
before(() => {
  if (!browser) return;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mistral-t3-'));
  const page = path.join(tmp, 'test.html');
  fs.writeFileSync(page, buildTestPage());
  const dom = execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
    `--user-data-dir=${path.join(tmp, 'profile')}`, '--virtual-time-budget=2000', '--dump-dom', pathToFileURL(page).href,
  ], { encoding: 'utf8', timeout: 90_000, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const m = dom.match(/<pre id="results">([\s\S]*?)<\/pre>/);
  assert.ok(m && m[1], 'the test page produced no results');
  results = JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
});
after(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

const opts = { skip: browser ? false : 'no Chrome or Edge found (set CHROME_PATH)' };

test("T3 Code's loader keeps every declaration", opts, () => {
  assert.deepEqual(results.stripped, []);
  assert.ok(results.rules > 40, `only ${results.rules} rules parsed`);
  assert.equal(results.spritesFound, STATE_IDS.length, 'every sprite is its own image');
});

for (const [name, , , expected] of CASES) {
  test(`big cat is "${expected}" when: ${name}`, opts, () => {
    assert.equal(results.cases[name].cn, expected);
    assert.equal(results.cases[name].size, '128px×96px');
  });
}

test('big cat listens while you type', opts, (t) => {
  const r = results.cases['typing a message'];
  if (!r.focused) return t.skip('the headless browser gave the frame no focus');
  assert.equal(r.cn, 'listening');
});

for (const [word, expected] of SIDEBAR) {
  test(`sidebar shows ${expected ?? 'no cat'} for "${word}"`, opts, () => {
    assert.equal(results.sidebar[word], expected);
  });
}

test('dragging a chat: a paw bats at it', opts, () => {
  assert.equal(results.drag.moving[0], 'paw');
  assert.equal(results.drag.pinning[0], 'paw');
});

test('settling a chat: paws swipe from both sides', opts, () => {
  assert.deepEqual(results.drag.settling, ['paw', 'paw']);
});

test('the "Settled, Undo" notice gets a paw swipe', opts, () => {
  assert.equal(results.notice, 'paw');
});

for (const [section, expected] of SETTINGS) {
  test(`settings: ${section} page shows the ${expected} cat`, opts, () => {
    const r = results.settings[section];
    assert.equal(r.corner, expected);
    assert.equal(r.cornerShown, expected);
    assert.equal(r.size, '64px×48px');
    assert.equal(r.nav, 'subagent');
    assert.deepEqual(r.chaser, ['chase:0px', 'scratch:0px', 'nap:36px'], 'kitten naps at home until the pointer comes in');
  });
}

for (const [name, , , expected] of EXTRAS) {
  test(`${name} gets the ${expected} cat`, opts, () => assert.equal(results.extras[name], expected));
}

test('a kitten chases yarn along the sidebar', opts, () => assert.equal(results.yarn, 'yarn'));

test('pixel cursors: arrow on the page, paw on buttons, text cursor in the composer', opts, () => {
  assert.match(results.cursor.page, /^url\("data:image\/svg/);
  assert.match(results.cursor.button, /^url\("data:image\/svg/);
  assert.match(results.cursor.page, /\) 2 2, default$/);
  assert.match(results.cursor.button, /\) 8 2, pointer$/);
  assert.equal(results.cursor.input, 'text');
});
