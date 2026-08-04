// ════════════════════════════════════════
// BUSINESS LOGIC
// ════════════════════════════════════════
// Returns [{date, slot}] — one entry per class instance (multiple per day possible)
function genClasses(sub) {
  if (_rc.gc?.has(sub.id)) return _rc.gc.get(sub.id);
  if (!S.semStart || !sub.schedule?.length) return [];
  const start = parseD(S.semStart);
  let end;
  if (S.semEnd) {
    end = parseD(S.semEnd);
  } else {
    end = new Date();
    end.setDate(end.getDate() + NO_SEM_END_LOOKAHEAD_DAYS);
  }
  end = new Date(end); end.setHours(23,59,59,999);
  const res=[], cur=new Date(start);
  while (cur<=end) {
    const dow = cur.getDay();
    const dateStr = toStr(new Date(cur));
    for (const slot of sub.schedule) {
      if (slot.day===dow) res.push({date:dateStr, slot});
    }
    cur.setDate(cur.getDate()+1);
  }
  _rc.gc?.set(sub.id, res);
  return res;
}

function isActive(subId, date, slot) {
  return !S.offClasses[classKey(subId,date,slot)] && !S.offDays.includes(date);
}

function getClassContext(subId, date, startTime){
  const s = S.subjects.find(x=>x.id===subId);
  if(!s) return null;
  const day = parseD(date).getDay();
  const slot = s.schedule?.find(x=>x.day===day&&x.start===startTime);
  if(!slot) return null;
  const key = classKey(subId,date,slot);
  const active = isActive(subId,date,slot);
  const today = toStr(new Date());
  const isPast = date<=today;
  const isDayOff = S.offDays.includes(date);
  const isClsOff = !!S.offClasses[key];
  const inSem = date>=S.semStart&&(!S.semEnd||date<=S.semEnd);
  return {s,slot,key,active,isPast,isDayOff,isClsOff,inSem};
}

function canDirectMark(ctx){
  return !!ctx && ctx.active && ctx.isPast && ctx.inSem;
}

function cycleBlockAttendance(subId,date,startTime){
  const ctx=getClassContext(subId,date,startTime);
  if(!canDirectMark(ctx)) return false;
  const cur=S.attendance[ctx.key];
  if(cur===undefined){
    S.attendance[ctx.key]=true;
    toast('Clase marcada como asistida', 'ok');
  } else if(cur===true){
    S.attendance[ctx.key]=false;
    toast('Clase marcada como falta', 'warn');
  } else {
    delete S.attendance[ctx.key];
    toast('Marca de asistencia eliminada', 'info');
  }
  saveState();
  return true;
}

const blockTouchState = new WeakMap();

function prefersTouchBlockGesture(){
  return !!window.matchMedia?.('(pointer: coarse)').matches || !!window.matchMedia?.('(hover: none)').matches;
}

function onCalendarBlockClick(event,el){
  if(prefersTouchBlockGesture()){
    event.preventDefault();
    return;
  }
  if(!el?.dataset) return;
  openQuick(el.dataset.subId,el.dataset.date,el.dataset.startTime);
}

function onCalendarBlockTouchStart(event,el){
  if(!prefersTouchBlockGesture()||!el?.dataset) return;
  const t=event.touches?.[0];
  if(!t) return;
  const state={startX:t.clientX,startY:t.clientY,moved:false,longPress:false,timer:0};
  state.timer=window.setTimeout(()=>{
    state.longPress=true;
    blockTouchState.set(el,state);
    openQuick(el.dataset.subId,el.dataset.date,el.dataset.startTime);
  }, MOBILE_LONG_PRESS_MS);
  blockTouchState.set(el,state);
}

function onCalendarBlockTouchMove(event,el){
  const state=blockTouchState.get(el);
  if(!state) return;
  const t=event.touches?.[0];
  if(!t) return;
  if(Math.abs(t.clientX-state.startX)>10||Math.abs(t.clientY-state.startY)>10){
    state.moved=true;
    if(state.timer){ clearTimeout(state.timer); state.timer=0; }
    blockTouchState.set(el,state);
  }
}

function onCalendarBlockTouchEnd(event,el){
  const state=blockTouchState.get(el);
  if(!state||!el?.dataset) return;
  if(state.timer){ clearTimeout(state.timer); state.timer=0; }
  blockTouchState.delete(el);
  if(state.longPress||state.moved) return;
  event.preventDefault();
  const{subId,date,startTime}=el.dataset;
  if(!cycleBlockAttendance(subId,date,startTime)) openQuick(subId,date,startTime);
}

function onCalendarBlockTouchCancel(_event,el){
  const state=blockTouchState.get(el);
  if(!state) return;
  if(state.timer) clearTimeout(state.timer);
  blockTouchState.delete(el);
}

function calcStats(sub) {
  if (_rc.cs?.has(sub.id)) return _rc.cs.get(sub.id);
  const today = toStr(new Date());
  const all = genClasses(sub);
  const past = all.filter(c => c.date <= today);
  const future = all.filter(c => c.date > today);
  
  let actPast = 0, attended = 0, absent = 0, unmarked = 0;
  for(const {date, slot} of past) {
    if(!isActive(sub.id, date, slot)) continue;
    actPast++;
    const v = S.attendance[classKey(sub.id, date, slot)];
    if(v === true) attended++;
    else if(v === false) absent++;
    else unmarked++;
  }
  
  let actFut = 0;
  for(const {date, slot} of future) { 
    if(isActive(sub.id, date, slot)) actFut++; 
  }
  
  const total = actPast + actFut;
  
  // pct basado solo en clases explícitamente marcadas
  const markedPast = attended + absent;
  const pct = markedPast > 0 ? (attended / markedPast * 100) : null;
  
  const status = pct === null ? 'unknown' : pct >= sub.minAtt ? 'ok' : pct >= sub.minAtt - 10 ? 'warning' : 'danger';
  
  let canMiss = null;
  if(S.semEnd && total > 0) {
    const req = Math.ceil(total * sub.minAtt / 100);
    // canMiss basado en el máximo posible a futuro
    canMiss = (attended + actFut) - req;
  }
  
  const result = {actPast, attended, absent, unmarked, actFut, total, pct, canMiss, status};
  _rc.cs?.set(sub.id, result);
  return result;
}

function calcGlobalStats() {
  const totals = { actPast: 0, attended: 0, absent: 0, unmarked: 0 };
  for (const sub of S.subjects) {
    const st = calcStats(sub);
    totals.actPast += st.actPast;
    totals.attended += st.attended;
    totals.absent += st.absent;
    totals.unmarked += st.unmarked;
  }
  const pct = totals.actPast > 0 ? (totals.attended / totals.actPast) * 100 : null;
  const status = pct === null ? 'unknown' : pct >= 75 ? 'ok' : pct >= 65 ? 'warning' : 'danger';
  return {...totals, pct, status};
}

