// Mistral T3: draws every pixel cat, then writes the sprites, the sprite CSS,
// the T3 Code theme JSON and the gallery. No dependencies.
//   node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s); };

// ── Palette ────────────────────────────────────────────────────────
// Mistral rainbow (mistral.ai/brand), yellow to red.
const Y = '#FFD800', OL = '#FFAF00', O = '#FF8205', OD = '#FA500F', RD = '#E10500';
// The Mistral Large 4 cat's own fur: three oranges mixed pixel by pixel,
// a red collar and a gold bell.
const FUR = { a: '#E46C3C', b: '#E45424', c: '#E48430', p: '#F2A35E' };
const COLLAR = '#CC3018', BELL = '#F0C054', INK = '#1E1210', CREAM = '#FFF3D6';
const GREEN = '#98E024', SKY = '#7FC8FF', PINK = '#FF8FA3';

// ── Pixel helpers ──────────────────────────────────────────────────
function rows(spec, dx = 0, dy = 0) {
  const px = [];
  for (const [y, segs] of Object.entries(spec)) {
    for (const [a, b] of Array.isArray(segs[0]) ? segs : [segs]) for (let x = a; x <= b; x++) px.push([x + dx, +y + dy]);
  }
  return px;
}
function glyph(str, dx = 0, dy = 0) {
  const px = [];
  str.split('/').forEach((r, y) => [...r].forEach((c, x) => c === '#' && px.push([x + dx, y + dy])));
  return px;
}
function d(px) {
  const byY = new Map();
  for (const [x, y] of px) (byY.get(y) ?? byY.set(y, new Set()).get(y)).add(x);
  let s = '';
  for (const y of [...byY.keys()].sort((a, b) => a - b)) {
    const xs = [...byY.get(y)].sort((a, b) => a - b);
    for (let i = 0; i < xs.length;) {
      let j = i;
      while (xs[j + 1] === xs[j] + 1) j++;
      const n = j - i + 1;
      s += `M${xs[i]} ${y}h${n}v1h-${n}z`;
      i = j + 1;
    }
  }
  return s;
}
const P = (px, fill, cls) => px.length ? `<path${cls ? ` class='${cls}'` : ''}${fill ? ` fill='${fill}'` : ''} d='${d(px)}'/>` : '';

// ── The cat ────────────────────────────────────────────────────────
// Traced from the Mistral Large 4 cat, one letter per pixel:
// a/b/c fur tones, d collar, e bell, . background, k eyes and nose.
const MAP = [
  '.....a...a........',
  '.....aa.ab........',
  '....acccccb.......',
  '...aackckcab......',
  '...accckcccb......',
  '....ddddddd.......',
  '...acccecccb......',
  '...acccccaab...b..',
  '...bacccacccb...b.',
  '...acaacccaaab..b.',
  '..bccccccacacb..b.',
  '..aaaaacccccab.b..',
  '..bcaccccaaacb.b..',
  '..acccccccccabb...',
  'bbbbbbbbbbbbbb....',
];
const AT = (x, y) => MAP[y]?.[x] ?? '.';
// Every frame snaps to the pixel grid: motion is either a whole-pixel jump
// (steps timing) or a swap between hand-drawn frames. No rotation, no scaling.
const TAIL_A = [[15, 7], [16, 8], [16, 9], [16, 10], [15, 11], [15, 12], [14, 13]];
const TAIL_B = [[17, 7], [17, 8], [16, 9], [16, 10], [15, 11], [15, 12], [14, 13]];
const PAW_L = [[4, 13], [5, 13]], PAW_R = [[9, 13], [10, 13]];
const key = ([x, y]) => x + ',' + y;
const skip = new Set([...TAIL_A, ...PAW_L, ...PAW_R].map(key));
const ALL = MAP.flatMap((r, y) => [...r].map((c, x) => [x, y, c])).filter(([, , c]) => c !== '.');
const pick = (fn) => ALL.filter(([x, y, c]) => fn(x, y, c) && !skip.has(key([x, y]))).map(([x, y]) => [x, y]);
const HEAD = pick((x, y, c) => y <= 4);               // eyes and nose sit on fur, so blinking shows fur
const BODY = pick((x, y, c) => y >= 6 && y <= 13 && c !== 'e');
const GROUND = pick((x, y) => y === 14);

/** Fur pixels -> one path per tone, coloured by class so states can recolour them. */
const tone = (p) => ('abc'.includes(AT(...p)) ? AT(...p) : 'c');
const fur = (px, t0) => ['a', 'b', 'c'].map((t) => P(px.filter((p) => (t0 ? t0(p) : tone(p)) === t), null, 'f' + t)).join('');

const SHUT = '#8A2E10';
const EYES = {
  open: () => P([[6, 3], [8, 3]], INK, 'Y'),
  wide: () => P([[6, 2], [6, 3], [8, 2], [8, 3]], INK, 'Y'),
  none: () => '',
  closed: () => P([[6, 3], [8, 3]], SHUT),
  happy: () => P([[6, 3], [8, 3]], SHUT),
  shock: () => P([[6, 2], [6, 3], [8, 2], [8, 3]], '#fff') + P([[6, 3], [8, 3]], INK),
};
const PAWUP = (side, y = 4) => side === 'R'
  ? P([[12, y + 2], [12, y + 3]], FUR.a) + P(rows({ [y]: [12, 13], [y + 1]: [12, 13] }), FUR.p)
  : P([[2, y + 2], [2, y + 3]], FUR.a) + P(rows({ [y]: [1, 2], [y + 1]: [1, 2] }), FUR.p);
/** Two frames of a raised paw, swapped by the f1/f2 flipbook classes. */
const raised = (side) => `<g class='P${side}'><g class='f1'>${PAWUP(side, 4)}</g><g class='f2'>${PAWUP(side, 3)}</g></g>`;

/** opts: eyes, paws ('down' | 'waveR' | 'cheer' | 'none'), ground, blush, chonk, mid, face */
function cat({ eyes = 'open', paws = 'down', ground = true, blush = false, chonk = false, mid = '', face = '' } = {}) {
  const extra = chonk ? rows({ 9: [[2, 2], [14, 14]], 10: [[1, 1], [14, 14]], 11: [[1, 1], [14, 14]], 12: [[1, 1], [14, 14]], 13: [[1, 1], [15, 15]] }) : [];
  return `<g transform='translate(7 7)'>` + (ground ? P(chonk ? rows({ 14: [0, 15] }) : GROUND, FUR.b, 'G') : '') + `<g class='C'>`
    + `<g class='T'><g class='ta'>${fur(TAIL_A)}</g><g class='tb'>${fur(TAIL_B, () => 'b')}</g></g>`
    + `<g class='B'>${fur(BODY)}${fur(extra, ([x, y]) => 'abc'[(x + y) % 3])}<g class='bell'>${P([[7, 6]], BELL)}</g></g>`
    + mid
    + (paws === 'none' ? '' : `<g class='pl'>${fur(PAW_L)}</g><g class='pr'>${fur(PAW_R)}</g>`)
    + `<g class='H'>${fur(HEAD)}${P(rows({ 5: [4, 10] }), COLLAR)}${EYES[eyes]()}${P([[7, 4]], INK)}`
    + (blush ? P([[4, 4], [10, 4]], PINK) : '') + face + `</g>`
    + (paws === 'waveR' ? raised('R') : paws === 'cheer' ? raised('L') + raised('R') : '')
    + `</g></g>`;
}

// ── Shared CSS inside every sprite ─────────────────────────────────
const FUR_CSS = `.fa{fill:${FUR.a}}.fb{fill:${FUR.b}}.fc{fill:${FUR.c}}`;
/** two-frame flipbook: .f1 shows for the first half, .f2 for the second */
const FLIP = (sel, dur) => `${sel} .f1{animation:F1 ${dur} steps(1) infinite}${sel} .f2{opacity:0;animation:F2 ${dur} steps(1) infinite}`;
const BASE = FUR_CSS + '.tb{opacity:0}@keyframes F1{50%{opacity:0}}@keyframes F2{50%{opacity:1}}'
  + '@media(prefers-reduced-motion:reduce){*{animation:none!important}}';
const SWAY = (dur = '2.4s') => `.ta{animation:F1 ${dur} steps(1) infinite}.tb{animation:F2 ${dur} steps(1) infinite}`;
const BLINK = '.Y{animation:k 4s steps(1) infinite}@keyframes k{94%{opacity:0}97%{opacity:1}}';
const JINGLE = (dur = '.4s') => `.bell{animation:jg ${dur} steps(1) infinite}@keyframes jg{25%{transform:translateX(-1px)}50%{transform:none}75%{transform:translateX(1px)}}`;
/** whole-pixel moves only: a keyframe list of [percent, x, y] jumping with steps(1) */
const hop = (name, frames) => `@keyframes ${name}{${frames.map(([p, x, y]) => `${p}%{transform:translate(${x}px,${y}px)}`).join('')}}`;

function svg(body, css, { w = 32, h = 24 } = {}) {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'><style>${css}</style>${body}</svg>`;
}

// The tiny cat (subagents): cream, orange collar, gold bell. 10×13.
const TINY = [
  '.#...#....',
  '.##.##....',
  '.#####....',
  '.#k#k#....',
  '###k###...',
  '..cccc....',
  '..#g###...',
  '..#####.#.',
  '..######.#',
  '..######.#',
  '.#######.#',
  '.#######.#',
  '.########.',
];
// Pounce frames in the same style: crouch (squashed one row) and a stretched leap facing right.
const TINY_CROUCH = ['..........', ...TINY.slice(0, 7), ...TINY.slice(8)];
const TINY_LEAP = [
  '............#...#.',
  '............##.##.',
  '............#####.',
  '............#k#k#.',
  '...........###k###',
  '#.....######cccc..',
  '##..#########g###.',
  '.###############..',
  '..##############..',
  '...############...',
  '..###.......###...',
  '.##...........##..',
];
// The take-off (low, just after the crouch) is one row slimmer than the mid-air leap.
const TINY_TAKEOFF = TINY_LEAP.filter((_, y) => y !== 8);
const TINY_COLORS = { '#': CREAM, k: INK, c: '#F05A1A', g: BELL };
const drawMap = (map) => Object.entries(TINY_COLORS).map(([ch, fill]) =>
  P(map.flatMap((r, y) => [...r].map((c, x) => (c === ch ? [x, y] : null)).filter(Boolean)), fill)).join('');
const tiny = () => drawMap(TINY);

// ── The states ─────────────────────────────────────────────────────
const S = {};

S.idle = {
  label: 'Idle', note: 'blinks, tail flicks, breathes',
  svg: svg(cat(), BASE + SWAY() + BLINK + '.H{animation:h 3s steps(1) infinite}' + hop('h', [[0, 0, 0], [50, 0, 1], [70, 0, 0]])),
};

const BAR = P(rows({ 0: [10, 27], 3: [10, 27], 1: [[10, 10], [27, 27]], 2: [[10, 10], [27, 27]] }), '#5A514A')
  + [Y, OL, O, OD, RD].map((c, i) => P(rows({ 1: [12 + i * 3, 13 + i * 3], 2: [12 + i * 3, 13 + i * 3] }), c, `sg g${i}`)).join('');
S.thinking = {
  label: 'Thinking', note: 'a rainbow loading bar fills up',
  svg: svg(
    cat() + BAR,
    BASE + SWAY()
      + '.sg{opacity:0;animation:g0 2.5s steps(1) infinite}' + [0, 1, 2, 3, 4].map((i) => `.g${i}{animation-name:g${i}}@keyframes g${i}{${12 + i * 14}%,88%{opacity:1}}`).join(''),
  ),
};

const KB = P(rows({ 21: [6, 23], 22: [5, 24] }), '#2B2622') + P(glyph('#.#.#.#.#.#.#.#.#', 7, 21), '#5A514A');
const BITS = [['#./.#/#.', 9, 17, Y], ['.#/#./.#', 15, 17, OL], ['#', 20, 18, O], ['##', 12, 18, OD], ['#./#.', 22, 17, RD]];
S.working = {
  label: 'Working', note: 'types fast, the bell jingles, code flies out',
  svg: svg(
    cat({ ground: false, paws: 'none' }) + KB + `<g transform='translate(7 7)'><g class='pl'>${fur(PAW_L)}</g><g class='pr'>${fur(PAW_R)}</g></g>`
      + BITS.map(([g, x, y, c], i) => P(glyph(g, x, y), c, `u u${i}`)).join(''),
    BASE + SWAY() + JINGLE('.3s') + '.Y{transform:translateY(0)}'
      + '.pl{animation:p .3s steps(1) infinite}.pr{animation:p .3s steps(1) infinite .15s}' + hop('p', [[0, 0, 0], [50, 0, -1]])
      + '.u{opacity:0;animation:u 1.5s steps(7) infinite}' + [1, 2, 3, 4].map((i) => `.u${i}{animation-delay:${i * 0.3}s}`).join('')
      + '@keyframes u{0%{opacity:1;transform:none}100%{opacity:0;transform:translate(-2px,-14px)}}',
  ),
};

const RING = '.###./#...#/#...#/#...#/.###.';
S.reading = {
  label: 'Reading', note: 'magnifier sweeps the files',
  svg: svg(
    P(rows(Object.fromEntries([...Array(9)].map((_, i) => [12 + i, [0, 6]]))), CREAM)
      + P(glyph('####./...../#####/...../###../...../####.', 1, 13), '#8A7F73')
      + cat()
      + `<g class='M'>${P(glyph('.###./#####/#####/#####/.###.', 11, 7), SKY + "' fill-opacity='.4")}${P(glyph(RING, 11, 7), '#E8E1D6')}${P([[16, 12], [17, 13], [18, 14]], '#8A5A2B')}</g>`,
    BASE + SWAY()
      + '.M{animation:m 2.4s steps(1) infinite}' + hop('m', [[0, -3, 0], [16, -2, 0], [33, -1, 0], [50, 0, 1], [66, 1, 1], [83, 2, 0]])
      + '.Y{animation:e 2.4s steps(1) infinite}' + hop('e', [[0, -1, 0], [50, 0, 0], [83, 1, 0]]),
  ),
};

// Tiny cats pop up beside the big one, crouch, then pounce away left and right.
const KITS = [[-1, 0], [1, 0.6], [-1, 1.2], [1, 1.8]];
const pounceCat = (dir) => {
  const x = dir < 0 ? 4 : 25.5, y = 14.5;
  const flip = dir < 0 ? `translate(${x + 6} ${y}) scale(-.5 .5)` : `translate(${x - 2} ${y}) scale(.5)`;
  return `<g class='p1'><g transform='translate(${x} ${y}) scale(.5)'>${drawMap(TINY)}</g></g>`
    + `<g class='p2'><g transform='translate(${x} ${y}) scale(.5)'>${drawMap(TINY_CROUCH)}</g></g>`
    + `<g class='p4'><g transform='${flip.replace(/ \d+(\.\d+)?\)/, (m) => ` ${+m.slice(1, -1) + 0.5})`)}'>${drawMap(TINY_TAKEOFF)}</g></g>`
    + `<g class='p3'><g transform='${flip}'>${drawMap(TINY_LEAP)}</g></g>`;
};
const pounce = (name, dir) => `@keyframes ${name}{0%,28%{transform:none}`
  + [[34, 2, -3], [44, 4, -5], [54, 6, -6], [64, 8, -5], [74, 10, -3], [84, 12, 0]].map(([p, x, y]) => `${p}%{transform:translate(${x * dir}px,${y}px)}`).join('') + '}';
S.delegating = {
  label: 'Delegating', note: 'tiny subagent cats crouch and pounce away',
  svg: svg(
    cat({ paws: 'waveR' }) + KITS.map(([dir], i) => `<g class='kt k${i}'>${pounceCat(dir)}</g>`).join(''),
    BASE + SWAY() + JINGLE('.3s') + FLIP('.PR', '.4s') + BLINK
      + '.kt{animation:mvR 2.4s steps(1) infinite}.kt *{animation-duration:2.4s;animation-timing-function:steps(1);animation-iteration-count:infinite}'
      + '.p1,.p2,.p3,.p4{opacity:0}.p1{animation-name:P1}.p2{animation-name:P2}.p3{animation-name:P3}.p4{animation-name:P4}'
      + '@keyframes P1{0%,14%{opacity:1}15%{opacity:0}}@keyframes P2{15%,27%{opacity:1}28%{opacity:0}}@keyframes P4{28%,43%{opacity:1}44%{opacity:0}}@keyframes P3{44%,84%{opacity:1}85%{opacity:0}}'
      + KITS.map(([dir, d], i) => `.k${i}{animation-name:mv${dir < 0 ? 'L' : 'R'};animation-delay:${d}s}.k${i} .p1,.k${i} .p2,.k${i} .p3,.k${i} .p4{animation-delay:${d}s}`).join('')
      + pounce('mvL', -1) + pounce('mvR', 1),
  ),
};

S.subagent = {
  label: 'Subagent', note: 'a tiny cat, hopping',
  svg: svg(`<g class='K'>${tiny()}</g>`, BASE + '.K{animation:b .6s steps(1) infinite}' + hop('b', [[0, 0, 0], [50, 0, -1]]), { w: 10, h: 14 }),
};

const Q_GLYPH = '.##./#..#/..#./.#../..../.#..';
S.waiting = {
  label: 'Waiting', note: 'waves a paw, holds up a “?”',
  svg: svg(
    cat({ paws: 'waveR', eyes: 'wide' }) + `<g class='Q'>${P(glyph(Q_GLYPH, 23, 0), Y)}</g>`,
    BASE + SWAY() + JINGLE('.5s') + FLIP('.PR', '.5s')
      + '.Q{animation:q .8s steps(1) infinite}' + hop('q', [[0, 0, 0], [50, 0, 1]]),
  ),
};

S.error = {
  label: 'Error', note: 'fur flashes red, eyes go wide, sweats',
  svg: svg(
    cat({ eyes: 'shock' }) + P(glyph('#/#/#/./#', 26, 1), RD, 'x') + P(glyph('.#./###/.#.', 19, 6), SKY, 's'),
    BASE + SWAY('.3s')
      + '.C{animation:s .3s steps(1) infinite}' + hop('s', [[0, -1, 0], [50, 1, 0]])
      + `.fa,.fb,.fc{animation:r 1s steps(1) infinite}@keyframes r{50%{fill:${RD}}}`
      + '.x{animation:x .5s steps(1) infinite}@keyframes x{50%{opacity:0}}'
      + '.s{animation:d 1.2s steps(6) infinite}@keyframes d{0%{opacity:1;transform:none}100%{opacity:0;transform:translateY(6px)}}',
  ),
};

const CONF = [[3, 6, Y], [7, 1, OL], [14, 0, O], [21, 1, OD], [27, 4, RD], [29, 10, Y], [2, 12, O]];
S.done = {
  label: 'Done', note: 'cheering hop, rainbow confetti',
  svg: svg(
    cat({ eyes: 'happy', paws: 'cheer', blush: true })
      + CONF.map(([x, y, c], i) => P(glyph(i % 2 ? '##/##' : '.#./###/.#.', x, y), c, `z z${i % 3}`)).join(''),
    BASE + JINGLE('.2s') + FLIP('.PL', '.4s') + FLIP('.PR', '.4s')
      + '.C{animation:j .8s steps(1) infinite}' + hop('j', [[0, 0, 0], [20, 0, -2], [40, 0, -3], [60, 0, -2], [80, 0, 0]])
      + '.z{animation:z 1.2s steps(1) infinite}.z1{animation-delay:.4s}.z2{animation-delay:.8s}@keyframes z{50%{opacity:0}}',
  ),
};

const ZG = '####/..#./.#../####';
S.sleeping = {
  label: 'Sleeping', note: 'eyes shut, slow breaths, Zzz',
  svg: svg(
    cat({ eyes: 'closed' }) + [0, 1, 2].map((i) => P(glyph(ZG, 19, 4), '#FFE680', `zz z${i}`)).join(''),
    BASE + '.H{animation:h 3.6s steps(1) infinite}' + hop('h', [[0, 0, 1], [50, 0, 0]])
      + '.zz{opacity:0;animation:z 3.6s steps(6) infinite}.z1{animation-delay:1.2s}.z2{animation-delay:2.4s}'
      + '@keyframes z{0%{opacity:1;transform:none}100%{opacity:0;transform:translate(6px,-6px)}}',
  ),
};

const STACK = [0, 1, 2, 3, 4].map((i) => P(rows({ [11 + i * 2]: [0, i % 2 ? 4 : 6] }), i % 2 ? '#B8AE9F' : CREAM, `ln n${i}`)).join('');
S.compacting = {
  label: 'Compacting', note: 'kneads the conversation down',
  svg: svg(
    STACK + cat({ eyes: 'happy', blush: true }),
    BASE + SWAY()
      + '.ln{animation:c 2.5s steps(1) infinite}' + [0, 1, 2, 3].map((i) => `.n${i}{animation-name:c${i}}@keyframes c${i}{${20 + i * 15}%,95%{opacity:0}}`).join('')
      + '.pl{animation:p .5s steps(1) infinite}.pr{animation:p .5s steps(1) infinite .25s}' + hop('p', [[0, 0, 0], [50, 0, -1]]),
  ),
};

S.terminal = {
  label: 'Terminal', note: 'runs a command in a tiny shell',
  svg: svg(
    P(rows({ 9: [0, 9] }), '#3A332D') + P([[1, 9]], RD) + P([[2, 9]], O) + P([[3, 9]], Y)
      + P(rows(Object.fromEntries([...Array(12)].map((_, i) => [10 + i, [0, 9]]))), '#141210')
      + P(glyph('#./.#/#.', 1, 11), O) + [4, 5, 6, 7, 8].map((x, i) => P([[x, 12]], '#E8E1D6', `ch c${i}`)).join('')
      + `<g class='out'>${P(rows({ 15: [1, 7] }), '#8A7F73')}${P(rows({ 17: [1, 8] }), '#8A7F73')}${P(rows({ 19: [1, 5] }), GREEN)}</g>`
      + P(rows({ 21: [1, 2] }), O, 'cur') + cat(),
    BASE + SWAY() + '.Y{transform:translateX(-1px)}'
      + '.ch{opacity:0;animation:t 3s steps(1) infinite}' + [0, 1, 2, 3, 4].map((i) => `.c${i}{animation-name:t${i}}@keyframes t${i}{${5 + i * 8}%,100%{opacity:1}}`).join('')
      + '.out{opacity:0;animation:o 3s steps(1) infinite}@keyframes o{50%,100%{opacity:1}}'
      + '.cur{animation:k .6s steps(1) infinite}@keyframes k{50%{opacity:0}}'
      + '.pl{animation:p .3s steps(1) infinite}' + hop('p', [[0, 0, 0], [50, -1, -1]]),
  ),
};

S.editing = {
  label: 'Editing', note: 'knocks the old line off the table',
  svg: svg(
    P(rows({ 20: [0, 7], 21: [0, 7] }), '#5A3A22') + P(rows({ 18: [1, 6], 19: [1, 6] }), RD, 'old')
      + [1, 2, 3, 4, 5, 6].map((x, i) => P([[x, 18], [x, 19]], GREEN, `nw w${i}`)).join('') + cat(),
    BASE + SWAY()
      + '.pl{animation:s 3s steps(1) infinite}' + hop('s', [[0, 0, 0], [24, -2, -1], [30, -4, -2], [36, -6, -1], [42, 0, 0]])
      + '.old{animation:o 3s steps(1) infinite}@keyframes o{36%{transform:translate(-3px,2px)}42%{transform:translate(-6px,5px)}48%{opacity:0}}'
      + '.nw{opacity:0;animation:n 3s steps(1) infinite}' + [0, 1, 2, 3, 4, 5].map((i) => `.w${i}{animation-name:n${i}}@keyframes n${i}{${60 + i * 4}%,100%{opacity:1}}`).join(''),
  ),
};

const GLOBE = rows({ 11: [2, 5], 12: [1, 6], 13: [0, 7], 14: [0, 7], 15: [0, 7], 16: [0, 7], 17: [1, 6], 18: [2, 5] });
const GRID = rows({ 11: [[1, 1], [5, 5], [9, 9], [13, 13]], 12: [[1, 1], [5, 5], [9, 9], [13, 13]], 13: [[0, 15]], 14: [[1, 1], [5, 5], [9, 9], [13, 13]], 15: [[1, 1], [5, 5], [9, 9], [13, 13]], 16: [[0, 15]], 17: [[1, 1], [5, 5], [9, 9], [13, 13]], 18: [[1, 1], [5, 5], [9, 9], [13, 13]] });
S.browsing = {
  label: 'Browsing', note: 'globe spins, the mistral wind blows by',
  svg: svg(
    `<clipPath id='g'>${P(GLOBE)}</clipPath>` + P(GLOBE, '#2F6FB0')
      + `<g clip-path='url(#g)'><g class='lon'>${P(GRID, '#5FA83A')}</g></g>`
      + cat({ eyes: 'happy' })
      + [[1, 4, 6], [9, 2, 8], [22, 6, 5]].map(([x, y, n], i) => P(rows({ [y]: [x, x + n] }), CREAM, `wd w${i}`)).join(''),
    BASE + SWAY('.6s') + JINGLE('.3s')
      + '.lon{animation:g 2s steps(4) infinite}@keyframes g{from{transform:translateX(-4px)}to{transform:none}}'
      + '.wd{opacity:0;animation:w 1.6s steps(8) infinite}.w1{animation-delay:.5s}.w2{animation-delay:1s}@keyframes w{0%{opacity:1;transform:translateX(-4px)}100%{opacity:0;transform:translateX(12px)}}',
  ),
};

S.planning = {
  label: 'Planning', note: 'ticks off a checklist',
  svg: svg(
    P(rows(Object.fromEntries([...Array(13)].map((_, i) => [9 + i, [0, 7]]))), '#8A5A2B')
      + P(rows(Object.fromEntries([...Array(11)].map((_, i) => [10 + i, [1, 6]]))), CREAM)
      + P(rows({ 8: [2, 4], 9: [2, 4] }), '#9A9A9A')
      + [12, 15, 18].map((y) => P(glyph('###/#.#/###', 1, y), '#8A7F73') + P(rows({ [y + 1]: [5, 5] }), '#B8AE9F')).join('')
      + [12, 15, 18].map((y, i) => P(glyph('..#/#.#/.#.', 1, y), GREEN, `ck c${i}`)).join('')
      + cat(),
    BASE + SWAY() + '.Y{transform:translateX(-1px)}'
      + '.ck{opacity:0;animation:c 3.6s steps(1) infinite}.c1{animation-name:d}.c2{animation-name:e}'
      + '@keyframes c{25%,95%{opacity:1}}@keyframes d{50%,95%{opacity:1}}@keyframes e{75%,95%{opacity:1}}'
      + '.pl{animation:p .9s steps(1) infinite}' + hop('p', [[0, 0, 0], [50, -1, -1]]),
  ),
};

S.listening = {
  label: 'Listening', note: 'ears perked, watching you type',
  svg: svg(
    cat({ eyes: 'wide' })
      + P(rows({ 0: [20, 29], 1: [19, 30], 2: [19, 30], 3: [19, 30], 4: [20, 29], 5: [19, 20] }), CREAM)
      + P(rows({ 2: [21, 22] }), Y, 'dt') + P(rows({ 2: [24, 25] }), O, 'dt d1') + P(rows({ 2: [27, 28] }), RD, 'dt d2'),
    BASE + SWAY()
      + '.H{animation:h 1.6s steps(1) infinite}' + hop('h', [[0, 0, 0], [10, 0, -1], [25, 0, 0]])
      + '.dt{animation:d 1.2s steps(1) infinite}.d1{animation-delay:.4s}.d2{animation-delay:.8s}@keyframes d{0%{opacity:1}34%,100%{opacity:.2}}',
  ),
};

S.grooming = {
  label: 'Grooming', note: 'licks a paw between turns',
  svg: svg(
    cat({ eyes: 'closed', blush: true })
      + `<g transform='translate(7 7)'><g class='GR'><g class='f1'>${P([[3, 6], [3, 7]], FUR.a)}${P(rows({ 4: [4, 5], 5: [4, 5] }), FUR.p)}</g>`
      + `<g class='f2'>${P([[3, 5], [3, 6]], FUR.a)}${P(rows({ 3: [4, 5], 4: [4, 5] }), FUR.p)}${P([[6, 4]], PINK)}</g></g></g>`,
    BASE + SWAY() + FLIP('.GR', '.8s'),
  ),
};

S.chonk = {
  label: 'Le gros chaton', note: 'Mistral Large mode: extra chonk, croissant',
  svg: svg(
    P(rows({ 18: [2, 5], 19: [1, 6], 20: [0, 7], 21: [[0, 1], [6, 7]] }), '#E8A33D') + P([[2, 19], [4, 19], [3, 20], [5, 20]], '#B8691F')
      + cat({ eyes: 'happy', blush: true, chonk: true }).replace("translate(7 7)", "translate(8 7)"),
    BASE + SWAY('3s') + '.H{animation:h 4s steps(1) infinite}' + hop('h', [[0, 0, 0], [50, 0, 1]]),
  ),
};

// ── Sidebar and settings props ─────────────────────────────────────
// A tiny cat head that peeks up from under a hovered row (the pop-up itself is CSS on the row).
// The ear pixel at (1,0) is drawn by the twitch frames instead.
const PEEK = ['.....#.', ...TINY.slice(1, 5).map((r) => r.slice(0, 7).replace(/k/g, '#'))];
S.peek = {
  label: 'Peek', note: 'peeks up from under a chat you hover',
  svg: svg(
    drawMap(PEEK) + P([[2, 3], [4, 3]], INK, 'Y') + P([[3, 4]], PINK)
      + `<g class='E'><g class='f1'>${P([[1, 0]], CREAM)}</g><g class='f2'>${P([[0, 0]], CREAM)}</g></g>`,
    BASE + FLIP('.E', '2.6s') + BLINK.replace('4s', '2.2s'),
    { w: 7, h: 5 },
  ),
};

// The big cat's paw, reaching in from the left: orange arm, cream pads, pink beans, claws out.
const PAW = [
  '..........eeeee...',
  '.........ewwwwke..',
  'fffffffffwwwwwwwe.',
  'fffffffffwkkkwwke.',
  'fffffffffwkkkkwwe.',
  'fffffffffwkkkwwke.',
  'fffffffffwwwwwwwe.',
  '.........ewwwwke..',
  '..........eeeee...',
];
const at = (map, ch) => map.flatMap((r, y) => [...r].map((c, x) => (c === ch ? [x, y] : null)).filter(Boolean));
S.paw = {
  label: 'Paw', note: 'swipes at a chat you drag or settle',
  svg: svg(
    fur(at(PAW, 'f'), ([x, y]) => 'abc'[(x + y) % 3]) + P(at(PAW, 'e'), FUR.b) + P(at(PAW, 'w'), FUR.p) + P(at(PAW, 'k'), PINK)
      + P([[16, 1], [17, 3], [17, 5], [16, 7]], '#FFFFFF', 'cl'),
    BASE + '.cl{animation:F1 .5s steps(1) infinite}',
    { w: 18, h: 9 },
  ),
};

// Appearance settings: the cat paints the Mistral rainbow onto a canvas.
S.painting = {
  label: 'Painting', note: 'paints the Mistral rainbow (Appearance settings)',
  svg: svg(
    P(rows({ 21: [[1, 1], [6, 6]], 22: [[0, 1], [6, 7]] }), '#8A5A2B')
      + P(rows(Object.fromEntries([...Array(12)].map((_, i) => [9 + i, [0, 7]]))), '#8A5A2B')
      + P(rows(Object.fromEntries([...Array(10)].map((_, i) => [10 + i, [1, 6]]))), CREAM)
      + [Y, OL, O, OD, RD].map((c, i) => P(rows({ [10 + i * 2]: [1, 6], [11 + i * 2]: [1, 6] }), c, `bd b${i}`)).join('')
      + cat({ eyes: 'happy' })
      + `<g class='BR'>${P([[9, 14], [10, 15], [11, 16]], '#8A5A2B')}${P([[8, 13]], RD, 'tip')}</g>`,
    BASE + SWAY() + '.Y{transform:translateX(-1px)}'
      + '.bd{opacity:0;animation:c 4s steps(1) infinite}' + [0, 1, 2, 3, 4].map((i) => `.b${i}{animation-name:b${i}}@keyframes b${i}{${8 + i * 16}%,94%{opacity:1}}`).join('')
      + '.BR,.pl{animation:p .5s steps(1) infinite}' + hop('p', [[0, 0, 0], [50, 0, 2]])
      + `.tip{animation:t 4s steps(1) infinite}@keyframes t{0%{fill:${Y}}24%{fill:${OL}}40%{fill:${O}}56%{fill:${OD}}72%{fill:${RD}}}`,
  ),
};

// ── Toys: the mouse-chasing kitten, cursors and the yarn ball ──────
// Run cycle: the stretched leap and the gathered take-off, swapped.
const RUN = `<g class='R'><g class='f1'>${drawMap(TINY_LEAP)}</g><g class='f2'><g transform='translate(0 1)'>${drawMap(TINY_TAKEOFF)}</g></g></g>`;
S.chase = {
  label: 'Chase', note: 'runs after your mouse pointer (Settings)',
  svg: svg(RUN, BASE + FLIP('.R', '.3s'), { w: 18, h: 12 }),
};
// Caught it: up on its back legs, paw swiping up-right, claw marks flash where the pointer is.
const SWIPE_UP = [[8, 6], [9, 5], [10, 4], [11, 3], [9, 6], [10, 5], [11, 4]], SWIPE_DOWN = [[8, 7], [9, 7], [10, 7], [11, 6], [9, 6], [10, 6], [11, 5]];
S.scratch = {
  label: 'Scratch', note: 'catches the pointer and scratches at it',
  svg: svg(
    `<g transform='translate(0 1)'>${drawMap(TINY)}</g>` + P([[2, 4], [4, 4]], '#fff')
      + `<g class='SW'><g class='f1'>${P(SWIPE_UP, CREAM)}${P([[12, 3]], '#fff')}</g>`
      + `<g class='f2'>${P(SWIPE_DOWN, CREAM)}${P([[15, 0], [14, 1], [13, 2], [15, 2], [14, 3], [13, 4]], '#fff')}</g></g>`,
    BASE + FLIP('.SW', '.36s'),
    { w: 16, h: 14 },
  ),
};
// Idle too long: curls up next to the pointer.
const NAP = ['.#..#.........', '.####..######.', '#s##s#########', '#cccc#########', '##############', '.#############', '..###########.'];
S.nap = {
  label: 'Nap', note: 'naps by the pointer when you leave the mouse alone',
  svg: svg(
    `<g class='NB'><g transform='translate(0 4)'>${Object.entries({ '#': CREAM, s: SHUT, c: '#F05A1A' }).map(([ch, f]) => P(at(NAP, ch), f)).join('')}</g></g>`
      + P(glyph(ZG, 14, 0), '#FFE680', 'zz'),
    BASE + '.NB{animation:h 3s steps(1) infinite}' + hop('h', [[0, 0, 0], [50, 0, -1]])
      + '.zz{animation:z 3s steps(3) infinite}@keyframes z{0%{opacity:1;transform:translateY(2px)}100%{opacity:0;transform:translateY(-1px)}}',
    { w: 18, h: 11 },
  ),
};
// The kitten chases a rainbow ball of yarn along the bottom of the sidebar now and then.
S.yarn = {
  label: 'Yarn', note: 'chases a rainbow ball of yarn along the sidebar',
  svg: svg(
    RUN + `<g class='Y2'>${P(rows({ 7: [21, 22] }), Y)}${P(rows({ 8: [20, 23] }), OL)}${P(rows({ 9: [20, 23] }), OD)}${P(rows({ 10: [21, 22] }), RD)}${P([[22, 8], [21, 9]], O)}</g>`
      + P([[18, 11], [19, 11], [20, 11]], RD),
    BASE + FLIP('.R', '.3s') + '.Y2{animation:b .3s steps(1) infinite}' + hop('b', [[0, 0, 0], [50, 0, -1]]),
    { w: 24, h: 12 },
  ),
};

// Pixel cursors, drawn at 2x so each pixel is 2 screen pixels. Outlines are added around the fill.
const outlined = (fills) => {
  const filled = new Set(fills.map(([x, y]) => key([x, y])));
  const edge = [];
  for (const [x, y] of fills) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = key([x + dx, y + dy]);
    if (!filled.has(k) && !edge.some((e) => key(e) === k)) edge.push([x + dx, y + dy]);
  }
  return edge;
};
const cursorSvg = (body) => `<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 13 13' shape-rendering='crispEdges'>${body}</svg>`;
const ARROW = rows({ 1: [1, 1], 2: [1, 2], 3: [1, 3], 4: [1, 4], 5: [1, 5], 6: [1, 6], 7: [1, 7], 8: [[1, 3], [5, 5]], 9: [[1, 1], [4, 5]], 10: [5, 6], 11: [5, 6] });
const TOES = rows({ 1: [[3, 4], [7, 8]], 2: [[3, 4], [7, 8]], 4: [[0, 1], [10, 11]], 5: [[0, 1], [10, 11]] });
const PAD = rows({ 5: [4, 7], 6: [3, 8], 7: [3, 8], 8: [3, 8], 9: [4, 7] });
const CUR = {
  arrow: cursorSvg(P(outlined(ARROW), INK) + P(ARROW, O) + P(ARROW.filter(([x]) => x === 1), Y)),
  paw: cursorSvg(P(outlined([...TOES, ...PAD]), INK) + P([...TOES, ...PAD], PINK)),
  claws: cursorSvg(P(outlined([...TOES, ...PAD]), INK) + P([...TOES, ...PAD], PINK) + P([[3, 0], [8, 0], [0, 3], [11, 3]], '#fff')),
};

const ORDER = ['idle', 'thinking', 'working', 'reading', 'delegating', 'subagent', 'waiting', 'error', 'done', 'sleeping', 'compacting', 'terminal', 'editing', 'browsing', 'planning', 'listening', 'grooming', 'chonk', 'painting', 'peek', 'paw', 'chase', 'scratch', 'nap', 'yarn'];

// ── Outputs ────────────────────────────────────────────────────────
const uri = (s) => 'data:image/svg+xml,' + s.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, "'");
for (const id of ORDER) if (/\\/.test(S[id].svg)) throw new Error(`${id}: backslash in svg`);

for (const id of ORDER) write(`cats/cat-${id}.svg`, S[id].svg);
const spriteVars = ':root{' + ORDER.map((id) => `--mc-${id}:url("${uri(S[id].svg)}")`).join(';')
  + ';' + Object.entries(CUR).map(([id, c]) => `--mk-${id}:url("${uri(c)}")`).join(';') + '}';
for (const [id, c] of Object.entries(CUR)) write(`cats/cursor-${id}.svg`, c);
write('cats/mistral-cats.css', spriteVars + '\n');

const strip = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '');
const mod = strip('src/mod.css'), look = strip('src/look.css');
write('cats/mistral-cats-mod.css', spriteVars + mod + '\n');

const theme = {
  version: 1,
  name: 'Mistral T3',
  appearance: 'dark',
  canvas: '#15120F',
  accent: O,
  colors: {
    canvas: '#15120F', chrome: '#1B1714', toolbar: '#15120F', toolbarForeground: '#E9E2D4', toolbarBorder: '#2A241F',
    toolbarControl: '#241F1B', toolbarControlForeground: '#E9E2D4', toolbarControlHover: '#2E2823',
    surface: '#211C18', surfaceRaised: '#27211C', surfaceOverlay: '#27211C',
    text: '#FFF8EA', textMuted: '#A89F92', border: '#332B24', input: '#2A241F', focus: OD,
    accent: O, accentForeground: '#140A00', secondary: '#2E2823', secondaryForeground: '#F2EADB',
    muted: '#1F1A16', mutedForeground: '#A89F92', placeholder: '#857B6E', secondaryLabel: '#968C7F', iconMuted: '#968C7F',
    accentSurface: '#2D2116', accentSurfaceForeground: OL,
    messageSurface: '#241E19', messageForeground: '#FFF8EA', messageAction: O, messageActionForeground: '#140A00', messageActionHover: OL,
    codeBackground: '#1B1714', codeForeground: '#F2EADB',
    sidebar: '#1B1714', sidebarForeground: '#FFF8EA', sidebarMutedForeground: '#968C7F', sidebarControlSurface: '#262019',
    sidebarRowHover: '#251F1A', sidebarRowActive: '#2E2620', sidebarRowSelected: '#2E2620', sidebarBorder: '#2A241F',
    terminalBackground: '#15120F', terminalForeground: '#F2EADB', terminalCursor: O, terminalSelection: '#4A3016',
    error: '#FF4A2E', warning: OL, searchMatchBackground: '#5A3A10', searchMatchForeground: '#FFFFFF',
    searchMatchActiveBackground: O, searchMatchActiveForeground: '#140A00',
  },
  variants: {
    light: {
      canvas: '#FFFAEB', chrome: '#FFF4DA', toolbar: '#FFFAEB', toolbarForeground: '#2B231B', toolbarBorder: '#EFE3C8',
      toolbarControl: '#FFFFFF', toolbarControlForeground: '#2B231B', toolbarControlHover: '#FBEFD3',
      surface: '#FFFFFF', surfaceRaised: '#FFFFFF', surfaceOverlay: '#FFFFFF',
      text: '#1E160F', textMuted: '#74685A', border: '#EDE0C4', input: '#FFFFFF', focus: OD,
      accent: OD, accentForeground: '#FFFFFF', secondary: '#FBEFD3', secondaryForeground: '#2B231B',
      muted: '#FBEFD3', mutedForeground: '#74685A', placeholder: '#A0937F', secondaryLabel: '#6E6253', iconMuted: '#8C7F6C',
      accentSurface: '#FFEBC2', accentSurfaceForeground: '#B23A00',
      messageSurface: '#FFF1D2', messageForeground: '#1E160F', messageAction: OD, messageActionForeground: '#FFFFFF', messageActionHover: RD,
      codeBackground: '#FFF4DA', codeForeground: '#2B231B',
      sidebar: '#FFF4DA', sidebarForeground: '#2B231B', sidebarMutedForeground: '#74685A', sidebarControlSurface: '#FBEACB',
      sidebarRowHover: '#FBEACB', sidebarRowActive: '#F6E1B9', sidebarRowSelected: '#F6E1B9', sidebarBorder: '#EFE3C8',
      terminalBackground: '#FFF4DA', terminalForeground: '#2B231B', terminalCursor: OD, terminalSelection: '#FFD9A8',
      error: '#C81E00', warning: '#A66300', searchMatchBackground: '#FFE08A', searchMatchForeground: '#1E160F',
      searchMatchActiveBackground: OD, searchMatchActiveForeground: '#FFFFFF',
    },
  },
  css: spriteVars + look + mod,
};
write('t3-mistral.json', JSON.stringify(theme, null, 2) + '\n');

// ── Gallery ────────────────────────────────────────────────────────
const cards = ORDER.map((id) => ({ id, label: S[id].label, note: S[id].note, src: uri(S[id].svg) }));
const gallery = fs.readFileSync(path.join(ROOT, 'src/gallery.html'), 'utf8')
  .replace('/*CARDS*/[]', JSON.stringify(cards))
  .replaceAll('{{VERSION}}', pkg.version)
  .replaceAll('{{COUNT}}', String(ORDER.length));
write('gallery.html', gallery);

if (process.argv.includes('--sizes')) {
  for (const id of ORDER) console.log(`${id.padEnd(11)} ${String(S[id].svg.length).padStart(5)} B`);
}
console.log(`${ORDER.length} cats · theme css ${theme.css.length.toLocaleString('en')} / 100,000 chars`);
export { ORDER };
