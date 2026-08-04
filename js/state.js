// ════════════════════════════════════════
// STATE
// ════════════════════════════════════════
let S = loadState();

function getDefaultTheme(){
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function normalizeTheme(t){
  return t === 'light' ? 'light' : 'dark';
}

function makeInitialState() {
  const now = new Date();
  return {
    semStart: `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`,
    semEnd: '',
    subjects: [],
    attendance: {},   // "subId_YYYY-MM-DD_HHMM" -> true|false
    offClasses: {},   // "subId_YYYY-MM-DD_HHMM" -> true
    offDays: [],      // ["YYYY-MM-DD"]
    theme: getDefaultTheme()
  };
}

function withStateDefaults(raw){
  const base = makeInitialState();
  const next = {...base, ...(raw||{})};
  next.subjects = Array.isArray(next.subjects) ? next.subjects : [];
  next.attendance = next.attendance && typeof next.attendance === 'object' ? next.attendance : {};
  next.offClasses = next.offClasses && typeof next.offClasses === 'object' ? next.offClasses : {};
  next.offDays = Array.isArray(next.offDays) ? next.offDays : [];
  next.theme = normalizeTheme(next.theme || getDefaultTheme());
  return next;
}

function loadState() {
  try {
    const r5 = localStorage.getItem(KEY);
    if (r5) return withStateDefaults(JSON.parse(r5));
    const r4 = localStorage.getItem(KEY_OLD);
    if (r4) return withStateDefaults(migrateOld(JSON.parse(r4)));
  } catch(e){}
  return makeInitialState();
}

// Migrates data from v4 (one slot/day, key=subId_date) to v5 (multi-slot, key=subId_date_HHMM)
function migrateOld(d) {
  for (const sub of (d.subjects||[])) {
    if (sub.schedule?.length && typeof sub.schedule[0]==='number')
      sub.schedule = sub.schedule.map(dy=>({day:dy,start:'08:00',end:'09:30'}));
    if (sub.minAttendance && !sub.minAtt) sub.minAtt = sub.minAttendance;
  }
  function migrateKeys(obj) {
    const out={};
    for (const [k,v] of Object.entries(obj||{})) {
      const parts=k.split('_');
      if(parts.length===3){ out[k]=v; continue; } // already new format
      // old: subId_YYYY-MM-DD  (parts[0]=subId, parts[1]=YYYY-MM-DD)
      const [subId,date]=parts;
      const sub=(d.subjects||[]).find(s=>s.id===subId);
      if(!sub) continue;
      const dow=parseD(date).getDay();
      const slots=(sub.schedule||[]).filter(sl=>sl.day===dow);
      if(slots.length===1) out[`${subId}_${date}_${slots[0].start.replace(':','')}`]=v;
      // if multiple slots we can't know which – discard
    }
    return out;
  }
  d.attendance = migrateKeys(d.attendance);
  d.offClasses = migrateKeys(d.offClasses);
  return d;
}

function saveState() { localStorage.setItem(KEY, JSON.stringify(S)); render(); }

// Per-render memoization cache — reset at the top of every render() call.
// Keyed by subject id. No manual invalidation needed: cache is wiped on every render.
let _rc = { gc: null, cs: null };

// key for a specific class instance
function classKey(subId,date,slot){ return `${subId}_${date}_${slot.start.replace(':','')}`; }

function icon(name, cls='ico-inline') {
  return `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

function toast(message, type='ok') {
  const host = document.getElementById('tc');
  if (!host || !message) return;
  const iconByType = {
    ok: 'check',
    warn: 'triangle-alert',
    error: 'circle-x',
    info: 'info'
  };
  const safeType = iconByType[type] ? type : 'ok';
  const item = document.createElement('div');
  item.className = `toast t-${safeType}`;
  item.innerHTML = `<span class="toast-ico">${icon(iconByType[safeType])}</span><span class="toast-msg">${esc(message)}</span>`;
  host.appendChild(item);
  refreshIcons();
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => {
    item.classList.remove('show');
    setTimeout(() => item.remove(), 220);
  }, 3000);
}

function isIsoDate(v){
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isValidTime(v){
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function clampNum(n, min, max, fallback){
  const num = Number(n);
  if (Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function normalizeColor(value, fallback=COLORS[0]){
  const v = String(value||'').trim();
  return /^#([0-9a-fA-F]{6})$/.test(v) ? v.toLowerCase() : fallback;
}

function applyTheme(theme){
  const t = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'light' ? '#f3f5fb' : '#0f1117');
  S.theme = t;
}

function normalizeImportedState(payload){
  const source = payload && typeof payload === 'object' && payload.state && typeof payload.state === 'object'
    ? payload.state
    : payload;
  if (!source || typeof source !== 'object') return null;
  const hasKnownKeys = ['subjects','attendance','offClasses','offDays','semStart','semEnd','theme']
    .some(k => Object.prototype.hasOwnProperty.call(source, k));
  if (!hasKnownKeys) return null;

  let data = JSON.parse(JSON.stringify(source));
  const needsMigration = Array.isArray(data.subjects) && data.subjects.some(sub =>
    (Array.isArray(sub?.schedule) && typeof sub.schedule[0] === 'number') ||
    (sub?.minAttendance && !sub?.minAtt)
  );
  if (needsMigration) data = migrateOld(data);

  const shaped = withStateDefaults(data);
  const subjects = [];

  for (const rawSub of shaped.subjects) {
    if (!rawSub || typeof rawSub !== 'object') continue;
    const schedule = (Array.isArray(rawSub.schedule) ? rawSub.schedule : [])
      .map(sl => ({day: Number(sl.day), start: String(sl.start||''), end: String(sl.end||'')}))
      .filter(sl => Number.isInteger(sl.day) && sl.day >= 0 && sl.day <= 6 && isValidTime(sl.start) && isValidTime(sl.end) && tMin(sl.end) > tMin(sl.start));
    if (!schedule.length) continue;

    const name = String(rawSub.name || '').trim();
    subjects.push({
      id: String(rawSub.id || uid()),
      name: name || 'Ramo',
      type: String(rawSub.type || 'Teoría'),
      minAtt: clampNum(rawSub.minAtt, 0, 100, 75),
      color: normalizeColor(rawSub.color),
      schedule,
      group: String(rawSub.group || '').trim()
    });
  }

  const state = {
    semStart: isIsoDate(shaped.semStart) ? shaped.semStart : makeInitialState().semStart,
    semEnd: isIsoDate(shaped.semEnd) ? shaped.semEnd : '',
    subjects,
    attendance: {},
    offClasses: {},
    offDays: Array.from(new Set((Array.isArray(shaped.offDays) ? shaped.offDays : []).filter(isIsoDate))),
    theme: normalizeTheme(shaped.theme)
  };

  for (const [k, v] of Object.entries(shaped.attendance || {})) {
    if (v === true || v === false) state.attendance[String(k)] = v;
  }
  for (const [k, v] of Object.entries(shaped.offClasses || {})) {
    if (v === true) state.offClasses[String(k)] = true;
  }
  return state;
}

