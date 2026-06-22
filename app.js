/* ============================================================
   Workout Tracker — vanilla JS, localStorage only.
   Data never leaves this browser.
   ============================================================ */

const STORAGE_KEY = 'workoutTracker.v1';

/* ---------- Common exercise library (merged with your own) ---------- */
const COMMON_EXERCISES = [
  // Chest
  ['Chest press', 'Chest'], ['Chest press close', 'Chest'], ['Chest squeeze', 'Chest'],
  ['Pec flies', 'Chest'], ['Inclined bench press', 'Chest'], ['Inclined dumbbell press', 'Chest'],
  ['Bench press', 'Chest'], ['Push-up', 'Chest'], ['Cable crossover', 'Chest'], ['Dips', 'Chest'],
  // Back
  ['Lat pull downs', 'Back'], ['Rows', 'Back'], ['Rows one hand', 'Back'], ['Cable pull overs', 'Back'],
  ['Pull overs', 'Back'], ['Pull ups', 'Back'], ['Assisted pull ups', 'Back'], ['Back raises', 'Back'],
  ['Back extensions', 'Back'], ['Deadlift', 'Back'], ['Dead hang', 'Back'], ['Face pull', 'Back'],
  ['Shrugs', 'Back'], ['T-bar row', 'Back'],
  // Shoulders
  ['Shoulder press', 'Shoulders'], ['Over head shoulder press', 'Shoulders'], ['Side raises', 'Shoulders'],
  ['Front raises', 'Shoulders'], ['Rear delt flies', 'Shoulders'], ['Arnold press', 'Shoulders'],
  // Biceps
  ['Bicep (D) curls', 'Biceps'], ['Ez bar curls', 'Biceps'], ['Ez bar reverse', 'Biceps'],
  ['Hammer curls', 'Biceps'], ['Preacher curls', 'Biceps'], ['Cable curls', 'Biceps'],
  ['Straight bar curls', 'Biceps'], ['Wrist curls palm up', 'Biceps'], ['Wrist curls palm down', 'Biceps'],
  ['Concentration curls', 'Biceps'],
  // Triceps
  ['Tricep extensions', 'Triceps'], ['Tricep extensions one hand', 'Triceps'], ['Tricep extensions bar', 'Triceps'],
  ['Tricep extensions reverse grip', 'Triceps'], ['Skull crushers', 'Triceps'], ['Tricep pushdown', 'Triceps'],
  ['Overhead tricep extension', 'Triceps'],
  // Legs
  ['Lunge', 'Legs'], ['Angled leg press', 'Legs'], ['Leg press', 'Legs'], ['Squat', 'Legs'],
  ['Hip thrust', 'Legs'], ['Quad extensions', 'Legs'], ['Leg curls', 'Legs'], ['Hamstring curls', 'Legs'],
  ['Calf raises', 'Legs'], ['Inner thigh', 'Legs'], ['Romanian deadlift', 'Legs'], ['Bulgarian split squat', 'Legs'],
  // Core
  ['Plank', 'Core'], ['Side plank', 'Core'], ['Sit-ups', 'Core'], ['Leg raises', 'Core'],
  ['Reverse crunches', 'Core'], ['Mountain climbers', 'Core'], ['Russian twists', 'Core'], ['Crunches', 'Core'],
  // Cardio
  ['jumping rope', 'Cardio'], ['Running', 'Cardio'], ['Cycling', 'Cardio'], ['Rowing machine', 'Cardio'],
];

const TYPE_SUGGESTIONS = [
  'Back & Bicep', 'Chest & Tricep', 'Legs', 'Back & Bicep & Shoulder',
  'Chest & Tricep & Shoulder', 'Shoulders', 'Abs & Core', 'Cardio', 'Full Body', 'Push', 'Pull',
];

/* ---------- State ---------- */
let data = { version: 1, workouts: [] };
let calRef = new Date(); // calendar reference month

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
    if (raw) { data = JSON.parse(raw); if (!data.workouts) data.workouts = []; }
  } catch (e) { console.warn('load failed', e); data = { version: 1, workouts: [] }; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

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

/* ---------- Parsing inputs ---------- */
function parseReps(str) {
  if (!str) return null;
  const s = str.trim().toLowerCase().replace(/\s+/g, ' ');
  let m = s.match(/^(\d+)\s*[x×]\s*(\d+)/);
  if (m) return { sets: +m[1], reps: +m[2] };
  m = s.match(/^(\d+)\s*(?:sec|s|reps?)?$/);
  if (m) return { sets: 1, reps: +m[1] };
  m = s.match(/(\d+)/);
  if (m) return { sets: 1, reps: +m[1] };
  return null;
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
  if (s.sets != null && s.reps != null) r = `${s.sets} × ${s.reps}`;
  else if (s.reps != null) r = `${s.reps}`;
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
  const map = new Map(); // key -> {name, cat, isMine}
  COMMON_EXERCISES.forEach(([name, cat]) => map.set(name.toLowerCase(), { name, cat, isMine: false }));
  // overlay mine (counts + preferred casing)
  const counts = new Map();
  data.workouts.forEach(w => w.exercises.forEach(e => {
    const k = e.name.trim().toLowerCase();
    counts.set(k, (counts.get(k) || 0) + 1);
    if (!map.has(k)) map.set(k, { name: e.name, cat: '', isMine: true });
    else map.get(k).isMine = true;
  }));
  const arr = [...map.values()];
  arr.forEach(x => x._count = counts.get(x.name.toLowerCase()) || 0);
  arr.sort((a, b) => (b._count - a._count) || a.name.localeCompare(b.name));
  return arr;
}

/* ============================================================
   Navigation
   ============================================================ */
const PAGE_TITLES = { stats: 'Stats', calendar: 'Calendar', add: 'Add Workout' };
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  document.getElementById('page-title').textContent = PAGE_TITLES[tab];
  document.getElementById('main').scrollTop = 0;
  window.scrollTo(0, 0);
  if (tab === 'stats') renderStats();
  if (tab === 'calendar') renderCalendar();
  if (tab === 'add') renderAddPage();
}

/* ============================================================
   STATS
   ============================================================ */
let freqMode = 'month';
let statExercise = null;
let statMetric = 'weight';

function renderStats() {
  const el = document.getElementById('page-stats');
  const ws = data.workouts;
  if (!ws.length) {
    el.innerHTML = emptyState('No workouts yet', 'Add your first workout or import your 2026 log from Settings.', true);
    bindEmpty(el);
    return;
  }
  const sorted = [...ws].sort((a, b) => a.date.localeCompare(b.date));
  const now = new Date();
  const wkStart = weekStart(now);
  const moKey = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
  const thisWeek = ws.filter(w => dateObj(w.date) >= wkStart).length;
  const thisMonth = ws.filter(w => w.date.slice(0,7) === moKey).length;
  const first = dateObj(sorted[0].date), last = dateObj(sorted[sorted.length-1].date);
  const weeksSpan = Math.max(1, Math.round((last - first) / (7*86400000)) + 1);
  const avg = (ws.length / weeksSpan).toFixed(1);

  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-tile accent"><div class="num">${ws.length}</div><div class="lbl">Total workouts</div><div class="sub">since ${MONTHS[first.getMonth()]} ${first.getFullYear()}</div></div>
      <div class="stat-tile green"><div class="num">${thisWeek}</div><div class="lbl">This week</div><div class="sub">${avg} / week avg</div></div>
      <div class="stat-tile orange"><div class="num">${thisMonth}</div><div class="lbl">This month</div><div class="sub">${MONTHS_FULL[now.getMonth()]}</div></div>
      <div class="stat-tile purple"><div class="num">${totalSets(ws)}</div><div class="lbl">Sets logged</div><div class="sub">all time</div></div>
    </div>

    <div class="card">
      <h2>Frequency</h2>
      <div class="segmented" id="freq-seg">
        <button data-m="week" class="${freqMode==='week'?'active':''}">Week</button>
        <button data-m="month" class="${freqMode==='month'?'active':''}">Month</button>
        <button data-m="year" class="${freqMode==='year'?'active':''}">Year</button>
      </div>
      <div class="chart-wrap" id="freq-chart"></div>
    </div>

    <div class="card">
      <h2>Muscle groups trained</h2>
      <div id="muscle-breakdown"></div>
    </div>

    <div class="card">
      <h2>Exercise progression</h2>
      <select class="select" id="ex-select"></select>
      <div class="segmented" id="metric-seg" style="margin-top:12px;">
        <button data-k="weight" class="${statMetric==='weight'?'active':''}">Top weight</button>
        <button data-k="volume" class="${statMetric==='volume'?'active':''}">Volume</button>
        <button data-k="reps" class="${statMetric==='reps'?'active':''}">Max reps</button>
      </div>
      <div class="chart-wrap" id="ex-chart"></div>
      <div id="ex-pr" class="hint"></div>
    </div>
  `;

  document.getElementById('freq-chart').innerHTML = freqChartSVG();
  document.getElementById('muscle-breakdown').innerHTML = muscleBreakdownHTML();

  // exercise select
  const sel = document.getElementById('ex-select');
  const exs = exercisesWithHistory();
  if (!statExercise || !exs.includes(statExercise)) statExercise = exs[0] || null;
  sel.innerHTML = exs.map(n => `<option ${n===statExercise?'selected':''}>${escapeHtml(n)}</option>`).join('');
  sel.onchange = () => { statExercise = sel.value; drawExChart(); };

  document.getElementById('freq-seg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    freqMode = b.dataset.m; renderStats();
  };
  document.getElementById('metric-seg').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    statMetric = b.dataset.k;
    document.querySelectorAll('#metric-seg button').forEach(x => x.classList.toggle('active', x === b));
    drawExChart();
  };
  drawExChart();
}

function totalSets(ws){ let n=0; ws.forEach(w=>w.exercises.forEach(e=>e.sets.forEach(s=>{ n += (s.sets||1); }))); return n; }

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

function muscleBreakdownHTML() {
  const counts = new Map();
  data.workouts.forEach(w => {
    const tokens = (w.type||'').split(/[&,]/).map(t => normMuscle(t)).filter(Boolean);
    new Set(tokens).forEach(t => counts.set(t, (counts.get(t)||0)+1));
  });
  const arr = [...counts.entries()].sort((a,b)=>b[1]-a[1]);
  if (!arr.length) return '<div class="muted">No type data.</div>';
  const max = arr[0][1];
  return arr.map(([name, c]) => `
    <div class="bd-row">
      <div class="bd-name">${escapeHtml(name)}</div>
      <div class="bd-bar" style="width:${Math.max(6, (c/max)*120)}px"></div>
      <div class="bd-count">${c}</div>
    </div>`).join('');
}
function normMuscle(t) {
  let s = t.trim().toLowerCase();
  if (!s) return '';
  const map = { bicep:'Biceps', biceps:'Biceps', tricep:'Triceps', triceps:'Triceps', chest:'Chest',
    back:'Back', shoulder:'Shoulders', shoulders:'Shoulders', leg:'Legs', legs:'Legs',
    cardio:'Cardio', abs:'Core', core:'Core', corr:'Core' };
  for (const k in map) if (s === k || s.startsWith(k)) return map[k];
  return t.trim().replace(/\b\w/g, c => c.toUpperCase());
}

function exercisesWithHistory() {
  const map = new Map(); // key -> {name, sessions:Set}
  data.workouts.forEach(w => w.exercises.forEach(e => {
    const k = e.name.trim().toLowerCase();
    if (!map.has(k)) map.set(k, { name: e.name, dates: new Set() });
    map.get(k).dates.add(w.date);
  }));
  return [...map.values()].filter(x => x.dates.size >= 2)
    .sort((a,b) => b.dates.size - a.dates.size).map(x => x.name);
}

function exerciseSeries(name) {
  const key = name.trim().toLowerCase();
  const rows = [];
  data.workouts.forEach(w => {
    const matches = w.exercises.filter(e => e.name.trim().toLowerCase() === key);
    if (!matches.length) return;
    let allSets = [];
    matches.forEach(e => allSets = allSets.concat(e.sets));
    rows.push({ date: w.date, sets: allSets });
  });
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  // dominant unit
  const unitCount = {};
  rows.forEach(r => r.sets.forEach(s => { if (s.weight && s.weight.unit && s.weight.value!=null) unitCount[s.weight.unit] = (unitCount[s.weight.unit]||0)+1; }));
  let unit = Object.keys(unitCount).sort((a,b)=>unitCount[b]-unitCount[a])[0] || null;
  const points = [];
  rows.forEach(r => {
    let val = null;
    if (statMetric === 'reps') {
      val = Math.max(...r.sets.map(s => s.reps||0));
    } else if (statMetric === 'volume') {
      let v = 0;
      r.sets.forEach(s => { if (s.weight && s.weight.unit===unit && s.weight.value!=null) v += (s.sets||1)*(s.reps||0)*(s.weight.value + (s.weight.bonusKg||0)*(unit==='plates'?0.1:1)); });
      val = v || null;
    } else { // weight (top set)
      const cand = r.sets.filter(s => s.weight && s.weight.unit===unit && s.weight.value!=null)
        .map(s => s.weight.value + (s.weight.bonusKg||0)*(unit==='plates'?0.1:1));
      if (cand.length) val = Math.max(...cand);
    }
    if (val != null) points.push({ label: `${dateObj(r.date).getDate()} ${MONTHS[dateObj(r.date).getMonth()]}`, value: val, date: r.date });
  });
  return { points, unit };
}

function drawExChart() {
  const wrap = document.getElementById('ex-chart');
  const prEl = document.getElementById('ex-pr');
  if (!wrap) return;
  if (!statExercise) { wrap.innerHTML = '<div class="muted center-text" style="padding:24px">No exercise selected.</div>'; prEl.textContent=''; return; }
  const { points, unit } = exerciseSeries(statExercise);
  if (points.length < 2) { wrap.innerHTML = '<div class="muted center-text" style="padding:24px">Not enough data yet for a chart.</div>'; prEl.textContent=''; return; }
  let unitLabel = statMetric==='reps' ? 'reps' : (statMetric==='volume' ? (unit==='plates'?'plate·reps':'kg·reps') : (unit||''));
  wrap.innerHTML = lineChartSVG(points, { unitLabel });
  // PR note
  const best = points.reduce((a,b)=> b.value>a.value?b:a, points[0]);
  const fmt = v => Number.isInteger(v)? v : v.toFixed(1);
  const metricName = statMetric==='reps'?'Most reps':(statMetric==='volume'?'Best volume':'Heaviest set');
  prEl.textContent = `${metricName}: ${fmt(best.value)} ${unitLabel} on ${fmtDateLong(best.date)}`;
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
    bars += `<rect class="bar ${last?'':'dim'}" x="${x}" y="${y}" width="${barW}" height="${Math.max(h,1)}" rx="5"></rect>`;
    if (b.value>0) bars += `<text x="${x+barW/2}" y="${y-6}" text-anchor="middle" style="font-weight:600;fill:var(--label)">${b.value}</text>`;
    bars += `<text x="${x+barW/2}" y="${H-9}" text-anchor="middle">${escapeHtml(String(b.label))}</text>`;
  });
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}</svg>`;
}

function lineChartSVG(points, opts={}) {
  const H = 220, padTop = 18, padBottom = 30, padL = 38, padR = 14;
  const n = points.length;
  const step = Math.max(34, Math.min(70, 520 / n));
  const W = Math.max(320, padL + padR + (n-1)*step);
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
  points.forEach((p,i) => { dots += `<circle class="dot" cx="${X(i)}" cy="${Y(p.value)}" r="3.5"></circle>`; });
  // x labels — sparse
  let xl = '';
  const labelEvery = Math.ceil(n / 6);
  points.forEach((p,i) => { if (i % labelEvery === 0 || i === n-1) xl += `<text x="${X(i)}" y="${H-9}" text-anchor="middle">${escapeHtml(p.label)}</text>`; });
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${grid}<path class="area-path" d="${area}"></path><path class="line-path" d="${dpath}"></path>${dots}${xl}</svg>`;
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
  for (let i=0;i<startDow;i++) cells += `<div class="cal-cell empty"></div>`;
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
    <div class="lr-main"><div class="lr-title">${escapeHtml(w.type||'Workout')}</div><div class="lr-sub">${escapeHtml(exerciseSummary(w))}</div></div>
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
      <div class="wd-type">${escapeHtml(w.type||'Workout')}</div>
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
  showDialog('Delete workout?', `${fmtDateLong(w.date)} — ${w.type||'Workout'}`, [
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
    onSave: (w) => { data.workouts.push(w); save(); toast('Workout saved'); switchTab('calendar'); },
    onCancelLabel: null,
    inline: true,
  }));
}
function openEditForm(id) {
  const existing = data.workouts.find(w => w.id === id);
  if (!existing) return;
  const form = buildWorkoutForm(existing, {
    onSave: (w) => { const i = data.workouts.findIndex(x => x.id === id); data.workouts[i] = w; save(); closeModal(); toast('Workout updated'); renderCalendar(); },
    onCancelLabel: 'Cancel',
    onCancel: closeModal,
  });
  const sheet = openSheet('Edit Workout', '');
  sheet.querySelector('.sheet-body').appendChild(form);
}

function buildWorkoutForm(existing, opts) {
  const wrap = document.createElement('div');
  const state = existing
    ? { date: existing.date, type: existing.type, exercises: existing.exercises.map(e => ({ name: e.name, sets: e.sets.map(s => ({ reps: s.sets!=null? `${s.sets} x ${s.reps}` : (s.reps!=null?`${s.reps}`:''), wt: s.weight? s.weight.raw : '' })) })) }
    : { date: todayStr(), type: '', exercises: [ blankExercise() ] };

  function blankExercise(){ return { name: '', sets: [ { reps: '', wt: '' } ] }; }

  function render() {
    wrap.innerHTML = `
      <label class="field-label">Date</label>
      <input class="input" type="date" id="f-date" value="${state.date}" />

      <label class="field-label">Workout type</label>
      <div style="position:relative">
        <input class="input" id="f-type" placeholder="e.g. Back & Bicep" value="${escapeHtml(state.type)}" autocomplete="off" />
      </div>
      <div class="chips" id="type-chips">
        ${TYPE_SUGGESTIONS.slice(0,6).map(t=>`<button type="button" class="chip" data-t="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}
      </div>

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
    const typeInput = wrap.querySelector('#f-type');
    typeInput.oninput = e => state.type = e.target.value;
    attachAutocomplete(typeInput, () => typeItems(), v => { state.type = v; typeInput.value = v; });
    wrap.querySelector('#type-chips').onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      state.type = b.dataset.t; typeInput.value = b.dataset.t;
    };
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
      <div class="sets"></div>
      <button type="button" class="mini-btn add-set">+ Add set</button>
    `;
    const nameInput = block.querySelector('.ex-name');
    nameInput.oninput = e => ex.name = e.target.value;
    attachAutocomplete(nameInput, () => exItems(), v => { ex.name = v; nameInput.value = v; });
    const setsEl = block.querySelector('.sets');
    function renderSets() {
      setsEl.innerHTML = '';
      ex.sets.forEach((s, si) => {
        const row = document.createElement('div');
        row.className = 'set-line';
        row.innerHTML = `
          <input class="input reps" placeholder="3 x 12" value="${escapeHtml(s.reps)}" autocomplete="off" inputmode="text" />
          <input class="input wt" placeholder="52kg / 4 plates" value="${escapeHtml(s.wt)}" autocomplete="off" />
          ${ex.sets.length>1?`<button type="button" class="rm" title="Remove set">×</button>`:'<span style="width:28px"></span>'}
        `;
        row.querySelector('.reps').oninput = e => s.reps = e.target.value;
        row.querySelector('.wt').oninput = e => s.wt = e.target.value;
        const rm = row.querySelector('.rm');
        if (rm) rm.onclick = () => { ex.sets.splice(si,1); renderSets(); };
        setsEl.appendChild(row);
      });
    }
    renderSets();
    block.querySelector('.add-set').onclick = () => { ex.sets.push({ reps:'', wt:'' }); renderSets(); };
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
        const rp = parseReps(s.reps);
        const wt = parseWeight(s.wt);
        if (!rp && !wt) return;
        sets.push({ sets: rp ? rp.sets : null, reps: rp ? rp.reps : null, weight: wt });
      });
      if (!sets.length) sets.push({ sets:null, reps:null, weight:null });
      exercises.push({ name, sets });
    });
    if (!exercises.length) { toast('Add at least one exercise'); return; }
    const w = { id: existing? existing.id : uid(), date: state.date, type: state.type.trim(), exercises };
    opts.onSave(w);
  }

  render();
  return wrap;
}

function typeItems() {
  const set = new Map();
  TYPE_SUGGESTIONS.forEach(t => set.set(t.toLowerCase(), { name: t, cat: '', isMine: false }));
  data.workouts.forEach(w => { if (w.type) set.set(w.type.toLowerCase(), { name: w.type, cat:'', isMine:true }); });
  return [...set.values()];
}
function exItems() { return exerciseLibrary().map(x => ({ name: x.name, cat: x.cat, isMine: x.isMine })); }

/* ---------- Autocomplete ---------- */
function attachAutocomplete(input, getItems, onPick) {
  let listEl = null;
  function close() { if (listEl) { listEl.remove(); listEl = null; } document.removeEventListener('click', outside, true); }
  function outside(e){ if (listEl && !listEl.contains(e.target) && e.target !== input) close(); }
  function open() {
    const q = input.value.trim().toLowerCase();
    const items = getItems();
    let matches = q ? items.filter(it => it.name.toLowerCase().includes(q)) : items;
    matches = matches.slice(0, 8);
    const exact = items.some(it => it.name.toLowerCase() === q);
    if (!listEl) {
      listEl = document.createElement('div'); listEl.className = 'ac-list';
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(listEl);
      document.addEventListener('click', outside, true);
    }
    let html = matches.map(it => `<div class="ac-item" data-v="${escapeHtml(it.name)}">${escapeHtml(it.name)}${it.cat?`<span class="cat">${escapeHtml(it.cat)}</span>`:''}${it.isMine&&!it.cat?'<span class="cat">yours</span>':''}</div>`).join('');
    if (q && !exact) html += `<div class="ac-item" data-v="${escapeHtml(input.value.trim())}" data-new="1">Create "${escapeHtml(input.value.trim())}"<span class="new-tag">NEW</span></div>`;
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
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="sheet">
    <div class="sheet-grabber"></div>
    <div class="sheet-head"><div class="title">${escapeHtml(title)}</div><button class="close" aria-label="Close">×</button></div>
    <div class="sheet-body">${bodyHtml}</div>
  </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.querySelector('.close').onclick = closeModal;
  root.appendChild(overlay);
  return overlay;
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
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
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

function openSettings() {
  const count = data.workouts.length;
  const body = `
    ${installCardHTML()}
    <div class="card">
      <h2>Your data</h2>
      <div class="muted" style="margin-bottom:14px">${count} workout${count===1?'':'s'} stored privately on this device. Nothing is uploaded anywhere.</div>
      <button class="btn btn-secondary" id="export-btn">Export backup (.json)</button>
      <label class="btn btn-secondary" style="margin-top:10px;cursor:pointer">Import backup / data file<input type="file" id="import-file" accept="application/json,.json" hidden /></label>
    </div>
    <div class="card">
      <h2>Sample data</h2>
      <div class="muted" style="margin-bottom:14px">Load the 2026 workout log that came with this app.</div>
      <button class="btn btn-secondary" id="load-2026">Import 2026 workouts</button>
    </div>
    <div class="card">
      <h2>Reset</h2>
      <div class="muted" style="margin-bottom:14px">Permanently remove all workouts from this device.</div>
      <button class="btn btn-danger" id="reset-btn">Erase all data</button>
    </div>
    <div class="hint center-text">Tip: clearing your browser history can erase this data — export a backup now and then.</div>
  `;
  const sheet = openSheet('Settings', body);
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
  sheet.querySelector('#load-2026').onclick = loadSeed;
  sheet.querySelector('#reset-btn').onclick = () => showDialog('Erase all data?', 'This cannot be undone. Export a backup first if unsure.', [
    { label:'Cancel', class:'btn-secondary', onClick: closeModal },
    { label:'Erase', class:'btn-danger', onClick: () => { data = { version:1, workouts:[] }; save(); closeModal(); toast('All data erased'); switchTab('stats'); } },
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
  const seen = new Set(data.workouts.map(w => w.date + '|' + (w.type||'')));
  incoming.forEach(w => {
    const key = w.date + '|' + (w.type||'');
    if (seen.has(key)) return;
    seen.add(key);
    data.workouts.push({ id: w.id || uid(), date: w.date, type: w.type||'', exercises: (w.exercises||[]).map(e => ({ name: e.name, sets: e.sets||[] })) });
    added++;
  });
  save();
  return added;
}

function importFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const ws = Array.isArray(obj) ? obj : obj.workouts;
      if (!Array.isArray(ws)) throw new Error('no workouts array');
      const n = mergeWorkouts(ws);
      closeModal(); toast(`Imported ${n} workout${n===1?'':'s'}`); switchTab('stats');
    } catch (e) { toast('Could not read that file'); }
  };
  reader.readAsText(file);
}

function loadSeed() {
  fetch('data/workouts-2026.json')
    .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(obj => { const n = mergeWorkouts(obj.workouts || []); closeModal(); toast(`Imported ${n} workout${n===1?'':'s'}`); switchTab('stats'); })
    .catch(() => { closeModal(); showDialog('Could not load sample', 'When opening the file directly some browsers block this. Use a local server (see README) or the Import button with the workouts-2026.json file.', [{ label:'OK', class:'btn-secondary', onClick: closeModal }]); });
}

/* ---------- helpers ---------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function emptyState(title, msg, showImport) {
  return `<div class="empty">
    <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12M6 12h12M6 17h8"></path><rect x="3" y="3" width="18" height="18" rx="4"></rect></svg>
    <h3>${escapeHtml(title)}</h3><p>${escapeHtml(msg)}</p>
    ${showImport?'<button class="btn btn-primary" id="empty-add" style="max-width:240px;margin:0 auto">Add a workout</button><button class="btn btn-ghost" id="empty-import" style="max-width:240px;margin:8px auto 0">Import 2026 data</button>':''}
  </div>`;
}
function bindEmpty(el){
  const a = el.querySelector('#empty-add'); if (a) a.onclick = () => switchTab('add');
  const i = el.querySelector('#empty-import'); if (i) i.onclick = openSettings;
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  load();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));
  document.getElementById('settings-btn').onclick = openSettings;
  // First run: offer to load the bundled 2026 data
  if (!data.workouts.length && !localStorage.getItem('wt.seen')) {
    localStorage.setItem('wt.seen', '1');
  }
  switchTab('stats');
}
document.addEventListener('DOMContentLoaded', init);
