// ════════════════════════════════════════
// UTILS
// ════════════════════════════════════════
function uid()   { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pad(n)  { return String(n).padStart(2,'0'); }
function toStr(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function parseD(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }

function fmtDate(s) {
  const d=parseD(s);
  return `${DAYS_S[d.getDay()]} ${d.getDate()} ${MONTHS_S[d.getMonth()]}`;
}
function fmtDateLong(s) {
  const d=parseD(s);
  return `${DAYS_F[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                       .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function tMin(t)  { const[h,m]=t.split(':').map(Number); return h*60+m; }
function tStr(m)  { return `${pad(Math.floor(m/60))}:${pad(m%60)}`; }
function daysBetween(a,b){ return Math.round(Math.abs((a.getTime()-b.getTime())/86400000)); }

function slotSig(slot){ return `${slot.day}|${slot.start}`; }

function shiftIsoDateToWeekday(dateStr, targetDay){
  const d=parseD(dateStr);
  d.setDate(d.getDate() + (targetDay - d.getDay()));
  return toStr(d);
}

function areSchedulesEquivalent(a,b){
  if((a?.length||0)!==(b?.length||0)) return false;
  const norm=(arr)=>(arr||[]).map(sl=>`${sl.day}|${sl.start}|${sl.end}`).sort();
  const na=norm(a), nb=norm(b);
  for(let i=0;i<na.length;i++) if(na[i]!==nb[i]) return false;
  return true;
}

function buildSlotMigrationMap(oldSlots,newSlots){
  const oldList=(oldSlots||[]).map(sl=>({day:sl.day,start:sl.start}));
  const newList=(newSlots||[]).map(sl=>({day:sl.day,start:sl.start}));
  const map=new Map();
  const usedNew=new Set();

  for(const os of oldList){
    const idx=newList.findIndex((ns,j)=>!usedNew.has(j)&&ns.day===os.day&&ns.start===os.start);
    if(idx>=0){
      map.set(slotSig(os), newList[idx]);
      usedNew.add(idx);
    }
  }

  const remOld=oldList.filter(os=>!map.has(slotSig(os)));
  while(remOld.length){
    let best=null;
    for(const os of remOld){
      for(let j=0;j<newList.length;j++){
        if(usedNew.has(j)) continue;
        const ns=newList[j];
        const cost=Math.abs(ns.day-os.day)*1440 + Math.abs(tMin(ns.start)-tMin(os.start));
        if(!best||cost<best.cost) best={os,ns,idx:j,cost};
      }
    }
    if(!best) break;
    map.set(slotSig(best.os), best.ns);
    usedNew.add(best.idx);
    remOld.splice(remOld.indexOf(best.os),1);
  }
  return map;
}

function migrateSubjectStoreKeys(store,subId,oldSlots,newSlots){
  const slotMap=buildSlotMigrationMap(oldSlots,newSlots);
  const next={};
  const prefix=`${subId}_`;

  for(const[k,v] of Object.entries(store||{})){
    if(!k.startsWith(prefix)){ next[k]=v; continue; }

    const rest=k.slice(prefix.length);
    const splitAt=rest.lastIndexOf('_');
    if(splitAt<=0){ next[k]=v; continue; }

    const date=rest.slice(0,splitAt);
    const hhmm=rest.slice(splitAt+1);
    if(!isIsoDate(date)||!/^[0-9]{4}$/.test(hhmm)){ next[k]=v; continue; }

    const oldStart=`${hhmm.slice(0,2)}:${hhmm.slice(2)}`;
    const oldSig=`${parseD(date).getDay()}|${oldStart}`;
    const mapped=slotMap.get(oldSig);
    if(!mapped) continue; // removed slot: drop stale key

    const newDate=shiftIsoDateToWeekday(date,mapped.day);
    const newKey=`${subId}_${newDate}_${mapped.start.replace(':','')}`;
    if(!(newKey in next)) next[newKey]=v;
  }
  return next;
}

function migrateSubjectDataKeys(subId,oldSlots,newSlots){
  S.attendance=migrateSubjectStoreKeys(S.attendance,subId,oldSlots,newSlots);
  S.offClasses=migrateSubjectStoreKeys(S.offClasses,subId,oldSlots,newSlots);
}

function getWeekMon(offset=0) {
  const now = new Date();
  now.setDate(now.getDate() + offset*7);
  const day = now.getDay();
  const diff = day===0 ? -6 : 1-day;
  const mon = new Date(now);
  mon.setDate(now.getDate()+diff);
  mon.setHours(0,0,0,0);
  return mon;
}
function getWeekDates(offset=0) {
  const mon = getWeekMon(offset);
  return Array.from({length:6},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d; });
}

function getTimeRange() {
  let minH=8, maxH=20;
  for (const s of S.subjects) {
    for (const sl of (s.schedule||[])) {
      if (!sl.start||!sl.end) continue;
      minH = Math.min(minH, Math.floor(tMin(sl.start)/60));
      maxH = Math.max(maxH, Math.ceil(tMin(sl.end)/60));
    }
  }
  return { start: Math.max(0,minH-1), end: Math.min(24,maxH+1) };
}

