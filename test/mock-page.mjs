// A fake T3 Code page: the same attributes the theme hooks onto, one situation per frame.
// Used by the browser test, and by `npm run preview` to look at every state at once.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATE_IDS = ['idle', 'thinking', 'working', 'reading', 'delegating', 'subagent', 'waiting', 'error', 'done', 'sleeping', 'compacting', 'terminal', 'editing', 'browsing', 'planning', 'listening', 'grooming', 'chonk', 'painting', 'peek', 'paw', 'chase', 'scratch', 'nap', 'yarn'];

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

// [settings section, expected corner cat]
export const SETTINGS = [['appearance', 'painting'], ['keybindings', 'working'], ['archived', 'sleeping'], ['providers', 'delegating'], ['about', 'chonk'], ['general', 'idle'], ['something-new', 'grooming']];
// Rows being dragged, as T3 Code renders them: the dragged row gets shadow-lg, and a verb badge shows on the row.
const badge = (iconName, verb) => `<span role="status" class="pointer-events-none ml-auto inline-flex border border-primary/40 bg-primary/10 text-primary">${icon(iconName)}${verb}</span>`;
const DRAG_ROWS = `<a data-sidebar-row data-drag="moving" class="relative overflow-hidden shadow-lg" aria-label="Moved, Done, my-app">Moved</a>
  <a data-sidebar-row data-drag="pinning" aria-label="Pinning, Done, my-app">Pinning ${badge('pin', 'Pin')}</a>
  <a data-sidebar-row data-drag="settling" aria-label="Settling, Done, my-app">Settling ${badge('circle-check', 'Settle')}</a>`;
// Popups and controls the extras decorate: [name, html, pseudo, expected sprite]
export const EXTRAS = [
  ['dropdown menu', '<div data-slot="menu-positioner" style="position:absolute;top:60px;left:300px"><div data-slot="menu-popup">Rename</div></div>', '::before', 'peek'],
  ['select list', '<div data-slot="select-positioner" style="position:absolute;top:60px;left:400px"><div data-slot="select-popup">GPT</div></div>', '::before', 'peek'],
  ['switch knob', '<button role="switch" data-slot="switch"><span data-slot="switch-thumb" style="display:block;width:16px;height:16px"></span></button>', '', 'peek'],
  ['confirm dialog', '<div data-slot="alert-dialog-popup" style="position:fixed;top:100px;left:300px;width:300px;height:120px">Delete?</div>', '::after', 'waiting'],
  ['command palette', '<div data-command-palette="true" style="position:fixed;top:40px;left:250px;width:400px;height:200px">Search</div>', '::after', 'reading'],
];
const NOTICE = '<div data-notice class="flex h-6 min-w-0 flex-1 flex-row-reverse overflow-hidden starting:opacity-0">Settled, Undo</div>';

const settingsFrame = (theme, section) => `<!doctype html><html class="dark"><head><meta charset="utf-8">
<style>body{margin:0;font:13px system-ui,sans-serif;background:#15120F;color:#FFF8EA;display:flex;height:100vh}
nav{width:190px;background:#1B1714;padding:40px 6px}nav a{display:flex;height:32px;align-items:center;padding:0 10px;color:#E9E2D4}
nav a[aria-current]{background:#2E2620}[data-settings-page-scroll]{flex:1;overflow-y:auto}.page{max-width:560px;margin:0 auto;padding:30px}
.row{height:44px;border-bottom:1px solid #332B24}</style>
<style id="theme">${theme}</style></head><body>
<nav>${['general', 'appearance', 'keybindings', 'providers', 'archived', 'about', section].filter((v, i, a) => a.indexOf(v) === i)
    .map((id) => `<a data-settings-section="/settings/${id}"${id === section ? ' aria-current="page"' : ''}>${id}</a>`).join('')}</nav>
<div data-settings-page-scroll><div class="page"><h2>${section}</h2>${'<div class="row"></div>'.repeat(6)}</div></div>
<script>${fs.readFileSync(path.join(ROOT, 'test/t3/loader.js'), 'utf8')}</script>
</body></html>`;

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
  ${DRAG_ROWS}${NOTICE}
</div></div>${EXTRAS.map(([, html]) => html).join('')}
<main data-workspace-area="conversation">${timeline}
<form data-chat-composer-form><div class="composer-tiptap" contenteditable="true" tabindex="0">${typing ? 'hello there' : '<p class="text-placeholder">Ask anything</p>'}</div><button type="submit">↑</button></form>
</main>
<script>${fs.readFileSync(path.join(ROOT, 'test/t3/loader.js'), 'utf8')}</script>
</body></html>`;

function theme() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 't3-mistral.json'), 'utf8')).css;
}

/** The page the browser test loads: every case in its own iframe, results written to <pre id=results>. */
export function buildTestPage() {
  const css = theme();
  const all = [...CASES.map(([name, tl, st]) => [name, frame(css, tl, st)]), ['typing a message', frame(css, user + working(), 'Working', { typing: true })],
    ...SETTINGS.map(([id]) => ['settings:' + id, settingsFrame(css, id)])];
  return `<!doctype html><meta charset="utf-8"><body>
${all.map(([name, html], i) => `<iframe id="f${i}" data-name="${name.replace(/"/g, '')}" width="800" height="400" srcdoc="${html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`).join('\n')}
<pre id="results"></pre>
<script>
const ids = ${JSON.stringify(STATE_IDS)};
const which = (doc, value) => { const root = getComputedStyle(doc.documentElement); return ids.find((id) => root.getPropertyValue('--mc-' + id).trim() === value.trim()) ?? (value.trim() || null); };
// which sprite a pseudo-element shows: compare its background with each --mc-* sprite drawn on a probe
const bgWhich = (doc, w, el, pseudo) => {
  const probe = doc.body.appendChild(doc.createElement('i'));
  const bg = w.getComputedStyle(el, pseudo).backgroundImage;
  const hit = ids.find((id) => { probe.style.backgroundImage = 'var(--mc-' + id + ')'; return w.getComputedStyle(probe).backgroundImage === bg; });
  probe.remove();
  return hit ?? (bg === 'none' ? null : bg.slice(0, 40));
};
window.addEventListener('load', () => {
  const out = { cases: {}, sidebar: {}, drag: {}, settings: {}, stripped: [], rules: 0 };
  for (const f of document.querySelectorAll('iframe')) {
    const doc = f.contentDocument, w = f.contentWindow;
    if (f.dataset.name.startsWith('settings:')) {
      const scroll = doc.querySelector('[data-settings-page-scroll]'), after = w.getComputedStyle(scroll, '::after');
      out.settings[f.dataset.name.slice(9)] = { corner: which(doc, w.getComputedStyle(scroll).getPropertyValue('--mset')), cornerShown: bgWhich(doc, w, scroll, '::after'),
        size: after.width + '×' + after.height, nav: bgWhich(doc, w, doc.querySelector('[data-settings-section][aria-current]'), '::after'),
        // no pointer over the page: only the napping kitten shows, at home
        chaser: [[doc.documentElement, '::before'], [doc.documentElement, '::after'], [doc.body, '::after']].map(([el, ps]) => bgWhich(doc, w, el, ps) + ':' + w.getComputedStyle(el, ps).width) };
      continue;
    }
    if (f.dataset.name === 'typing a message') { doc.querySelector('.composer-tiptap').focus(); }
    const form = doc.querySelector('[data-chat-composer-form]');
    const before = w.getComputedStyle(form, '::before');
    out.cases[f.dataset.name] = { cn: which(doc, w.getComputedStyle(form).getPropertyValue('--mn')), size: before.width + '×' + before.height, focused: doc.hasFocus() };
    if (f.id === 'f0') {
      out.stripped = w.__stripped; out.rules = doc.adoptedStyleSheets[0].cssRules.length;
      out.spritesFound = new Set(ids.map((id) => w.getComputedStyle(doc.documentElement).getPropertyValue('--mc-' + id))).size;
      for (const row of doc.querySelectorAll('[data-drag]')) out.drag[row.dataset.drag] = [bgWhich(doc, w, row, '::before'), bgWhich(doc, w, row, '::after')];
      out.notice = bgWhich(doc, w, doc.querySelector('[data-notice]'), '::before');
      out.yarn = bgWhich(doc, w, doc.querySelector('[data-slot=sidebar-inner]'), '::after');
      out.extras = Object.fromEntries(${JSON.stringify(EXTRAS.map(([n, h, ps]) => [n, ps]))}.map(([n, ps], i) => {
        const el = doc.querySelector(['[data-slot=menu-positioner]', '[data-slot=select-positioner]', '[data-slot=switch-thumb]', '[data-slot=alert-dialog-popup]', '[data-command-palette]'][i]);
        return [n, bgWhich(doc, w, el, ps || null)];
      }));
      out.cursor = { page: w.getComputedStyle(doc.body).cursor, button: w.getComputedStyle(doc.querySelector("button")).cursor, input: w.getComputedStyle(doc.querySelector('.composer-tiptap[contenteditable], [data-chat-composer-form] textarea') ?? doc.body).cursor.slice(0, 4) };
      for (const row of doc.querySelectorAll('[data-sidebar-row]:not([aria-current]):not([data-drag])')) {
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
