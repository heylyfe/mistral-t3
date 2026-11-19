// A fake T3 Code page: the same attributes the theme hooks onto, one situation per frame.
// Used by the browser test, and by `npm run preview` to look at every state at once.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_IDS = ['idle', 'thinking', 'working', 'reading', 'delegating', 'subagent', 'waiting', 'error', 'done', 'sleeping', 'compacting', 'terminal', 'editing', 'browsing', 'planning', 'listening', 'grooming', 'chonk'];

const icon = (name) => `<svg class="lucide lucide-${name}" width="14" height="14"></svg>`;
const live = (name) => `<div data-timeline-row-kind="work-live"><span class="live-tool-shine">${icon(name)} running</span></div>`;
const working = (inner = 'Working for 12s') => `<div data-timeline-row-kind="working"><span>${inner}</span></div>`;
const user = '<div data-timeline-row-kind="user-message">fix the bug</div>';

// [name, timeline html, current thread status (sidebar), expected big cat]
export const CASES = [
  ['nothing happening', user, 'Done', 'idle'],
  ['agent working', user + working(), 'Working', 'working'],
  ['thinking', user + '<div data-timeline-row-kind="thinking">Thinking…</div>' + working(), 'Working', 'thinking'],
  ['reading a file', user + live('eye') + working(), 'Working', 'reading'],
  ['searching code', user + live('search') + working(), 'Working', 'reading'],
  ['running a command', user + live('terminal') + working(), 'Working', 'terminal'],
  ['editing a file', user + live('square-pen') + working(), 'Working', 'editing'],
  ['web search', user + live('globe') + working(), 'Working', 'browsing'],
  ['planning', user + live('list-todo') + working(), 'Working', 'planning'],
  ['subagent running', user + '<div data-v2-item-type="subagent" aria-description="Running" style="display:flex">Explore</div>' + working(), 'Working', 'delegating'],
  ['compacting', user + working('<span class="live-activity-focus">Compacting context</span>'), 'Working', 'compacting'],
  ['approval needed', user + '<div data-v2-item-type="approval_request">Allow?</div>', 'Approval', 'waiting'],
  ['question for you', user + '<button data-pending-user-input-toggle>Answer</button>', 'Input', 'waiting'],
  ['thread failed', user, 'Failed', 'error'],
  ['approval beats thinking', user + '<div data-timeline-row-kind="thinking"></div><div data-v2-item-type="approval_request"></div>', 'Approval', 'waiting'],
  ['error beats working', user + working(), 'Failed', 'error'],
];

// [sidebar status word, expected sidebar cat]
export const SIDEBAR = [['Working', 'working'], ['Approval', 'waiting'], ['Input', 'waiting'], ['Failed', 'error'], ['Done', 'done'], ['Woke', 'sleeping'], ['Idle', null]];

const frame = (theme, timeline, status, { typing = false, preview = false } = {}) => `<!doctype html><html class="dark"><head><meta charset="utf-8">
<style>
body{margin:0;font:13px system-ui,sans-serif;background:#15120F;color:#FFF8EA;display:flex;height:100vh}
[data-slot=sidebar]{width:190px;background:#1B1714;padding:40px 6px}
[data-sidebar-row]{display:block;padding:7px 10px;border-radius:6px;color:#E9E2D4}
[data-sidebar-row][aria-current=page]{background:#2E2620}
main{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:20px}
[data-timeline-row-kind],[data-v2-item-type]{padding:4px 0;color:#A89F92}
[data-chat-composer-form]{margin-top:${preview ? 110 : 12}px;background:#211C18;border:1px solid #332B24;border-radius:12px;padding:12px;min-height:44px}
</style>
<style id="theme">${theme}</style></head><body>
<div data-slot="sidebar"><div data-slot="sidebar-inner">
  <a data-sidebar-row aria-current="page" aria-label="Fix the bug, ${status}, my-app">Fix the bug</a>
  ${SIDEBAR.map(([w]) => `<a data-sidebar-row aria-label="Thread ${w}, ${w}, my-app">Thread · ${w}</a>`).join('')}
</div></div>
<main data-workspace-area="conversation">${timeline}
<form data-chat-composer-form><div class="composer-tiptap" tabindex="0">${typing ? 'hello there' : '<p class="text-placeholder">Ask anything</p>'}</div><button type="submit">↑</button></form>
</main>
<script>${fs.readFileSync(path.join(ROOT, 'test/t3/loader.js'), 'utf8')}</script>
</body></html>`;

function theme() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 't3-mistral.json'), 'utf8')).css;
}

/** The page the browser test loads: every case in its own iframe, results written to <pre id=results>. */
export function buildTestPage() {
  const css = theme();
  const all = [...CASES.map(([name, tl, st]) => [name, frame(css, tl, st)]), ['typing a message', frame(css, user + working(), 'Working', { typing: true })]];
  return `<!doctype html><meta charset="utf-8"><body>
${all.map(([name, html], i) => `<iframe id="f${i}" data-name="${name.replace(/"/g, '')}" width="800" height="400" srcdoc="${html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`).join('\n')}
<pre id="results"></pre>
<script>
const ids = ${JSON.stringify(STATE_IDS)};
const which = (doc, value) => { const root = getComputedStyle(doc.documentElement); return ids.find((id) => root.getPropertyValue('--mc-' + id).trim() === value.trim()) ?? (value.trim() || null); };
window.addEventListener('load', () => {
  const out = { cases: {}, sidebar: {}, stripped: [], rules: 0 };
  for (const f of document.querySelectorAll('iframe')) {
    const doc = f.contentDocument, w = f.contentWindow;
    if (f.dataset.name === 'typing a message') { doc.querySelector('.composer-tiptap').focus(); }
    const form = doc.querySelector('[data-chat-composer-form]');
    const before = w.getComputedStyle(form, '::before');
    out.cases[f.dataset.name] = { cn: which(doc, w.getComputedStyle(form).getPropertyValue('--mn')), size: before.width + '×' + before.height, focused: doc.hasFocus() };
    if (f.id === 'f0') {
      out.stripped = w.__stripped; out.rules = doc.adoptedStyleSheets[0].cssRules.length;
      out.spritesFound = new Set(ids.map((id) => w.getComputedStyle(doc.documentElement).getPropertyValue('--mc-' + id))).size;
      for (const row of doc.querySelectorAll('[data-sidebar-row]:not([aria-current])')) {
        out.sidebar[row.getAttribute('aria-label').split(', ')[1]] = which(doc, w.getComputedStyle(row).getPropertyValue('--ms'));
      }
    }
  }
  document.getElementById('results').textContent = JSON.stringify(out);
});
</script>`;
}

/** `npm run preview`: a page of fake T3 Code windows, one per situation, with the real theme applied. */
export function buildPreview() {
  const css = theme();
  const all = [...CASES, ['typing a message', user + working(), 'Working', 'listening']];
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mistral T3 preview</title>
<style>body{margin:0;padding:20px;background:#0E0C0A;color:#E9E2D4;font:13px system-ui;display:grid;grid-template-columns:repeat(auto-fill,minmax(560px,1fr));gap:16px}
figure{margin:0}figcaption{padding:6px 2px;color:#A89F92}iframe{width:100%;height:300px;border:1px solid #332B24;border-radius:8px}</style></head><body>
${all.map(([name, tl, st, exp]) => `<figure><figcaption>${name} → <b>${exp}</b></figcaption><iframe srcdoc="${frame(css, tl, st, { preview: true, typing: name === 'typing a message' }).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe></figure>`).join('\n')}
</body></html>`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(ROOT, 'mock-preview.html'), buildPreview());
  console.log('wrote mock-preview.html');
}
