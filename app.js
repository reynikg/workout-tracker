/* ============================================================
   Workout Tracker — vanilla JS, localStorage only.
   Data never leaves this browser.
   ============================================================ */

const STORAGE_KEY = 'workoutTracker.v1';
const APP_VERSION = '1.7.0'; // shown in Settings; reflects the app files actually loaded on this device

/* ---------- Tags (workout types / muscle groups) ---------- */
const DEFAULT_TAGS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Legs', 'Core', 'Abs', 'Cardio', 'Full Body'];
// spellings seen in older logs -> canonical tag
const TAG_ALIASES = {
  bicep:'Biceps', biceps:'Biceps', tricep:'Triceps', triceps:'Triceps', shoulder:'Shoulders', shoulders:'Shoulders',
  leg:'Legs', legs:'Legs', ab:'Abs', abs:'Abs', core:'Core', corr:'Core', chest:'Chest', back:'Back', cardio:'Cardio',
  forearm:'Forearms', forearms:'Forearms', everything:'Full Body', 'full body':'Full Body', fullbody:'Full Body',
};
function normTag(t) {
  const s = String(t || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return TAG_ALIASES[s.toLowerCase()] || s.charAt(0).toUpperCase() + s.slice(1);
}
function uniqTags(tags) {
  const seen = new Set();
  return tags.filter(t => { if (!t) return false; const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
function hasTag(tags, t) { const k = t.toLowerCase(); return tags.some(x => x.toLowerCase() === k); }
// Old combined types: "Back & bicep", "Chest & triceps & shoulders", "Back and biceps" -> separate tags
function parseTypeTags(type) {
  return uniqTags(String(type || '').split(/\s*(?:&|,|\+|\/|\band\b)\s*/i).map(normTag));
}

/* ---------- Common exercise library (merged with your own) ---------- */
const COMMON_EXERCISES = [
  // Chest
  ['Chest press', ['Chest','Triceps']], ['Chest press close', ['Chest','Triceps']], ['Chest squeeze', ['Chest']],
  ['Pec flies', ['Chest']], ['Inclined bench press', ['Chest','Shoulders']], ['Inclined dumbbell press', ['Chest','Shoulders']],
  ['Bench press', ['Chest','Triceps']], ['Push-ups', ['Chest','Triceps']], ['Cable crossover', ['Chest']], ['Dips', ['Triceps','Chest']],
  // Back
  ['Lat pull downs', ['Back','Biceps']], ['Rows', ['Back','Biceps']], ['Rows one hand', ['Back','Biceps']],
  ['Bent-over rows', ['Back','Biceps']], ['Cable pull overs', ['Back']], ['Pull overs', ['Back','Chest']],
  ['Pull ups', ['Back','Biceps']], ['Assisted pull ups', ['Back','Biceps']], ['Back raises', ['Back','Core']],
  ['Deadlift', ['Back','Legs']], ['Dead hang', ['Back','Forearms']], ['Face pull', ['Shoulders','Back']],
  ['Shrugs', ['Back','Shoulders']], ['T-bar row', ['Back','Biceps']],
  // Shoulders
  ['Shoulder press', ['Shoulders','Triceps']], ['Lateral raises', ['Shoulders']], ['Front raises', ['Shoulders']],
  ['Rear delt flies', ['Shoulders','Back']], ['Arnold press', ['Shoulders']], ['Upright rows', ['Shoulders','Back']],
  // Biceps / forearms
  ['Bicep (D) curls', ['Biceps']], ['EZ bar curls', ['Biceps']], ['EZ bar reverse curls', ['Biceps','Forearms']],
  ['Hammer curls', ['Biceps','Forearms']], ['Preacher curls', ['Biceps']], ['Cable curls', ['Biceps']],
  ['Straight bar curls', ['Biceps']], ['Concentration curls', ['Biceps']],
  ['Wrist curls palm up', ['Forearms']], ['Wrist curls palm down', ['Forearms']],
  // Triceps
  ['Tricep extensions', ['Triceps']], ['Tricep extensions one hand', ['Triceps']], ['Tricep extensions bar', ['Triceps']],
  ['Tricep extensions one hand reverse', ['Triceps']], ['Skull crushers', ['Triceps']], ['Tricep pushdown', ['Triceps']],
  ['Overhead tricep extension', ['Triceps']],
  // Legs
  ['Lunges', ['Legs']], ['Angled leg press', ['Legs']], ['Leg press', ['Legs']], ['Squats', ['Legs']],
  ['Hip thrusts', ['Legs']], ['Quad extensions', ['Legs']], ['Leg curls', ['Legs']], ['Hamstring curls', ['Legs']],
  ['Calf raises', ['Legs']], ['Inner thighs open', ['Legs']], ['Inner thighs close', ['Legs']],
  ['Romanian deadlift', ['Legs']], ['Bulgarian split squat', ['Legs']],
  // Core / abs
  ['Plank', ['Core','Abs']], ['Side plank', ['Core','Abs']], ['Sit-ups', ['Abs','Core']], ['Leg raises', ['Abs','Core']],
  ['Reverse crunches', ['Abs','Core']], ['Crunches', ['Abs','Core']], ['Russian twists', ['Core','Abs']],
  ['Mountain climbers', ['Cardio','Core']],
  // Cardio
  ['Jumping rope', ['Cardio']], ['Running', ['Cardio']], ['Cycling', ['Cardio']], ['Rowing machine', ['Cardio']],
];
const COMMON_TAGS = new Map(COMMON_EXERCISES.map(([n, t]) => [n.toLowerCase(), t]));
// held for time rather than counted, unless your history says otherwise
const TIMED_EXERCISES = new Set(['plank', 'side plank', 'dead hang']);

/* ---------- State ---------- */
let data = emptyData();
function emptyData() { return { version: 2, workouts: [], weights: [], exerciseTags: {} }; }
let calRef = new Date(); // calendar reference month

/* ============================================================
   THEMING — appearance mode + colour palette (hue only)
   ============================================================ */
const THEME_KEY = 'wt.theme';
const MODE_KEY = 'wt.mode';
const MODES = [ { k:'light', label:'Light' }, { k:'dark', label:'Dark' }, { k:'system', label:'System' } ];
const THEMES = [
  { k:'ocean',    name:'Ocean Blue',          light:'#0a84ff', dark:'#3aa0ff', bgL:'#eef4fb', bgD:'#000811' },
  { k:'forest',   name:'Forest Green',        light:'#2e9e5b', dark:'#3ecb7d', bgL:'#eff5f0', bgD:'#050c08' },
  { k:'midnight', name:'Midnight Blue',       light:'#4b5bd6', dark:'#818cff', bgL:'#eeeff8', bgD:'#04050f' },
  { k:'eggshell', name:'Eggshell White',      light:'#94794a', dark:'#d9bb85', bgL:'#f7f3ea', bgD:'#0d0b07' },
  { k:'sakura',   name:'Cherry Blossom Pink', light:'#d94f87', dark:'#ff8ab5', bgL:'#fbf0f5', bgD:'#12060a' },
  { k:'cream',    name:'Cream Yellow',        light:'#b8891a', dark:'#f0be3d', bgL:'#fdf8e9', bgD:'#0e0c05' },
  { k:'amber',    name:'Amber Red',           light:'#cf4128', dark:'#ff7355', bgL:'#fdf1ee', bgD:'#110604' },
  { k:'frost',    name:'Frost White',         light:'#3f8bac', dark:'#6ec5e8', bgL:'#f0f6f9', bgD:'#050b0e' },
  { k:'web',      name:'Spiderweb Grey',      light:'#5f6773', dark:'#a3adba', bgL:'#f2f2f4', bgD:'#08090a' },
];

function getMode() { return localStorage.getItem(MODE_KEY) || 'system'; }
function getTheme() { return localStorage.getItem(THEME_KEY) || 'ocean'; }
function systemPrefersDark() {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function resolvedMode() {
  const m = getMode();
  return m === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : m;
}
function applyTheme() {
  const root = document.documentElement;
  const resolved = resolvedMode();
  root.setAttribute('data-theme', getTheme());
  root.setAttribute('data-resolved', resolved);
  // keep the browser/status bar chrome in step with the palette
  const t = THEMES.find(x => x.k === getTheme()) || THEMES[0];
  const bar = resolved === 'dark' ? t.bgD : t.bgL;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
  const meta = document.createElement('meta');
  meta.name = 'theme-color'; meta.content = bar;
  document.head.appendChild(meta);
}
function setMode(m) { localStorage.setItem(MODE_KEY, m); applyTheme(); }
function setTheme(t) { localStorage.setItem(THEME_KEY, t); applyTheme(); }
// follow the OS when in System mode
if (window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => { if (getMode() === 'system') applyTheme(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
}

/* ---------- PWA install ---------- */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstallPrompt = e; });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; toast('Installed'); });
function isStandalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
function isiOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

/* ---------- Storage ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) { console.warn('load failed', e); data = emptyData(); }
  const old = data.version !== 2;
  migrate();
  if (old) save();
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

/* v1 stored one combined `type` string per workout; v2 stores a `tags` array
   plus `exerciseTags` (lower-cased exercise name -> tags). */
function migrate() {
  if (!Array.isArray(data.workouts)) data.workouts = [];
  if (!Array.isArray(data.weights)) data.weights = [];
  if (!data.exerciseTags || typeof data.exerciseTags !== 'object') data.exerciseTags = {};
  data.workouts.forEach(migrateWorkout);
  data.version = 2;
}
function migrateWorkout(w) {
  if (!Array.isArray(w.tags)) w.tags = parseTypeTags(w.type);
  delete w.type;
  if (!Array.isArray(w.exercises)) w.exercises = [];
  return w;
}

/* ---------- Tag lookups ---------- */
function workoutTitle(w) { return w.tags && w.tags.length ? w.tags.join(' · ') : 'Workout'; }
function exerciseTags(name) {
  const k = name.trim().toLowerCase();
  return data.exerciseTags[k] || COMMON_TAGS.get(k) || [];
}
function setExerciseTags(name, tags) {
  data.exerciseTags[name.trim().toLowerCase()] = uniqTags(tags.map(normTag));
  save();
}
function allTags() {
  const tags = [...DEFAULT_TAGS];
  data.workouts.forEach(w => tags.push(...w.tags));
  Object.values(data.exerciseTags).forEach(ts => tags.push(...ts));
  return uniqTags(tags);
}
function tagPillsHTML(tags) { return tags.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join(''); }

/* ---------- Utils ---------- */
const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function dateObj(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function fmtDateLong(s){ const d=dateObj(s); const wd=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]; return `${wd}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

function isoWeekKey(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((t - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-W${pad(week)}`;
}
function weekStart(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }

/* ---------- Motion ---------- */
function prefersReducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
/* A spring in Apple's terms: damping ratio (1 = settles without overshoot) and response
   (seconds; lower is snappier). It starts from the current value and velocity, so any
   animation can be grabbed and re-targeted mid-flight without a jump. */
function spring({ from, to, velocity = 0, damping = 1, response = 0.35, onUpdate, onDone }) {
  const k = Math.pow(2 * Math.PI / response, 2), c = 4 * Math.PI * damping / response;
  let x = from, v = velocity, last = performance.now(), raf = 0, stopped = false;
  function step(now) {
    if (stopped) return;
    const dt = Math.min(0.064, (now - last) / 1000); last = now;
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n; // fixed sub-steps stay stable on slow frames
    for (let i = 0; i < n; i++) { v += (-k * (x - to) - c * v) * h; x += v * h; }
    if (Math.abs(v) < 4 && Math.abs(x - to) < 0.5) { stopped = true; onUpdate(to); if (onDone) onDone(); return; }
    onUpdate(x);
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  return { stop() { stopped = true; cancelAnimationFrame(raf); } };
}
// Where a flick would come to rest (Apple's scroll-deceleration projection), px/s -> px
function project(velocity, rate = 0.998) { return (velocity / 1000) * rate / (1 - rate); }
// Progressive resistance past an edge instead of a hard stop
function rubberband(overshoot, dimension, c = 0.55) { return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot)); }
// Tick numbers up and grow bars from zero after a render
function animateIn(root) {
  const bars = root.querySelectorAll('[data-w]');
  if (prefersReducedMotion()) { bars.forEach(b => b.style.width = b.dataset.w); return; }
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now();
    if (!to) return;
    const tick = now => {
      const p = Math.min(1, (now - t0) / 550), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtNum(to * e) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0' + suffix;
    requestAnimationFrame(tick);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => bars.forEach(b => b.style.width = b.dataset.w)));
}
// Charts scroll horizontally; open them on the most recent data
function scrollToLatest(wrap) { if (wrap) wrap.scrollLeft = wrap.scrollWidth; }

/* ---------- Parsing inputs ---------- */
/* Reps box: "12", "30s", "30 sec", "45 seconds", "1 min", or a whole "3 x 12" / "3x30s".
   Returns { reps, sets?, unit? } — sets/unit only when the text spells them out. */
function parseRepsField(str) {
  const s = String(str || '').trim().toLowerCase();
  if (!s) return null;
  const m = s.match(/^(?:(\d+)\s*[x×*]\s*)?(\d+(?:[.,]\d+)?)\s*(s|secs?|seconds?|m|mins?|minutes?|reps?)?$/);
  if (!m) return null;
  let reps = parseFloat(m[2].replace(',', '.'));
  const out = {};
  if (m[3]) {
    if (m[3][0] === 'm') { out.unit = 'sec'; reps *= 60; }
    else out.unit = m[3][0] === 's' ? 'sec' : 'reps';
  }
  out.reps = Math.round(reps);
  if (m[1]) out.sets = +m[1];
  return out;
}
function parseWeight(str) {
  if (str == null) return null;
  const s = String(str).trim();
  if (s === '') return null;
  const low = s.toLowerCase();
  const res = { raw: s, unit: null, value: null, bonusKg: 0 };
  if (/no weight|bodyweight|body weight|^bw$/.test(low)) { res.unit = 'bodyweight'; res.value = 0; return res; }
  if (/plate/.test(low)) {
    res.unit = 'plates';
    const m = low.match(/(-?\d+(?:\.\d+)?)\s*plate/); if (m) res.value = parseFloat(m[1]);
    const b = low.match(/\+\s*(-?\d+(?:\.\d+)?)\s*kg/); if (b) res.bonusKg = parseFloat(b[1]);
    return res;
  }
  if (/kg/.test(low)) {
    res.unit = 'kg';
    const m = low.match(/(-?\d+(?:\.\d+)?)\s*kg/); if (m) res.value = parseFloat(m[1]);
    if (/assist/.test(low) && res.value > 0) res.value = -res.value;
    return res;
  }
  const m = low.match(/(-?\d+(?:\.\d+)?)/);
  if (m) { res.unit = 'kg'; res.value = parseFloat(m[1]); }
  return res;
}
function fmtSet(s) {
  let r = '';
  const u = s.unit === 'sec' ? 's' : '';
  if (s.sets != null && s.reps != null) r = `${s.sets} × ${s.reps}${u}`;
  else if (s.reps != null) r = `${s.reps}${u}`;
  const w = s.weight && s.weight.raw ? ` (${s.weight.raw})` : '';
  return r + w;
}
function exerciseSummary(w) {
  const names = w.exercises.map(e => e.name);
  if (!names.length) return '—';
  if (names.length <= 3) return names.join(', ');
  return names.slice(0, 2).join(', ') + ` +${names.length - 2}`;
}

/* ---------- Exercise library (mine + common) ---------- */
function exerciseLibrary() {
  const map = new Map(); // key -> {name, tags, isMine}
  COMMON_EXERCISES.forEach(([name]) => map.set(name.toLowerCase(), { name, isMine: false }));
  // overlay mine (counts + preferred casing)
  const counts = new Map();
  data.workouts.forEach(w => w.exercises.forEach(e => {
    const k = e.name.trim().toLowerCase();
    counts.set(k, (counts.get(k) || 0) + 1);
    if (!map.has(k)) map.set(k, { name: e.name, isMine: true });
    else map.get(k).isMine = true;
  }));
  const arr = [...map.values()];
  arr.forEach(x => { x._count = counts.get(x.name.toLowerCase()) || 0; x.tags = exerciseTags(x.name); });
  arr.sort((a, b) => (b._count - a._count) || a.name.localeCompare(b.name));
  return arr;
}
// Most recent unit used for this exercise ('sec' or 'reps'), so a plank starts in seconds.
function defaultUnitFor(name) {
  const k = name.trim().toLowerCase();
  let last = null, lastDate = '';
  data.workouts.forEach(w => {
    if (w.date < lastDate) return;
    w.exercises.forEach(e => { if (e.name.trim().toLowerCase() === k && e.sets.length) { last = e.sets[e.sets.length - 1]; lastDate = w.date; } });
  });
  if (last && last.reps != null) return last.unit === 'sec' ? 'sec' : 'reps';
  return TIMED_EXERCISES.has(k) ? 'sec' : 'reps';
}

/* ============================================================
   Navigation
   ============================================================ */
const PAGE_TITLES = { stats: 'Stats', calendar: 'Calendar', weight: 'Weight', add: 'Add Workout' };
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  document.getElementById('page-title').textContent = PAGE_TITLES[tab];
  document.getElementById('bar-title').textContent = PAGE_TITLES[tab];
  document.getElementById('main').scrollTop = 0;
  window.scrollTo(0, 0);
  updateTopbar();
  if (tab === 'stats') renderStats();
  if (tab === 'calendar') renderCalendar();
  if (tab === 'weight') renderWeight();
  if (tab === 'add') renderAddPage();
}

// Bar gets its material once content scrolls under it; small title once the large one is gone
function updateTopbar() {
  const bar = document.querySelector('.topbar'), title = document.getElementById('page-title');
  const y = window.scrollY;
  bar.classList.toggle('scrolled', y > 0);
  bar.classList.toggle('titled', y > title.offsetTop + title.offsetHeight - bar.offsetHeight);
}

/* ============================================================
   STATS
   ============================================================ */
let freqMode = 'month';
let statWindow = '3m';

const WINDOWS = [
  { k: '1m', label: 'Month', days: 31 },
  { k: '3m', label: '3 Months', days: 92 },
  { k: 'year', label: 'Year', days: 366 },
  { k: 'all', label: 'All', days: null },
];
function windowStart(mode) {
  if (mode === 'all') return null;
  const w = WINDOWS.find(x => x.k === mode) || WINDOWS[1];
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - w.days); return d;
}
function workoutsIn(mode) {
  const start = windowStart(mode);
  if (!start) return data.workouts.slice();
  return data.workouts.filter(w => dateObj(w.date) >= start);
}
// Reps for one set entry: "3 x 12" -> 36; "12" -> 12; lone weight (no reps) -> 0
function repsOfSet(s) {
  if (s.reps == null || s.unit === 'sec') return 0;
  const n = (s.sets != null) ? s.sets : 1;
  return n * s.reps;
}
function setsOfSet(s) { return (s.sets != null) ? s.sets : (s.reps != null ? 1 : 0); }

function exerciseAgg(ws) {
  const map = new Map();
  ws.forEach(w => w.exercises.forEach(e => {
    const key = e.name.trim().toLowerCase();
    if (!map.has(key)) map.set(key, { name: e.name, key, reps: 0, sets: 0, sessions: new Set() });
    const a = map.get(key);
    a.sessions.add(w.date);
    e.sets.forEach(s => { a.reps += repsOfSet(s); a.sets += setsOfSet(s); });
  }));
  return [...map.values()].map(a => ({ name: a.name, reps: a.reps, sets: a.sets, times: a.sessions.size }));
}
function statRecords(ws) {
  let bigSession = null;
  ws.forEach(w => {
    let reps = 0; w.exercises.forEach(e => e.sets.forEach(s => reps += repsOfSet(s)));
    if (reps > 0 && (!bigSession || reps > bigSession.reps)) bigSession = { date: w.date, title: workoutTitle(w), reps };
  });
  let bigSet = null;
  ws.forEach(w => w.exercises.forEach(e => e.sets.forEach(s => {
    const r = repsOfSet(s);
    if (r > 0 && (!bigSet || r > bigSet.reps)) bigSet = { reps: r, name: e.name, date: w.date };
  })));
  let longHold = null;
  ws.forEach(w => w.exercises.forEach(e => e.sets.forEach(s => {
    if (s.unit === 'sec' && s.reps > 0 && (!longHold || s.reps > longHold.secs)) longHold = { secs: s.reps, name: e.name, date: w.date };
  })));
  // longest streak of consecutive calendar days (all-time)
  const days = [...new Set(data.workouts.map(w => w.date))].sort();
  let streak = days.length ? 1 : 0, best = streak;
  for (let i = 1; i < days.length; i++) {
    const gap = dateObj(days[i]) - dateObj(days[i-1]);
    if (gap === 86400000) { streak++; if (streak > best) best = streak; }
    else streak = 1;
  }
  return { bigSession, bigSet, longHold, streak: best };
}
function fmtNum(n){ return Math.round(n).toLocaleString('en-US'); }

function renderStats() {
  const el = document.getElementById('page-stats');
  const all = data.workouts;
  if (!all.length) {
    el.innerHTML = emptyState('No workouts yet', 'Add your first workout or import a log from Settings.', true);
    bindEmpty(el);
    return;
  }
  let totReps = 0, totSets = 0;
  all.forEach(w => w.exercises.forEach(e => e.sets.forEach(s => { totReps += repsOfSet(s); totSets += setsOfSet(s); })));
  const heroStreak = statRecords(all).streak;

  const ws = workoutsIn(statWindow);
  const agg = exerciseAgg(ws);
  const byReps = [...agg].sort((a,b) => b.reps - a.reps).filter(r => r.reps > 0).slice(0, 8);
  const byTimes = [...agg].sort((a,b) => b.times - a.times || b.reps - a.reps).slice(0, 8);
  const winLabel = (WINDOWS.find(x=>x.k===statWindow)||WINDOWS[1]).label.toLowerCase();
  const winText = statWindow==='all' ? 'all time' : `last ${winLabel}`;

  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-tile accent"><div class="num" data-count="${all.length}">${all.length}</div><div class="lbl">Workouts</div><div class="sub">all time</div></div>
      <div class="stat-tile"><div class="num" data-count="${totReps}">${fmtNum(totReps)}</div><div class="lbl">Reps crushed</div><div class="sub">all time</div></div>
      <div class="stat-tile"><div class="num" data-count="${totSets}">${fmtNum(totSets)}</div><div class="lbl">Sets logged</div><div class="sub">all time</div></div>
      <div class="stat-tile"><div class="num" data-count="${heroStreak}">${heroStreak}</div><div class="lbl">Best streak</div><div class="sub">days in a row</div></div>
    </div>

    <div class="segmented" id="win-seg">
      ${WINDOWS.map(w=>`<button data-k="${w.k}" class="${statWindow===w.k?'active':''}">${w.label}</button>`).join('')}
    </div>

    <div class="card">
      <h2>Most reps<span class="h-sub">${escapeHtml(winText)}</span></h2>
      ${leaderboardHTML(byReps, 'reps', r => `${fmtNum(r.reps)}`)}
    </div>

    <div class="card">
      <h2>Done most often<span class="h-sub">${escapeHtml(winText)}</span></h2>
      ${leaderboardHTML(byTimes, 'times', r => `${r.times}×`)}
    </div>

    <div class="card">
      <h2>Records<span class="h-sub">${escapeHtml(winText)}</span></h2>
      ${recordsHTML(statRecords(ws))}
    </div>

    <div class="card">
      <h2>Muscle groups<span class="h-sub">${escapeHtml(winText)}</span></h2>
      <div id="muscle-breakdown">${muscleBreakdownHTML(ws)}</div>
    </div>

    <div class="card">
      <h2>Consistency</h2>
      <div class="segmented" id="freq-seg">
        <button data-m="week" class="${freqMode==='week'?'active':''}">Week</button>
        <button data-m="month" class="${freqMode==='month'?'active':''}">Month</button>
        <button data-m="year" class="${freqMode==='year'?'active':''}">Year</button>
      </div>
      <div class="chart-wrap" id="freq-chart"></div>
    </div>
  `;
  const freq = document.getElementById('freq-chart');
  freq.innerHTML = freqChartSVG();
  scrollToLatest(freq);
  animateIn(el);
  document.getElementById('win-seg').onclick = e => { const b = e.target.closest('button'); if (!b) return; statWindow = b.dataset.k; renderStats(); };
  document.getElementById('freq-seg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    freqMode = b.dataset.m;
    freq.innerHTML = freqChartSVG();
    scrollToLatest(freq);
    document.querySelectorAll('#freq-seg button').forEach(x => x.classList.toggle('active', x === b));
  };
}

function leaderboardHTML(rows, kind, valFn) {
  if (!rows.length) return '<div class="muted">No data in this period.</div>';
  const max = Math.max(1, rows[0][kind]);
  const medals = ['#ffd60a', '#c7c7cc', '#cd7f32'];
  return rows.map((r, i) => `
    <div class="lb-row">
      <div class="lb-rank" style="${i<3?`background:${medals[i]};color:#1d1d1f`:''}">${i+1}</div>
      <div class="lb-main">
        <div class="lb-name">${escapeHtml(r.name)}</div>
        <div class="lb-bar"><span style="width:0" data-w="${Math.max(4,(r[kind]/max)*100)}%"></span></div>
      </div>
      <div class="lb-val" data-count="${r[kind]}" data-suffix="${kind === 'times' ? '×' : ''}">${valFn(r)}</div>
    </div>`).join('');
}
function recordsHTML(rec) {
  const rows = [];
  if (rec.bigSession) rows.push(['Biggest session', `${fmtNum(rec.bigSession.reps)} reps`, `${escapeHtml(rec.bigSession.title)} · ${fmtDateLong(rec.bigSession.date)}`]);
  if (rec.bigSet) rows.push(['Most reps in a set', `${rec.bigSet.reps} reps`, `${escapeHtml(rec.bigSet.name)} · ${fmtDateLong(rec.bigSet.date)}`]);
  if (rec.longHold) rows.push(['Longest hold', `${rec.longHold.secs}s`, `${escapeHtml(rec.longHold.name)} · ${fmtDateLong(rec.longHold.date)}`]);
  if (!rows.length) return '<div class="muted">No data in this period.</div>';
  return rows.map(([t,v,s]) => `<div class="rec-row"><div class="rec-ico">★</div><div class="rec-main"><div class="rec-t">${t}</div><div class="rec-s">${s}</div></div><div class="rec-v">${v}</div></div>`).join('');
}

function freqBuckets() {
  const ws = data.workouts;
  const map = new Map();
  if (freqMode === 'year') {
    ws.forEach(w => { const k = w.date.slice(0,4); map.set(k, (map.get(k)||0)+1); });
    return [...map.entries()].sort().map(([k,v]) => ({ label: k, value: v }));
  }
  if (freqMode === 'month') {
    ws.forEach(w => { const k = w.date.slice(0,7); map.set(k, (map.get(k)||0)+1); });
    // fill gaps between first and last month
    const keys = [...map.keys()].sort();
    if (!keys.length) return [];
    const out = []; let [y,m] = keys[0].split('-').map(Number);
    const [ey,em] = keys[keys.length-1].split('-').map(Number);
    while (y < ey || (y===ey && m<=em)) {
      const k = `${y}-${pad(m)}`;
      out.push({ label: MONTHS[m-1], value: map.get(k)||0 });
      m++; if (m>12){m=1;y++;}
    }
    return out;
  }
  // week
  ws.forEach(w => { const k = isoWeekKey(dateObj(w.date)); map.set(k, (map.get(k)||0)+1); });
  const keys = [...map.keys()].sort();
  return keys.map(k => ({ label: k.split('-W')[1], value: map.get(k) }));
}
function freqChartSVG(){ return barChartSVG(freqBuckets(), { unit: '' }); }

function muscleBreakdownHTML(ws) {
  ws = ws || data.workouts;
  const counts = new Map();
  ws.forEach(w => w.tags.forEach(t => counts.set(t, (counts.get(t)||0)+1)));
  const arr = [...counts.entries()].sort((a,b)=>b[1]-a[1]);
  if (!arr.length) return '<div class="muted">No type data.</div>';
  const max = arr[0][1];
  return arr.map(([name, c]) => `
    <div class="bd-row">
      <div class="bd-name">${escapeHtml(name)}</div>
      <div class="bd-bar" style="width:0" data-w="${Math.max(6, (c/max)*120)}px"></div>
      <div class="bd-count">${c}</div>
    </div>`).join('');
}
/* ============================================================
   CHARTS (self-contained SVG)
   ============================================================ */
function barChartSVG(buckets, opts={}) {
  if (!buckets.length) return '<div class="muted center-text" style="padding:24px">No data.</div>';
  const H = 200, padTop = 24, padBottom = 28, padL = 6;
  const barW = 26, gap = 18, step = barW + gap;
  const W = Math.max(320, padL*2 + buckets.length*step);
  const max = Math.max(1, ...buckets.map(b => b.value));
  const chartH = H - padTop - padBottom;
  let bars = '';
  buckets.forEach((b, i) => {
    const x = padL + i*step + gap/2;
    const h = (b.value/max) * chartH;
    const y = padTop + (chartH - h);
    const last = i === buckets.length-1;
    bars += `<rect class="bar ${last?'':'dim'}" x="${x}" y="${y}" width="${barW}" height="${Math.max(h,1)}" rx="5" style="animation-delay:${Math.min(i, 20) * 25}ms"></rect>`;
    if (b.value>0) bars += `<text x="${x+barW/2}" y="${y-6}" text-anchor="middle" style="font-weight:600;fill:var(--label)">${b.value}</text>`;
    bars += `<text x="${x+barW/2}" y="${H-9}" text-anchor="middle">${escapeHtml(String(b.label))}</text>`;
  });
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}</svg>`;
}

function lineChartSVG(points, opts={}) {
  const H = 220, padTop = 18, padBottom = 30, padL = 38, padR = 14;
  const n = points.length;
  // opts.width fits the whole series to the card (keeps the y-axis in view); otherwise scroll
  const step = opts.width ? (opts.width - padL - padR) / Math.max(1, n-1) : Math.max(34, Math.min(70, 520 / n));
  const W = opts.width || Math.max(320, padL + padR + (n-1)*step);
  const vals = points.map(p => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min = min - 1; max = max + 1; }
  const range = max - min;
  min = Math.max(0, min - range*0.12); max = max + range*0.12;
  const chartH = H - padTop - padBottom;
  const X = i => padL + i*step;
  const Y = v => padTop + chartH - ((v-min)/(max-min))*chartH;
  // gridlines (3)
  let grid = '';
  for (let g=0; g<=2; g++) {
    const v = min + (max-min)*g/2;
    const y = Y(v);
    grid += `<line class="gridline" x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}"></line>`;
    grid += `<text x="${padL-6}" y="${y+3}" text-anchor="end">${Number.isInteger(v)?v:v.toFixed(0)}</text>`;
  }
  let dpath = '', dots = '';
  points.forEach((p,i) => { dpath += (i===0?'M':'L') + X(i) + ' ' + Y(p.value) + ' '; });
  const area = `M${X(0)} ${Y(min)} ` + points.map((p,i)=>`L${X(i)} ${Y(p.value)}`).join(' ') + ` L${X(n-1)} ${Y(min)} Z`;
  points.forEach((p,i) => { if (i < n-1) dots += `<circle class="dot" cx="${X(i)}" cy="${Y(p.value)}" r="3.5"></circle>`; });
  // the latest reading is the one that matters: bigger point, labelled
  const lx = X(n-1), ly = Y(points[n-1].value), fmt = opts.fmt || (v => v);
  dots += `<circle class="dot dot-last" cx="${lx}" cy="${ly}" r="6"></circle>`
    + `<text class="pt-label" x="${lx - 10}" y="${ly - 12}" text-anchor="end">${escapeHtml(String(fmt(points[n-1].value)))}</text>`;
  // x labels — sparse
  let xl = '';
  const labelEvery = Math.ceil(n / 6);
  points.forEach((p,i) => { if ((i % labelEvery === 0 && n-1-i >= labelEvery/2) || i === n-1) xl += `<text x="${i === n-1 ? W-2 : X(i)}" y="${H-9}" text-anchor="${i === n-1 ? 'end' : 'middle'}">${escapeHtml(p.label)}</text>`; });
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${grid}<path class="area-path" d="${area}"></path><path class="line-path" d="${dpath}" pathLength="1"></path>${dots}${xl}</svg>`;
}

/* ============================================================
   CALENDAR
   ============================================================ */
function renderCalendar() {
  const el = document.getElementById('page-calendar');
  const y = calRef.getFullYear(), m = calRef.getMonth();
  const byDate = new Map();
  data.workouts.forEach(w => { if (!byDate.has(w.date)) byDate.set(w.date, []); byDate.get(w.date).push(w); });

  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayS = todayStr();

  let cells = '';
  for (let i=0;i<startDow;i++) cells += `<div class="cal-cell blank"></div>`;
  for (let d=1; d<=daysInMonth; d++) {
    const ds = `${y}-${pad(m+1)}-${pad(d)}`;
    const has = byDate.has(ds);
    const isToday = ds === todayS;
    cells += `<div class="cal-cell ${has?'has-workout':''} ${isToday?'today':''}" ${has?`data-date="${ds}"`:''}>${d}</div>`;
  }

  const monthWs = data.workouts.filter(w => w.date.slice(0,7) === `${y}-${pad(m+1)}`)
    .sort((a,b)=>b.date.localeCompare(a.date));

  el.innerHTML = `
    <div class="card">
      <div class="cal-header">
        <div class="month">${MONTHS_FULL[m]} ${y}</div>
        <div class="cal-nav">
          <button id="cal-prev" aria-label="Previous month">‹</button>
          <button id="cal-today" style="width:auto;border-radius:17px;padding:0 12px;font-size:14px;font-weight:600;">Today</button>
          <button id="cal-next" aria-label="Next month">›</button>
        </div>
      </div>
      <div class="cal-grid">
        ${DOW.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
        ${cells}
      </div>
      <div class="cal-legend"><span class="dot-key"></span> Workout day · tap to view</div>
    </div>
    <div class="section-title">${monthWs.length} workout${monthWs.length===1?'':'s'} in ${MONTHS[m]}</div>
    ${monthWs.length ? `<div class="list">${monthWs.map(workoutRow).join('')}</div>` : `<div class="card muted center-text">No workouts this month.</div>`}
  `;

  document.getElementById('cal-prev').onclick = () => { calRef = new Date(y, m-1, 1); renderCalendar(); };
  document.getElementById('cal-next').onclick = () => { calRef = new Date(y, m+1, 1); renderCalendar(); };
  document.getElementById('cal-today').onclick = () => { calRef = new Date(); renderCalendar(); };
  el.querySelectorAll('.cal-cell.has-workout').forEach(c => c.onclick = () => openWorkoutDetail(c.dataset.date));
  el.querySelectorAll('.list-row[data-date]').forEach(r => r.onclick = () => openWorkoutDetail(r.dataset.date));
}

function workoutRow(w) {
  const d = dateObj(w.date);
  return `<div class="list-row" data-date="${w.date}">
    <div class="lr-date"><div class="d">${d.getDate()}</div><div class="m">${MONTHS[d.getMonth()]}</div></div>
    <div class="lr-main"><div class="lr-title">${escapeHtml(workoutTitle(w))}</div><div class="lr-sub">${escapeHtml(exerciseSummary(w))}</div></div>
    <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
  </div>`;
}

/* ============================================================
   WORKOUT DETAIL
   ============================================================ */
function openWorkoutDetail(date) {
  const ws = data.workouts.filter(w => w.date === date);
  if (!ws.length) return;
  const body = ws.map(w => `
    <div class="card">
      <div class="tag-pills">${w.tags.length ? tagPillsHTML(w.tags) : '<span class="wd-type">Workout</span>'}</div>
      <div style="margin-top:10px">
        ${w.exercises.map(e => `
          <div class="wd-ex">
            <div class="nm">${escapeHtml(e.name)}</div>
            <div class="sets">${e.sets.map(fmtSet).map(escapeHtml).join('  ·  ') || '—'}</div>
          </div>`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary btn-sm" data-edit="${w.id}">Edit</button>
        <button class="btn btn-danger btn-sm" data-del="${w.id}">Delete</button>
      </div>
    </div>
  `).join('');
  const sheet = openSheet(fmtDateLong(date), body);
  sheet.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { closeModal(); openEditForm(b.dataset.edit); });
  sheet.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmDelete(b.dataset.del));
}

function confirmDelete(id) {
  const w = data.workouts.find(x => x.id === id);
  showDialog('Delete workout?', `${fmtDateLong(w.date)} — ${workoutTitle(w)}`, [
    { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
    { label: 'Delete', class: 'btn-danger', onClick: () => {
      data.workouts = data.workouts.filter(x => x.id !== id); save(); closeModal();
      toast('Workout deleted'); renderCalendar();
    }},
  ]);
}

/* ============================================================
   ADD / EDIT FORM
   ============================================================ */
function renderAddPage() {
  const el = document.getElementById('page-add');
  el.innerHTML = '';
  el.appendChild(buildWorkoutForm(null, {
    onSave: (w) => {
      data.workouts.push(w); save();
      calRef = dateObj(w.date);
      switchTab('calendar');
      showDoneHUD('Saved');
      setTimeout(() => pulseDay(w.date), 650);
    },
    onCancelLabel: null,
    inline: true,
  }));
}
function openEditForm(id) {
  const existing = data.workouts.find(w => w.id === id);
  if (!existing) return;
  const form = buildWorkoutForm(existing, {
    onSave: (w) => {
      const i = data.workouts.findIndex(x => x.id === id); data.workouts[i] = w; save();
      closeModal(); renderCalendar();
      showDoneHUD('Updated');
      setTimeout(() => pulseDay(w.date), 650);
    },
    onCancelLabel: 'Cancel',
    onCancel: closeModal,
  });
  const sheet = openSheet('Edit Workout', '');
  sheet.querySelector('.sheet-body').appendChild(form);
}

function buildWorkoutForm(existing, opts) {
  const wrap = document.createElement('div');
  const state = existing
    ? { date: existing.date, tags: existing.tags.slice(), exercises: existing.exercises.map(e => ({ name: e.name, sets: e.sets.map(s => ({
        sets: s.sets != null && s.reps != null ? String(s.sets) : '',
        reps: s.reps != null ? String(s.reps) : '',
        unit: s.unit === 'sec' ? 'sec' : 'reps',
        wt: s.weight ? s.weight.raw : '',
      })) })) }
    : { date: todayStr(), tags: [], exercises: [ blankExercise() ] };

  function blankSet(unit) { return { sets: '', reps: '', unit: unit || 'reps', wt: '' }; }
  function blankExercise() { return { name: '', sets: [ blankSet() ] }; }

  function render() {
    wrap.innerHTML = `
      <label class="field-label">Date</label>
      <input class="input" type="date" id="f-date" value="${state.date}" />

      <label class="field-label">Workout type</label>
      <div id="f-tags"></div>
      <div class="hint">Pick one or more. Exercises for the first tag you pick are suggested first.</div>

      <label class="field-label">Exercises</label>
      <div id="ex-blocks"></div>
      <button type="button" class="btn btn-secondary" id="add-ex" style="margin-top:6px">+ Add exercise</button>

      <div style="height:18px"></div>
      <button type="button" class="btn btn-primary" id="save-btn">${existing?'Save changes':'Save workout'}</button>
      ${opts.onCancelLabel ? `<button type="button" class="btn btn-ghost" id="cancel-btn" style="margin-top:8px">${opts.onCancelLabel}</button>` : ''}
    `;
    const blocks = wrap.querySelector('#ex-blocks');
    state.exercises.forEach((ex, ei) => blocks.appendChild(exerciseBlock(ex, ei)));

    wrap.querySelector('#f-date').onchange = e => state.date = e.target.value;
    tagPicker(wrap.querySelector('#f-tags'), state.tags);
    wrap.querySelector('#add-ex').onclick = () => { state.exercises.push(blankExercise()); render(); focusLastExercise(); };
    wrap.querySelector('#save-btn').onclick = doSave;
    if (opts.onCancelLabel) wrap.querySelector('#cancel-btn').onclick = opts.onCancel;
  }

  function exerciseBlock(ex, ei) {
    const block = document.createElement('div');
    block.className = 'ex-block';
    block.innerHTML = `
      <div class="ex-head">
        <div class="ex-name-wrap">
          <input class="input ex-name" placeholder="Exercise name" value="${escapeHtml(ex.name)}" autocomplete="off" />
        </div>
        ${state.exercises.length>1?`<button type="button" class="ex-rm" title="Remove">×</button>`:''}
      </div>
      <div class="ex-tags"></div>
      <div class="set-head"><span>Sets</span><span></span><span>Reps / time</span><span>Weight</span></div>
      <div class="sets"></div>
      <button type="button" class="mini-btn add-set">+ Add set</button>
    `;
    const nameInput = block.querySelector('.ex-name');
    const tagLine = block.querySelector('.ex-tags');
    function drawTagLine() {
      const name = ex.name.trim();
      if (!name) { tagLine.innerHTML = ''; return; }
      const tags = exerciseTags(name);
      tagLine.innerHTML = tags.length
        ? tagPillsHTML(tags) + '<span class="tag-edit">Edit</span>'
        : '<span class="tag-missing">+ Add workout type</span>';
    }
    function askTags() { const name = ex.name.trim(); if (name) promptExerciseTags(name, state.tags, drawTagLine); }
    tagLine.onclick = askTags;
    nameInput.oninput = e => ex.name = e.target.value;
    nameInput.addEventListener('blur', () => setTimeout(drawTagLine, 200));
    attachAutocomplete(nameInput, () => exItems(state.tags), v => {
      ex.name = v; nameInput.value = v;
      if (ex.sets.every(s => !s.reps)) { const u = defaultUnitFor(v); ex.sets.forEach(s => s.unit = u); renderSets(); }
      drawTagLine();
      if (!exerciseTags(v).length) askTags();
    });
    drawTagLine();

    const setsEl = block.querySelector('.sets');
    function renderSets() {
      setsEl.innerHTML = '';
      ex.sets.forEach((s, si) => setsEl.appendChild(setRow(s, si)));
    }
    function setRow(s, si) {
      const row = document.createElement('div');
      row.className = 'set-item';
      row.innerHTML = `
        <div class="set-line">
          <button type="button" class="sets-btn" aria-label="Number of sets"></button>
          <span class="times">×</span>
          <div class="reps-wrap">
            <input class="input reps" value="${escapeHtml(s.reps)}" autocomplete="off" aria-label="Reps or seconds" />
            <button type="button" class="unit-btn" aria-label="Switch between reps and seconds"></button>
          </div>
          <input class="input wt" placeholder="Weight" value="${escapeHtml(s.wt)}" autocomplete="off" />
          ${ex.sets.length>1?`<button type="button" class="rm" title="Remove set">×</button>`:'<span></span>'}
        </div>
        <div class="sets-slider" hidden>
          <input type="range" min="1" max="${SET_SLIDER_MAX}" step="1" value="${Math.min(+s.sets || 3, SET_SLIDER_MAX)}" aria-label="Number of sets" />
          <div class="ticks">${Array.from({ length: SET_SLIDER_MAX }, (_, i) => `<button type="button" data-n="${i+1}">${i+1}</button>`).join('')}</div>
        </div>`;
      const setsBtn = row.querySelector('.sets-btn');
      const slider = row.querySelector('.sets-slider');
      const range = slider.querySelector('input');
      const repsIn = row.querySelector('.reps');
      const unitBtn = row.querySelector('.unit-btn');

      function drawSets() {
        setsBtn.textContent = s.sets || 'Sets';
        setsBtn.classList.toggle('is-empty', !s.sets);
        slider.querySelectorAll('.ticks button').forEach(b => b.classList.toggle('active', b.dataset.n === s.sets));
      }
      function drawUnit() {
        const sec = s.unit === 'sec';
        unitBtn.textContent = sec ? 'sec' : 'reps';
        unitBtn.classList.toggle('sec', sec);
        repsIn.placeholder = sec ? '30' : '12';
      }
      function setCount(n) { s.sets = String(n); range.value = n; drawSets(); }

      setsBtn.onclick = () => {
        const opening = slider.hidden;
        wrap.querySelectorAll('.sets-slider').forEach(x => x.hidden = true);
        wrap.querySelectorAll('.sets-btn').forEach(x => x.classList.remove('open'));
        slider.hidden = !opening;
        setsBtn.classList.toggle('open', opening);
        if (opening && !s.sets) setCount(range.value);
      };
      range.oninput = () => setCount(range.value);
      slider.querySelector('.ticks').onclick = e => { const b = e.target.closest('button'); if (b) setCount(b.dataset.n); };

      // "30s" / "30 sec" / "1 min" switch the set to seconds as you type
      repsIn.oninput = () => {
        s.reps = repsIn.value;
        const p = parseRepsField(repsIn.value);
        if (p && p.unit && p.unit !== s.unit) { s.unit = p.unit; drawUnit(); }
      };
      // tidy up on blur: "3x12" fills the sets box too, "30 sec" becomes 30 + sec badge
      repsIn.onblur = () => {
        const p = parseRepsField(repsIn.value);
        if (!p) return;
        if (p.sets) setCount(p.sets);
        s.reps = repsIn.value = String(p.reps);
      };
      unitBtn.onclick = () => { s.unit = s.unit === 'sec' ? 'reps' : 'sec'; drawUnit(); };
      row.querySelector('.wt').oninput = e => s.wt = e.target.value;
      const rm = row.querySelector('.rm');
      if (rm) rm.onclick = () => { ex.sets.splice(si,1); renderSets(); };
      drawSets(); drawUnit();
      return row;
    }
    renderSets();
    block.querySelector('.add-set').onclick = () => {
      const prev = ex.sets[ex.sets.length - 1];
      ex.sets.push(blankSet(prev ? prev.unit : defaultUnitFor(ex.name)));
      renderSets();
    };
    const rmEx = block.querySelector('.ex-rm');
    if (rmEx) rmEx.onclick = () => { state.exercises.splice(ei,1); render(); };
    return block;
  }

  function focusLastExercise(){ const inputs = wrap.querySelectorAll('.ex-name'); if (inputs.length) inputs[inputs.length-1].focus(); }

  function doSave() {
    if (!state.date) { toast('Pick a date'); return; }
    const exercises = [];
    state.exercises.forEach(ex => {
      const name = ex.name.trim(); if (!name) return;
      const sets = [];
      ex.sets.forEach(s => {
        const p = parseRepsField(s.reps);
        const wt = parseWeight(s.wt);
        if (!p && !wt) return;
        const n = parseInt(p && p.sets ? p.sets : s.sets, 10);
        const set = { sets: p ? (n > 0 ? n : 1) : null, reps: p ? p.reps : null, weight: wt };
        if (p && (p.unit || s.unit) === 'sec') set.unit = 'sec';
        sets.push(set);
      });
      if (!sets.length) sets.push({ sets:null, reps:null, weight:null });
      exercises.push({ name, sets });
    });
    if (!exercises.length) { toast('Add at least one exercise'); return; }
    const w = { id: existing? existing.id : uid(), date: state.date, tags: uniqTags(state.tags), exercises };
    // every exercise must belong to at least one workout type
    const untagged = uniqTags(exercises.map(e => e.name)).filter(n => !exerciseTags(n).length);
    (function next(i) {
      if (i >= untagged.length) { opts.onSave(w); return; }
      promptExerciseTags(untagged[i], state.tags, () => next(i + 1), () => toast('Each exercise needs a workout type'));
    })(0);
  }

  render();
  return wrap;
}
const SET_SLIDER_MAX = 8;

/* Toggleable tag chips plus "+ New tag". `selected` is mutated in tap order,
   which is also the order exercise suggestions are grouped in. */
function tagPicker(host, selected, opts = {}) {
  let adding = false;
  function draw() {
    const tags = uniqTags([...(opts.lead || []), ...allTags(), ...selected]);
    host.className = 'chips tag-picker';
    host.innerHTML = tags.map(t => `<button type="button" class="chip ${hasTag(selected, t)?'active':''}" data-t="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')
      + (adding ? `<input class="chip-input" placeholder="New tag" maxlength="24" autocomplete="off" />`
                : `<button type="button" class="chip chip-new">+ New tag</button>`);
    host.querySelectorAll('.chip[data-t]').forEach(b => b.onclick = () => {
      const i = selected.findIndex(x => x.toLowerCase() === b.dataset.t.toLowerCase());
      if (i >= 0) selected.splice(i, 1); else selected.push(b.dataset.t);
      changed();
    });
    const nb = host.querySelector('.chip-new');
    if (nb) nb.onclick = () => { adding = true; draw(); host.querySelector('.chip-input').focus(); };
    const input = host.querySelector('.chip-input');
    if (input) {
      let done = false;
      const commit = (keep) => {
        if (done) return; done = true; adding = false;
        const t = normTag(input.value);
        if (keep && t && !hasTag(selected, t)) selected.push(t);
        changed();
      };
      input.onkeydown = e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(true); }
        if (e.key === 'Escape') commit(false);
      };
      input.onblur = () => commit(true);
    }
  }
  function changed() { draw(); if (opts.onChange) opts.onChange(selected); }
  draw();
}

/* Ask which workout types an exercise belongs to. Layers above any open sheet. */
function promptExerciseTags(name, lead, onDone, onCancel) {
  const selected = exerciseTags(name).slice();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay center';
  overlay.style.zIndex = '120';
  overlay.innerHTML = `<div class="dialog" style="text-align:left">
    <h3 style="text-align:center">${escapeHtml(name)}</h3>
    <p style="text-align:center">Which workout types does this exercise belong to?</p>
    <div class="et-picker"></div>
    <div class="btn-row" style="margin-top:18px">
      <button class="btn btn-secondary btn-sm" style="flex:1" data-a="cancel">Cancel</button>
      <button class="btn btn-primary btn-sm" style="flex:1" data-a="ok">Save</button>
    </div>
  </div>`;
  document.getElementById('modal-root').appendChild(overlay);
  const ok = overlay.querySelector('[data-a="ok"]');
  const sync = () => { ok.disabled = !selected.length; };
  tagPicker(overlay.querySelector('.et-picker'), selected, { lead, onChange: sync });
  sync();
  const cancel = () => { dismissOverlay(overlay); if (onCancel) onCancel(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) cancel(); });
  overlay.querySelector('[data-a="cancel"]').onclick = cancel;
  ok.onclick = () => {
    if (!selected.length) return;
    setExerciseTags(name, selected);
    dismissOverlay(overlay);
    onDone(exerciseTags(name));
  };
}

/* Exercise suggestions, grouped by the workout's tags in the order they were picked. */
function exItems(order) {
  const lib = exerciseLibrary();
  if (!order.length) return lib;
  const buckets = order.map(() => []), rest = [];
  lib.forEach(x => {
    const i = order.findIndex(t => hasTag(x.tags, t));
    if (i >= 0) buckets[i].push({ ...x, group: order[i] }); else rest.push({ ...x, group: 'Other' });
  });
  return buckets.flat().concat(rest);
}

/* ---------- Autocomplete ---------- */
function attachAutocomplete(input, getItems, onPick) {
  let listEl = null;
  function close() { if (listEl) { listEl.remove(); listEl = null; } document.removeEventListener('click', outside, true); }
  function outside(e){ if (listEl && !listEl.contains(e.target) && e.target !== input) close(); }
  function open() {
    const raw = input.value.trim(), q = raw.toLowerCase();
    const items = getItems();
    const matches = (q ? items.filter(it => it.name.toLowerCase().includes(q)) : items).slice(0, q ? 15 : 40);
    const exact = items.some(it => it.name.toLowerCase() === q);
    if (!listEl) {
      listEl = document.createElement('div'); listEl.className = 'ac-list';
      listEl.addEventListener('mousedown', e => e.preventDefault()); // keep focus in the input
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(listEl);
      document.addEventListener('click', outside, true);
    }
    let html = '', group = null;
    matches.forEach(it => {
      if (it.group && it.group !== group) { group = it.group; html += `<div class="ac-group">${escapeHtml(group)}</div>`; }
      const meta = it.tags && it.tags.length ? it.tags.join(' · ') : (it.isMine ? 'no type yet' : '');
      html += `<div class="ac-item" data-v="${escapeHtml(it.name)}">${escapeHtml(it.name)}${meta?`<span class="cat">${escapeHtml(meta)}</span>`:''}</div>`;
    });
    if (q && !exact) html += `<div class="ac-item" data-v="${escapeHtml(raw)}" data-new="1">Create "${escapeHtml(raw)}"<span class="new-tag">NEW</span></div>`;
    if (!html) { close(); return; }
    listEl.innerHTML = html;
    listEl.querySelectorAll('.ac-item').forEach(it => it.onclick = (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      onPick(it.dataset.v); close();
    });
  }
  input.addEventListener('focus', open);
  input.addEventListener('input', open);
  input.addEventListener('blur', () => setTimeout(close, 180));
}

/* ============================================================
   MODALS / SHEETS / DIALOGS / TOAST
   ============================================================ */
function openSheet(title, bodyHtml) {
  closeModal();
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay sheet-overlay';
  overlay.innerHTML = `<div class="sheet">
    <div class="sheet-grabber"></div>
    <div class="sheet-head"><div class="title">${escapeHtml(title)}</div><button class="close" aria-label="Close">×</button></div>
    <div class="sheet-body">${bodyHtml}</div>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('.close').onclick = closeModal;
  root.appendChild(overlay);
  sheetPhysics(overlay, overlay.querySelector('.sheet'));
  return overlay;
}

/* Sheet motion: springs up from below, follows the finger 1:1 when dragged down
   (from the grabber/header, or from the content when it's scrolled to the top),
   and on release projects the flick to decide between dismissing and settling back.
   Every animation starts from the sheet's current position, so it can be caught mid-flight. */
function sheetPhysics(overlay, sheet) {
  const reduce = prefersReducedMotion();
  let y = 0, anim = null, drag = null;
  const height = () => sheet.offsetHeight || window.innerHeight;
  function set(v) {
    y = v;
    sheet.style.transform = v ? `translate3d(0, ${v}px, 0)` : '';
    overlay.style.backgroundColor = `rgba(0,0,0,${0.4 * Math.max(0, Math.min(1, 1 - v / height()))})`;
  }
  function animateTo(target, velocity, opts, done) {
    if (anim) anim.stop();
    anim = spring({ from: y, to: target, velocity, damping: opts.damping, response: opts.response, onUpdate: set,
      onDone: () => { anim = null; if (done) done(); } });
  }
  overlay._close = (velocity = 0) => {
    drag = null;
    if (reduce) { overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).onfinish = () => overlay.remove(); return; }
    animateTo(height(), Math.max(0, velocity), { damping: 1, response: 0.3 }, () => overlay.remove());
  };
  if (reduce) { set(0); overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 }); return; }
  set(height());
  animateTo(0, 0, { damping: 1, response: 0.38 });

  function begin(clientY) {
    if (anim) { anim.stop(); anim = null; }
    drag = { grab: clientY - y, hist: [] };
    sheet.classList.add('dragging');
  }
  function move(clientY) {
    let v = clientY - drag.grab;
    if (v < 0) v = -rubberband(-v, height()); // soft resistance above the resting position
    set(v);
    drag.hist.push({ t: performance.now(), y: clientY });
    if (drag.hist.length > 6) drag.hist.shift();
  }
  function end() {
    const h = drag.hist; let vel = 0;
    if (h.length > 1 && performance.now() - h[h.length - 1].t < 80) { // a finger that paused has no fling
      const a = h[0], b = h[h.length - 1];
      if (b.t > a.t) vel = (b.y - a.y) / ((b.t - a.t) / 1000);
    }
    drag = null; sheet.classList.remove('dragging');
    if (y + project(vel) > height() * 0.5) dismissOverlay(overlay, vel);
    else animateTo(0, vel, { damping: 0.8, response: 0.3 }); // came from a throw, so allow a touch of bounce
  }

  // touch: from the header anywhere, from the content only when it's scrolled to the top and pulled down
  let start = null;
  sheet.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || overlay._closing || e.target.closest('input[type=range], .ac-list, .chart-wrap')) { start = null; return; }
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, head: !!e.target.closest('.sheet-grabber, .sheet-head'), top: sheet.scrollTop <= 0 };
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (!start) return;
    const t = e.touches[0];
    if (!drag) {
      const dx = t.clientX - start.x, dy = t.clientY - start.y;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { start = null; return; } // horizontal: not ours
      if (Math.abs(dy) < 10) return;                                                 // hysteresis
      if (!start.head && !(start.top && dy > 0 && sheet.scrollTop <= 0)) { start = null; return; }
      begin(t.clientY);
    }
    e.preventDefault();
    move(t.clientY);
  }, { passive: false });
  const touchEnd = () => { start = null; if (drag) end(); };
  sheet.addEventListener('touchend', touchEnd);
  sheet.addEventListener('touchcancel', touchEnd);

  // mouse: drag by the grabber or header
  sheet.querySelectorAll('.sheet-grabber, .sheet-head').forEach(el => el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button') || overlay._closing) return;
    el.setPointerCapture(e.pointerId);
    begin(e.clientY);
    const mv = ev => move(ev.clientY);
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); if (drag) end(); };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
  }));
}

function showDialog(title, msg, buttons) {
  closeModal();
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay center';
  const dlg = document.createElement('div'); dlg.className = 'dialog';
  dlg.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(msg)}</p>`;
  const row = document.createElement('div'); row.className = 'btn-row';
  buttons.forEach(b => { const btn = document.createElement('button'); btn.className = `btn ${b.class} btn-sm`; btn.style.flex='1'; btn.textContent = b.label; btn.onclick = b.onClick; row.appendChild(btn); });
  dlg.appendChild(row); overlay.appendChild(dlg);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  root.appendChild(overlay);
}
function closeModal() { [...document.getElementById('modal-root').children].forEach(o => dismissOverlay(o)); }
// Sheets slide back down the way they came; dialogs fade and shrink slightly
function dismissOverlay(overlay, velocity) {
  if (overlay._closing) return;
  overlay._closing = true;
  overlay.style.pointerEvents = 'none';
  if (overlay._close) { overlay._close(velocity); return; }
  overlay.classList.add('closing');
  setTimeout(() => overlay.remove(), 200);
}

/* Confirmation HUD: checkmark draws itself, then the HUD fades away */
function showDoneHUD(label) {
  document.querySelectorAll('.hud').forEach(h => h.remove());
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.setAttribute('role', 'status');
  hud.innerHTML = `<svg viewBox="0 0 52 52" width="56" height="56" aria-hidden="true"><path d="M14 27l8 8 16-17" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg><div>${escapeHtml(label)}</div>`;
  document.body.appendChild(hud);
  setTimeout(() => { hud.classList.add('out'); setTimeout(() => hud.remove(), 260); }, 950);
}
// Draw the eye to the day that was just saved
function pulseDay(date) {
  const cell = document.querySelector(`#page-calendar .cal-cell[data-date="${date}"]`);
  if (!cell || prefersReducedMotion()) return;
  cell.classList.remove('pulse'); void cell.offsetWidth; cell.classList.add('pulse');
  cell.addEventListener('animationend', () => cell.classList.remove('pulse'), { once: true });
}
let toastTimer = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2200);
}

/* ============================================================
   SETTINGS / IMPORT / EXPORT
   ============================================================ */
function installCardHTML() {
  if (isStandalone()) return '';
  if (deferredInstallPrompt) {
    return `<div class="card">
      <h2>Install app</h2>
      <div class="muted" style="margin-bottom:14px">Add Workout Tracker to your home screen so it opens full-screen like a native app, and works offline.</div>
      <button class="btn btn-primary" id="install-btn">Install</button>
    </div>`;
  }
  if (isiOS()) {
    return `<div class="card">
      <h2>Install app</h2>
      <div class="muted">In Safari, tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. It will open full-screen and work offline.</div>
    </div>`;
  }
  return `<div class="card">
      <h2>Install app</h2>
      <div class="muted">Use your browser menu and choose <strong>Install app</strong> / <strong>Add to Home screen</strong> to open this full-screen and offline.</div>
    </div>`;
}

function themeSwatchHTML(t) {
  const dark = resolvedMode() === 'dark';
  const bg = dark ? t.bgD : t.bgL;
  const dot = dark ? t.dark : t.light;
  const active = getTheme() === t.k;
  return `<button class="theme-swatch ${active?'active':''}" data-t="${t.k}" aria-label="${escapeHtml(t.name)}">
    <span class="theme-chip" style="background:${bg}">
      <span class="dot" style="background:${dot}"></span>
      <span class="theme-check">✓</span>
    </span>
    <span class="theme-name">${escapeHtml(t.name)}</span>
  </button>`;
}

function refreshThemeUI(sheet) {
  const grid = sheet.querySelector('#theme-grid');
  if (grid) grid.innerHTML = THEMES.map(t => themeSwatchHTML(t)).join('');
  const seg = sheet.querySelector('#mode-seg');
  if (seg) seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.m === getMode()));
  bindThemeUI(sheet);
}
function bindThemeUI(sheet) {
  const seg = sheet.querySelector('#mode-seg');
  if (seg) seg.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    setMode(b.dataset.m); refreshThemeUI(sheet);
  };
  const grid = sheet.querySelector('#theme-grid');
  if (grid) grid.onclick = e => {
    const b = e.target.closest('.theme-swatch'); if (!b) return;
    setTheme(b.dataset.t); refreshThemeUI(sheet);
  };
}

function openSettings() {
  const count = data.workouts.length;
  const body = `
    ${installCardHTML()}
    <div class="card">
      <h2>Appearance</h2>
      <div class="segmented" id="mode-seg">
        ${MODES.map(m => `<button data-m="${m.k}" class="${getMode()===m.k?'active':''}">${m.label}</button>`).join('')}
      </div>
      <div class="theme-grid" id="theme-grid" style="margin-top:14px">
        ${THEMES.map(t => themeSwatchHTML(t)).join('')}
      </div>
    </div>
    <div class="card">
      <h2>Your data</h2>
      <div class="muted" style="margin-bottom:14px">${count} workout${count===1?'':'s'} stored privately on this device. Nothing is uploaded anywhere.</div>
      <button class="btn btn-secondary" id="export-btn">Export backup (.json)</button>
      <label class="btn btn-secondary" style="margin-top:10px;cursor:pointer">Import backup / data file<input type="file" id="import-file" accept="application/json,.json" hidden /></label>
    </div>
    <div class="card">
      <h2>Library</h2>
      <div class="muted" style="margin-bottom:14px">Rename, re-tag or remove exercises and workout types across your whole history.</div>
      <button class="btn btn-secondary" id="manage-ex">Exercises</button>
      <button class="btn btn-secondary" id="manage-types" style="margin-top:10px">Workout types</button>
    </div>
    <div class="card">
      <h2>Reset</h2>
      <div class="muted" style="margin-bottom:14px">Permanently remove all workouts from this device.</div>
      <button class="btn btn-danger" id="reset-btn">Erase all data</button>
    </div>
    <div class="hint center-text">Tip: clearing your browser history can erase this data — export a backup now and then.</div>
    <div class="card" style="margin-top:16px">
      <h2>About &amp; legal</h2>
      <div class="list" style="box-shadow:none;border-radius:12px;overflow:hidden">
        ${Object.keys(LEGAL).map(k => `
          <div class="list-row" data-legal="${k}">
            <div class="lr-main">
              <div class="lr-title">${escapeHtml(LEGAL[k].title)}</div>
              <div class="lr-sub">${escapeHtml(LEGAL[k].short)}</div>
            </div>
            <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
          </div>`).join('')}
      </div>
    </div>
    <div class="hint center-text" style="margin-top:18px">Workout Tracker · version ${APP_VERSION}</div>
    <div class="hint center-text" style="margin-top:4px">Your data stays on this device.</div>
  `;
  const sheet = openSheet('Settings', body);
  bindThemeUI(sheet);
  const installBtn = sheet.querySelector('#install-btn');
  if (installBtn) installBtn.onclick = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch (e) {}
    deferredInstallPrompt = null;
    closeModal();
  };
  sheet.querySelector('#export-btn').onclick = exportData;
  sheet.querySelector('#import-file').onchange = e => importFile(e.target.files[0]);
  sheet.querySelector('#manage-ex').onclick = () => openManager('exercise');
  sheet.querySelector('#manage-types').onclick = () => openManager('type');
  sheet.querySelectorAll('[data-legal]').forEach(r => r.onclick = () => openLegal(r.dataset.legal));
  sheet.querySelector('#reset-btn').onclick = () => showDialog('Erase all data?', 'This cannot be undone. Export a backup first if unsure.', [
    { label:'Cancel', class:'btn-secondary', onClick: closeModal },
    { label:'Erase', class:'btn-danger', onClick: () => { data = emptyData(); save(); closeModal(); toast('All data erased'); switchTab('stats'); } },
  ]);
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `workouts-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('Backup downloaded');
}

function mergeWorkouts(incoming) {
  let added = 0;
  const key = w => w.date + '|' + workoutTitle(w).toLowerCase();
  const seen = new Set(data.workouts.map(key));
  incoming.forEach(raw => {
    const w = migrateWorkout({ id: raw.id || uid(), date: raw.date, type: raw.type, tags: raw.tags,
      exercises: (raw.exercises||[]).map(e => ({ name: e.name, sets: e.sets||[] })) });
    if (seen.has(key(w))) return;
    seen.add(key(w));
    data.workouts.push(w);
    added++;
  });
  return added;
}

function importFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let obj, ws;
    try {
      obj = JSON.parse(reader.result);
      ws = Array.isArray(obj) ? obj : obj.workouts;
      if (!Array.isArray(ws)) throw new Error('no workouts array');
    } catch (e) { toast('Could not read that file'); return; }
    if (!data.workouts.length) { applyImport(obj, ws, false); return; }
    showDialog('Import backup', `The file has ${ws.length} workouts. Add them to the ${data.workouts.length} on this device, or replace everything on this device with the file?`, [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: 'Merge', class: 'btn-secondary', onClick: () => applyImport(obj, ws, false) },
      { label: 'Replace', class: 'btn-danger', onClick: () => applyImport(obj, ws, true) },
    ]);
  };
  reader.readAsText(file);
}

function applyImport(obj, ws, replace) {
  if (replace) data = emptyData();
  const n = mergeWorkouts(ws);
  let wn = 0;
  if (obj && Array.isArray(obj.weights)) {
    const seen = new Set(data.weights.map(x => x.date));
    obj.weights.forEach(x => { if (x && x.date && !seen.has(x.date) && isFinite(x.value)) { data.weights.push({ date: x.date, value: x.value }); seen.add(x.date); wn++; } });
    data.weights.sort((a,b)=>a.date.localeCompare(b.date));
  }
  // exercise tags from the file fill in anything not tagged on this device
  if (obj && obj.exerciseTags && typeof obj.exerciseTags === 'object') {
    Object.entries(obj.exerciseTags).forEach(([k, ts]) => {
      const key = k.trim().toLowerCase();
      if (Array.isArray(ts) && ts.length && !data.exerciseTags[key]) data.exerciseTags[key] = uniqTags(ts.map(normTag));
    });
  }
  save();
  closeModal(); toast(`${replace ? 'Replaced with' : 'Imported'} ${n} workout${n===1?'':'s'}${wn?` · ${wn} weigh-ins`:''}`); switchTab('stats');
}

/* ============================================================
   LEGAL DOCUMENTS
   ============================================================ */
function openLegal(key) {
  const doc = (typeof LEGAL !== 'undefined') && LEGAL[key];
  if (!doc) { toast('Document unavailable'); return; }
  openSheet(doc.title, `
    <div class="legal-updated">Last updated ${escapeHtml(LEGAL_UPDATED)}</div>
    <div class="legal-body">${doc.body}</div>
    <div style="height:20px"></div>
  `);
}

/* ============================================================
   LIBRARY MANAGER — rename / delete exercises and workout types
   ============================================================ */
function libraryItems(kind) {
  const map = new Map(); // key -> { name, count, exCount }
  const bump = (name, field) => {
    const k = name.toLowerCase();
    if (!map.has(k)) map.set(k, { name, count: 0, exCount: 0 });
    map.get(k)[field]++;
  };
  if (kind === 'exercise') {
    data.workouts.forEach(w => {
      const seen = new Set();
      w.exercises.forEach(e => {
        const name = e.name.trim(); if (!name) return;
        const k = name.toLowerCase();
        // count once per workout so "57 times" = 57 sessions
        if (!seen.has(k)) { bump(name, 'count'); seen.add(k); }
      });
    });
    map.forEach(it => it.tags = exerciseTags(it.name));
  } else {
    data.workouts.forEach(w => w.tags.forEach(t => bump(t, 'count')));
    const names = new Set(Object.keys(data.exerciseTags));
    data.workouts.forEach(w => w.exercises.forEach(e => names.add(e.name.trim().toLowerCase())));
    names.forEach(n => exerciseTags(n).forEach(t => bump(t, 'exCount')));
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.exCount - a.exCount || a.name.localeCompare(b.name));
}

function renameLibraryItem(kind, oldName, newName) {
  const from = oldName.trim().toLowerCase();
  const to = kind === 'exercise' ? newName.trim() : normTag(newName);
  if (!to) return false;
  if (kind === 'exercise') {
    data.workouts.forEach(w => {
      w.exercises.forEach(e => { if (e.name.trim().toLowerCase() === from) e.name = to; });
      // merge duplicates created by the rename (same name twice in one workout)
      const merged = [];
      w.exercises.forEach(e => {
        const hit = merged.find(m => m.name.trim().toLowerCase() === e.name.trim().toLowerCase());
        if (hit) hit.sets = hit.sets.concat(e.sets); else merged.push(e);
      });
      w.exercises = merged;
    });
    // carry the tags over; merging into an existing exercise keeps both sets of tags
    const toKey = to.toLowerCase();
    if (toKey !== from) {
      const moved = exerciseTags(oldName);
      if (moved.length) data.exerciseTags[toKey] = uniqTags([...exerciseTags(to), ...moved]);
      delete data.exerciseTags[from];
    }
  } else {
    const swap = ts => uniqTags(ts.map(t => t.toLowerCase() === from ? to : t));
    data.workouts.forEach(w => { w.tags = swap(w.tags); });
    Object.keys(data.exerciseTags).forEach(k => { data.exerciseTags[k] = swap(data.exerciseTags[k]); });
  }
  save();
  return true;
}

function deleteLibraryItem(kind, name) {
  const key = name.trim().toLowerCase();
  if (kind === 'exercise') {
    data.workouts.forEach(w => { w.exercises = w.exercises.filter(e => e.name.trim().toLowerCase() !== key); });
    delete data.exerciseTags[key];
  } else {
    const drop = ts => ts.filter(t => t.toLowerCase() !== key);
    data.workouts.forEach(w => { w.tags = drop(w.tags); });
    Object.keys(data.exerciseTags).forEach(k => { data.exerciseTags[k] = drop(data.exerciseTags[k]); });
  }
  save();
}

function openManager(kind) {
  const title = kind === 'exercise' ? 'Exercises' : 'Workout types';
  const sheet = openSheet(title, `<div id="mgr-body"></div>`);
  drawManager(kind, sheet);
}

function drawManager(kind, sheet) {
  const items = libraryItems(kind);
  const body = sheet.querySelector('#mgr-body');
  const noun = kind === 'exercise' ? 'exercise' : 'workout type';
  if (!items.length) {
    body.innerHTML = `<div class="card muted center-text">No ${noun}s logged yet.</div>`;
    return;
  }
  const untagged = kind === 'exercise' ? items.filter(it => !it.tags.length).length : 0;
  const note = kind === 'exercise'
    ? 'Tap an exercise to rename it or change its workout types (misspellings merge into the correct one). Deleting removes that exercise from every workout it appears in.'
    : 'Tap a workout type to rename it everywhere. Deleting removes it from workouts and exercises — the workouts themselves are kept.';
  const sub = it => kind === 'exercise'
    ? `${it.tags.length ? escapeHtml(it.tags.join(' · ')) : '<span class="tag-missing">No workout type</span>'} · logged ${it.count} time${it.count===1?'':'s'}`
    : `${it.count} workout${it.count===1?'':'s'} · ${it.exCount} exercise${it.exCount===1?'':'s'}`;
  body.innerHTML = `
    <div class="hint" style="margin:0 4px 12px">${note}</div>
    ${untagged ? `<div class="hint" style="margin:0 4px 12px;color:var(--orange)">${untagged} exercise${untagged===1?' has':'s have'} no workout type yet.</div>` : ''}
    <div class="list">
      ${items.map(it => `
        <div class="list-row" data-name="${escapeHtml(it.name)}">
          <div class="lr-main">
            <div class="lr-title">${escapeHtml(it.name)}</div>
            <div class="lr-sub">${sub(it)}</div>
          </div>
          <button class="row-del" data-del="${escapeHtml(it.name)}" aria-label="Delete">×</button>
        </div>`).join('')}
    </div>
    <div class="hint center-text" style="margin-top:12px">${items.length} ${noun}${items.length===1?'':'s'}</div>
  `;
  body.querySelectorAll('.list-row').forEach(row => {
    row.onclick = (ev) => { if (ev.target.closest('.row-del')) return; promptRename(kind, row.dataset.name, sheet); };
  });
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = (ev) => {
    ev.stopPropagation();
    promptDelete(kind, b.dataset.del, sheet);
  });
}

function promptRename(kind, name, sheet) {
  const isEx = kind === 'exercise';
  const selected = isEx ? exerciseTags(name).slice() : null;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay center';
  overlay.style.zIndex = '120';
  overlay.innerHTML = `<div class="dialog" style="text-align:left">
    <h3 style="text-align:center">${isEx ? 'Edit exercise' : 'Rename'}</h3>
    <p style="text-align:center">Applies to every workout using this name.</p>
    <input class="input" id="rn-val" value="${escapeHtml(name)}" autocomplete="off" />
    ${isEx ? '<label class="field-label">Workout types</label><div id="rn-tags"></div>' : ''}
    <div class="btn-row" style="margin-top:18px">
      <button class="btn btn-secondary btn-sm" style="flex:1" id="rn-cancel">Cancel</button>
      <button class="btn btn-primary btn-sm" style="flex:1" id="rn-ok">Save</button>
    </div>
  </div>`;
  document.getElementById('modal-root').appendChild(overlay);
  const input = overlay.querySelector('#rn-val');
  const ok = overlay.querySelector('#rn-ok');
  if (isEx) {
    const sync = () => { ok.disabled = !selected.length; };
    tagPicker(overlay.querySelector('#rn-tags'), selected, { onChange: sync });
    sync();
  } else {
    input.focus();
  }
  const close = () => dismissOverlay(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#rn-cancel').onclick = close;
  ok.onclick = () => {
    const v = input.value.trim();
    if (!v) { toast('Name cannot be empty'); return; }
    if (v !== name) renameLibraryItem(kind, name, v);
    if (isEx) setExerciseTags(v, selected);
    toast('Saved');
    close();
    drawManager(kind, sheet);
  };
}

function promptDelete(kind, name, sheet) {
  const items = libraryItems(kind);
  const it = items.find(x => x.name.toLowerCase() === name.toLowerCase());
  const n = it ? it.count : 0, m = it ? it.exCount : 0;
  const msg = kind === 'exercise'
    ? `Removes "${name}" from ${n} workout${n===1?'':'s'}. This cannot be undone.`
    : `Removes "${name}" from ${n} workout${n===1?'':'s'} and ${m} exercise${m===1?'':'s'}. The workouts are kept.`;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay center';
  overlay.style.zIndex = '120';
  overlay.innerHTML = `<div class="dialog">
    <h3>Delete ${kind === 'exercise' ? 'exercise' : 'workout type'}?</h3>
    <p>${escapeHtml(msg)}</p>
    <div class="btn-row">
      <button class="btn btn-secondary btn-sm" style="flex:1" id="dl-cancel">Cancel</button>
      <button class="btn btn-danger btn-sm" style="flex:1" id="dl-ok">Delete</button>
    </div>
  </div>`;
  document.getElementById('modal-root').appendChild(overlay);
  const close = () => dismissOverlay(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#dl-cancel').onclick = close;
  overlay.querySelector('#dl-ok').onclick = () => {
    deleteLibraryItem(kind, name);
    toast('Deleted');
    close();
    drawManager(kind, sheet);
  };
}

/* ---------- helpers ---------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function emptyState(title, msg, showImport) {
  return `<div class="empty">
    <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12M6 12h12M6 17h8"></path><rect x="3" y="3" width="18" height="18" rx="4"></rect></svg>
    <h3>${escapeHtml(title)}</h3><p>${escapeHtml(msg)}</p>
    ${showImport?'<button class="btn btn-primary" id="empty-add" style="max-width:240px;margin:0 auto">Add a workout</button><button class="btn btn-ghost" id="empty-import" style="max-width:240px;margin:8px auto 0">Import a backup</button>':''}
  </div>`;
}
function bindEmpty(el){
  const a = el.querySelector('#empty-add'); if (a) a.onclick = () => switchTab('add');
  const i = el.querySelector('#empty-import'); if (i) i.onclick = openSettings;
}

/* ============================================================
   BODYWEIGHT
   ============================================================ */
function sortedWeights() { return [...data.weights].sort((a,b) => a.date.localeCompare(b.date)); }
function upsertWeight(date, value) {
  data.weights = data.weights.filter(w => w.date !== date);
  data.weights.push({ date, value });
  data.weights.sort((a,b) => a.date.localeCompare(b.date));
  save();
}
function deleteWeight(date) { data.weights = data.weights.filter(w => w.date !== date); save(); }
/* Accepts "78,5" and "78.5" (phone keypads differ by locale). */
function parseDecimal(str) {
  if (str == null) return null;
  const s = String(str).trim().replace(',', '.').replace(/[^0-9.\-]/g, '');
  if (s === '' || s === '.' || s === '-') return null;
  const v = parseFloat(s);
  return isFinite(v) ? v : null;
}
function fmtKg(v){ const r = Math.round(v*10)/10; return Number.isInteger(r) ? String(r) : r.toFixed(1); }

function renderWeight() {
  const el = document.getElementById('page-weight');
  const ws = sortedWeights();
  const today = todayStr();
  const existingToday = ws.find(w => w.date === today);

  const points = ws.map(w => ({ label: `${dateObj(w.date).getDate()} ${MONTHS[dateObj(w.date).getMonth()]}`, value: w.value, date: w.date }));
  const chart = ws.length >= 2 ? '' : '<div class="muted center-text" style="padding:28px">Log at least two days to see your trend.</div>';

  let tiles = '';
  if (ws.length) {
    const latest = ws[ws.length-1], first = ws[0];
    const change = latest.value - first.value;
    const lo = Math.min(...ws.map(w=>w.value)), hi = Math.max(...ws.map(w=>w.value));
    const sign = change > 0 ? '+' : '';
    tiles = `
      <div class="stat-grid">
        <div class="stat-tile accent"><div class="num">${fmtKg(latest.value)}</div><div class="lbl">Current (kg)</div><div class="sub">${fmtDateLong(latest.date)}</div></div>
        <div class="stat-tile"><div class="num">${sign}${fmtKg(change)}</div><div class="lbl">Since start</div><div class="sub">${ws.length} entr${ws.length===1?'y':'ies'}</div></div>
        <div class="stat-tile"><div class="num">${fmtKg(lo)}</div><div class="lbl">Lowest</div></div>
        <div class="stat-tile"><div class="num">${fmtKg(hi)}</div><div class="lbl">Highest</div></div>
      </div>`;
  }

  el.innerHTML = `
    <div class="card">
      <h2>Weight trend (kg)</h2>
      <div class="chart-wrap">${chart}</div>
    </div>
    ${tiles}
    <div class="card">
      <h2>${existingToday ? 'Update today' : 'Log weight'}</h2>
      <label class="field-label">Date</label>
      <input class="input" type="date" id="wt-date" value="${today}" />
      <label class="field-label">Weight (kg)</label>
      <input class="input" type="text" inputmode="decimal" autocomplete="off" id="wt-val" placeholder="e.g. 78,5 or 78.5" value="${existingToday?existingToday.value:''}" />
      <button class="btn btn-primary" id="wt-save" style="margin-top:14px">${existingToday?'Update':'Save'}</button>
    </div>
    ${ws.length ? `<div class="section-title">History</div><div class="list">${[...ws].reverse().map(weightRow).join('')}</div>` : ''}
  `;

  const wrap = el.querySelector('.chart-wrap');
  if (ws.length >= 2) wrap.innerHTML = lineChartSVG(points, { unitLabel: 'kg', fmt: fmtKg, width: wrap.clientWidth });
  const dateEl = el.querySelector('#wt-date');
  const valEl = el.querySelector('#wt-val');
  const saveBtn = el.querySelector('#wt-save');
  dateEl.onchange = () => {
    const ex = data.weights.find(w => w.date === dateEl.value);
    valEl.value = ex ? ex.value : '';
    saveBtn.textContent = ex ? 'Update' : 'Save';
  };
  saveBtn.onclick = () => {
    const d = dateEl.value;
    const v = parseDecimal(valEl.value);
    if (!d) { toast('Pick a date'); return; }
    if (v == null || v <= 0) { toast('Enter a valid weight'); return; }
    upsertWeight(d, Math.round(v*10)/10);
    toast('Weight saved');
    renderWeight();
  };
  el.querySelectorAll('[data-wt-del]').forEach(b => b.onclick = (ev) => {
    ev.stopPropagation();
    const dt = b.dataset.wtDel;
    showDialog('Delete entry?', fmtDateLong(dt), [
      { label: 'Cancel', class: 'btn-secondary', onClick: closeModal },
      { label: 'Delete', class: 'btn-danger', onClick: () => { deleteWeight(dt); closeModal(); renderWeight(); } },
    ]);
  });
}
function weightRow(w) {
  const d = dateObj(w.date);
  const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  return `<div class="list-row">
    <div class="lr-date"><div class="d">${d.getDate()}</div><div class="m">${MONTHS[d.getMonth()]}</div></div>
    <div class="lr-main"><div class="lr-title">${fmtKg(w.value)} kg</div><div class="lr-sub">${wd} ${d.getFullYear()}</div></div>
    <button class="row-del" data-wt-del="${w.date}" aria-label="Delete">×</button>
  </div>`;
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  applyTheme();
  load();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));
  document.getElementById('settings-btn').onclick = openSettings;
  // iOS Safari only applies :active press states when a touch listener exists
  document.addEventListener('touchstart', () => {}, { passive: true });
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateTopbar(); });
  }, { passive: true });
  // First run: offer to load the bundled 2026 data
  if (!data.workouts.length && !localStorage.getItem('wt.seen')) {
    localStorage.setItem('wt.seen', '1');
  }
  switchTab('stats');
}
document.addEventListener('DOMContentLoaded', init);
