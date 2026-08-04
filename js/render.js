// ════════════════════════════════════════
// RENDER
// ════════════════════════════════════════
function render() {
  _rc = { gc: new Map(), cs: new Map() };
  const main=document.getElementById('main');
  if(curView==='cal')         main.innerHTML=renderCal();
  else if(curView==='list')   main.innerHTML=renderList();
  else if(curView==='detail') main.innerHTML=renderDetail();

  if(curView==='cal') positionBlocks();
  refreshIcons();
}

// ── CALENDAR ──
function renderCal() {
  if (isMobileDayView()) return renderCalMobile();
  const dates  = getWeekDates(weekOffset);
  const today  = toStr(new Date());
  const {start:SH, end:EH} = getTimeRange();
  const totalH = EH - SH;
  const bodyH  = totalH * HOUR_PX;

  // Week range label
  const d0=dates[0], d5=dates[5];
  const rangeLabel=`${d0.getDate()} ${MONTHS_S[d0.getMonth()]} — ${d5.getDate()} ${MONTHS_S[d5.getMonth()]} ${d5.getFullYear()}`;

  const nav=`<div class="cal-nav">
    <button class="btn btn-s" onclick="weekOffset--;render()">← Anterior</button>
    <span class="cal-range">${rangeLabel}</span>
    <button class="btn btn-s" onclick="weekOffset++;render()">Siguiente →</button>
    <button class="btn btn-g" onclick="weekOffset=0;render()">Hoy</button>
  </div>`;

  if(!S.subjects.length){
    return `${nav}
    <div class="cal-empty-wrap">
      <div class="empty-state cal-empty-state">
        <div class="eico">${icon('calendar')}</div>
        <h2>Tu semana está vacía</h2>
        <p>Agrega tu primer ramo para visualizar bloques y marcar asistencia.</p>
        <button class="btn btn-p" onclick="openSubjModal(null)">${icon('plus','btn-ico')}<span class="btn-label">Agregar primer ramo</span></button>
      </div>
    </div>`;
  }

  // Build grid rows: 1 header row + totalH rows
  // Grid: 52px time col + 6 day cols
  let gridHTML = '';

  // Corner cell (top-left)
  gridHTML += `<div class="cal-corner" style="grid-row:1;grid-column:1"></div>`;

  // Day header cells
  dates.forEach((date,i)=>{
    const ds=toStr(date);
    const isTod=ds===today;
    gridHTML+=`<div class="cal-dh${isTod?' today-col':''}" style="grid-row:1;grid-column:${i+2}">
      <div class="cal-dh-name">${DAYS_S[date.getDay()]}</div>
      <div class="cal-dh-date${isTod?' today-num':''}">${date.getDate()} ${MONTHS_S[date.getMonth()]}</div>
    </div>`;
  });

  // Time + day cells for each hour
  for(let h=0;h<totalH;h++){
    const hour=SH+h;
    const row=h+2;
    // time label cell
    gridHTML+=`<div class="time-cell" style="grid-row:${row};grid-column:1">
      <span>${pad(hour)}:00</span>
    </div>`;
    // day cells
    dates.forEach((date,i)=>{
      const ds=toStr(date);
      const isTod=ds===today;
      const inSem=ds>=S.semStart&&(!S.semEnd||ds<=S.semEnd);
      gridHTML+=`<div class="day-cell${isTod?' today-col':''}${!inSem?' out-sem':''}"
                      style="grid-row:${row};grid-column:${i+2}"
                      data-date="${ds}" data-hour="${hour}"></div>`;
    });
  }

  // Class blocks (absolutely positioned — done after render via positionBlocks())
  // We create wrapper divs per day column that span all rows
  dates.forEach((date,i)=>{
    const ds=toStr(date);
    const isTod=ds===today;
    gridHTML+=`<div class="day-blocks-layer${isTod?' today-col':''}"
                    style="grid-row:2/span ${totalH};grid-column:${i+2};position:relative;pointer-events:none"
                    id="dbl-${ds}"></div>`;
  });

  return `${nav}
  <div class="cal-outer">
    <div class="cal-grid" id="cg" style="--totalH:${totalH}">
      ${gridHTML}
    </div>
  </div>`;
}

// ── MOBILE DAY VIEW ──
function renderCalMobile() {
  const today = toStr(new Date());
  const base = new Date();
  base.setDate(base.getDate() + mobileDayOffset);
  base.setHours(0,0,0,0);
  const ds = toStr(base);
  const isToday = ds === today;

  // Week dots: Mon–Sat of the week containing `base`
  const dow = base.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const weekMon = new Date(base);
  weekMon.setDate(base.getDate() + diffToMon);
  const todayDate = parseD(today);
  todayDate.setHours(0,0,0,0);

  const weekDates = Array.from({length:6}, (_,i) => {
    const d = new Date(weekMon);
    d.setDate(weekMon.getDate() + i);
    return d;
  });
  const dotsHtml = weekDates.map(d => {
    const dStr = toStr(d);
    const diffFromToday = Math.round((d.getTime() - todayDate.getTime()) / 86400000);
    const isActive = dStr === ds;
    const isTod = dStr === today;
    return `<button class="mob-dot-btn${isActive?' mob-dot-active':''}${isTod&&!isActive?' mob-dot-today':''}"
        onclick="mobileDayOffset=${diffFromToday};render()" aria-label="${DAYS_F[d.getDay()]} ${d.getDate()}">
      <span class="mob-dot-initial">${DAYS_S[d.getDay()]}</span>
      <span class="mob-dot-day">${d.getDate()}</span>
    </button>`;
  }).join('');

  const nav = `<div class="cal-nav">
    <button class="btn btn-s" onclick="shiftMobileDay(-1)" aria-label="Día anterior">‹</button>
    <div class="cal-range">
      <div class="mob-day-bigname${isToday?' mob-today':''}">${DAYS_F[base.getDay()]}</div>
      <div class="mob-day-bigdate">${base.getDate()} ${MONTHS_S[base.getMonth()]} ${base.getFullYear()}</div>
    </div>
    <button class="btn btn-s" onclick="shiftMobileDay(1)" aria-label="Día siguiente">›</button>
    <button class="btn btn-g" onclick="mobileDayOffset=0;render()">Hoy</button>
  </div>
  <div class="mob-week-dots" role="tablist" aria-label="Días de la semana">${dotsHtml}</div>`;

  if (!S.subjects.length) {
    return `${nav}
    <div class="cal-empty-wrap">
      <div class="empty-state cal-empty-state">
        <div class="eico">${icon('calendar')}</div>
        <h2>Tu semana está vacía</h2>
        <p>Agrega tu primer ramo para visualizar bloques y marcar asistencia.</p>
        <button class="btn btn-p" onclick="openSubjModal(null)">${icon('plus','btn-ico')}<span class="btn-label">Agregar primer ramo</span></button>
      </div>
    </div>`;
  }

  const inSemDay = ds >= S.semStart && (!S.semEnd || ds <= S.semEnd);
  const isDayOff = S.offDays.includes(ds);

  const dayClasses = [];
  for (const s of S.subjects) {
    for (const slot of (s.schedule||[])) {
      if (slot.day === base.getDay()) dayClasses.push({s, slot});
    }
  }
  dayClasses.sort((a,b) => tMin(a.slot.start) - tMin(b.slot.start));

  let classesHtml = '';
  if (isDayOff) {
    classesHtml = `<div class="mob-day-off">${icon('ban','ico-inline')} Día libre</div>`;
  } else if (dayClasses.length === 0) {
    classesHtml = `<div class="mob-no-classes">${icon('coffee','ico-inline')} Sin clases este día</div>`;
  } else {
    classesHtml = dayClasses.map(({s,slot}) => renderMobileCls(s, ds, slot, today, inSemDay)).join('');
  }

  return `${nav}
  <div class="mob-day-wrap" id="mob-day-wrap"
    ontouchstart="mobSwipeStart(event)"
    ontouchmove="mobSwipeMove(event)"
    ontouchend="mobSwipeEnd(event)">
    ${classesHtml}
  </div>`;
}

function renderMobileCls(s, ds, slot, today, inSem) {
  const key = classKey(s.id, ds, slot);
  const active = isActive(s.id, ds, slot);
  const att = S.attendance[key];
  const isPast = ds <= today;
  const isDayOff = S.offDays.includes(ds);
  const isClsOff = !!S.offClasses[key];

  let statusCls = '';
  if (!inSem || !active) statusCls = 'mob-cls-off';
  else if (att === true)  statusCls = 'mob-cls-att';
  else if (att === false) statusCls = 'mob-cls-abs';

  const badge = att === true
    ? `<span class="mob-cls-badge mob-badge-ok">✓</span>`
    : att === false
    ? `<span class="mob-cls-badge mob-badge-bad">✗</span>`
    : (isPast && active && inSem ? `<span class="mob-cls-badge mob-badge-warn">?</span>` : '');

  let actBtns = '';
  if (active && isPast && inSem) {
    actBtns = `<button class="mob-att-btn mob-att-ok${att===true?' active':''}" onclick="markCls('${s.id}','${ds}','${slot.start}',true)">✓ Asistí</button>
      <button class="mob-att-btn mob-att-bad${att===false?' active':''}" onclick="markCls('${s.id}','${ds}','${slot.start}',false)">✗ Falta</button>`;
  } else if (!active) {
    actBtns = `<span class="mob-cls-label">${isDayOff?'Día libre':'Cancelada'}</span>`;
  } else {
    actBtns = `<span class="mob-cls-label">Próxima</span>`;
  }

  let offBtn = '';
  if (inSem && !isDayOff) {
    offBtn = isClsOff
      ? `<button class="mob-off-btn" onclick="toggleCls('${s.id}','${ds}','${slot.start}')">↩ Reactivar</button>`
      : `<button class="mob-off-btn" onclick="toggleCls('${s.id}','${ds}','${slot.start}')">${icon('ban','ico-inline')} Cancelar</button>`;
  }

  return `<div class="mob-cls-item ${statusCls}" style="border-left-color:${s.color}">
    <div class="mob-cls-header">
      <div class="mob-cls-info">
        <div class="mob-cls-name">${esc(s.name)}</div>
        <div class="mob-cls-meta">${slot.start}–${slot.end} · ${esc(s.type)}</div>
      </div>
      ${badge}
    </div>
    <div class="mob-cls-actions">${actBtns}${offBtn}</div>
  </div>`;
}

// Swipe left/right for day navigation
let _msx = null, _msy = null;
function mobSwipeStart(ev) {
  if (ev.touches.length !== 1) return;
  _msx = ev.touches[0].clientX;
  _msy = ev.touches[0].clientY;
}
function mobSwipeMove(ev) { /* allow normal scroll */ }
function mobSwipeEnd(ev) {
  if (_msx === null) return;
  const dx = ev.changedTouches[0].clientX - _msx;
  const dy = Math.abs(ev.changedTouches[0].clientY - _msy);
  _msx = null; _msy = null;
  if (Math.abs(dx) < 60 || dy > Math.abs(dx) * 0.8) return;
  shiftMobileDay(dx < 0 ? 1 : -1);
}

function positionBlocks() {
  const {start:SH} = getTimeRange();
  const today = toStr(new Date());
  const dates  = getWeekDates(weekOffset);
  const now    = new Date();
  const minBlockHeight = window.matchMedia?.('(pointer: coarse)').matches ? 44 : 18;

  dates.forEach(date=>{
    const ds=toStr(date);
    const layer=document.getElementById(`dbl-${ds}`);
    if(!layer) return;
    layer.style.pointerEvents='auto';

    let html='';

    // Today's time line
    if(ds===today){
      const nowY=(now.getHours()+now.getMinutes()/60-SH)*HOUR_PX;
      if(nowY>=0){
        html+=`<div class="now-line" style="top:${nowY}px"><div class="now-dot"></div></div>`;
      }
    }

    for(const s of S.subjects){
      const slots=(s.schedule||[]).filter(x=>x.day===date.getDay());
      for(const slot of slots) {

      const active=isActive(s.id,ds,slot);
      const att=S.attendance[classKey(s.id,ds,slot)];
      const isPast=ds<=today;
      const inSem=ds>=S.semStart&&(!S.semEnd||ds<=S.semEnd);

      let cls='cls-future';
      if(!inSem) cls='cls-cancelled';
      else if(!active) cls='cls-cancelled';
      else if(att===true) cls='cls-attended';
      else if(att===false) cls='cls-absent';
      else if(isPast) cls='cls-unmarked';

      // opacity per status so the color is always visible
      const bgOpacity = cls==='cls-cancelled' ? '18'
                      : cls==='cls-attended'  ? '55'
                      : cls==='cls-absent'    ? '30'
                      : cls==='cls-unmarked'  ? '40'
                      : '30'; // future

      const statusIcon = cls==='cls-attended' ? '<span class="sico sico-ok">✓</span>'
                       : cls==='cls-absent'   ? '<span class="sico sico-bad">✗</span>'
                       : cls==='cls-unmarked' ? '<span class="sico sico-warn">?</span>'
                       : '';
      const canQuickMark=active&&isPast&&inSem;
      const quickActions=canQuickMark ? `
        <div class="cls-actions">
          <button class="cls-act cls-act-ok${att===true?' on':''}" title="Asistí" onclick="event.stopPropagation();markCls('${s.id}','${ds}','${slot.start}',true)">✓</button>
          <button class="cls-act cls-act-bad${att===false?' on':''}" title="Falté" onclick="event.stopPropagation();markCls('${s.id}','${ds}','${slot.start}',false)">✗</button>
        </div>` : '';

      const startM=tMin(slot.start);
      const endM  =tMin(slot.end);
      const top   =(startM-SH*60)/60*HOUR_PX;
      const height=Math.max((endM-startM)/60*HOUR_PX-3, minBlockHeight);

      html+=`<div class="cls-block ${cls}${canQuickMark?' cls-markable':''}"
                  style="top:${top}px;height:${height}px;border-color:${s.color};background:${s.color}${bgOpacity};pointer-events:auto"
                  data-sub-id="${esc(s.id)}"
                  data-date="${ds}"
                  data-start-time="${slot.start}"
                  onclick="onCalendarBlockClick(event,this)"
                  ontouchstart="onCalendarBlockTouchStart(event,this)"
                  ontouchmove="onCalendarBlockTouchMove(event,this)"
                  ontouchend="onCalendarBlockTouchEnd(event,this)"
                  ontouchcancel="onCalendarBlockTouchCancel(event,this)">
        <div class="cls-bname">${statusIcon}${esc(s.name)}</div>
        <div class="cls-btype">${esc(s.type)} · ${slot.start}–${slot.end}</div>
        ${quickActions}
      </div>`;
      } // end for slot
    } // end for subject
    layer.innerHTML=html;
  });
}

// ── LIST VIEW ──
function renderList() {
  if(!S.subjects.length) return `
    <div class="list-wrap"><div class="empty-state">
      <div class="eico">${icon('book-open')}</div>
      <h2>Sin ramos</h2>
      <p>Agrega tus ramos para comenzar.</p>
      <button class="btn btn-p" onclick="openSubjModal(null)">${icon('plus','btn-ico')}<span class="btn-label">Agregar primer ramo</span></button>
    </div></div>`;

  // Build ordered card list: groups appear at position of their first subject
  const seen = new Set();
  const order = [];
  for (const s of S.subjects) {
    if (s.group) {
      const k = `g:${s.group}`;
      if (!seen.has(k)) { seen.add(k); order.push(k); }
    } else {
      order.push(`s:${s.id}`);
    }
  }

  const cards = order.map(k => {
    if (k.startsWith('g:')) {
      const gname = k.slice(2);
      return renderGroupCard(gname, S.subjects.filter(s=>s.group===gname));
    }
    const subj=S.subjects.find(s=>s.id===k.slice(2));
    return `<div class="group-wrap"><div class="glabel"><span class="glabel-name">&nbsp;</span></div><div class="group-cards">${renderCard(subj)}</div></div>`;
  }).join('');

  const semEnd=S.semEnd?fmtDate(S.semEnd):'hoy';
  const globalCard = renderGlobalStatsCard();
  return `<div class="list-wrap">
    <div class="list-top">
      <div style="color:var(--muted);font-size:13px">
        ${icon('calendar','ico-inline')} Semestre: <strong style="color:var(--text)">${fmtDate(S.semStart)}</strong>
        → <strong style="color:var(--text)">${semEnd}</strong>
      </div>
      ${globalCard}
    </div>
    <div class="list-grid">${cards}</div>
  </div>`;
}

function renderGlobalStatsCard() {
  const g = calcGlobalStats();
  const pctStr = g.pct !== null ? `${g.pct.toFixed(1)}%` : '—';
  const classesStr = `${g.attended}/${g.actPast}`;
  const note = g.actPast
    ? `${g.absent} falta${g.absent!==1?'s':''}${g.unmarked?` · ${g.unmarked} sin marcar`:''}`
    : 'Aún no hay clases pasadas para resumir';

  return `<div class="global-card">
    <div class="global-card-head">
      <span class="global-card-title">Resumen Global Del Semestre</span>
      <span class="badge">Dashboard</span>
    </div>
    <div class="global-card-lines">
      <div class="global-line">
        <span>Asistencia global</span>
        <strong class="${g.status}">${pctStr}</strong>
      </div>
      <div class="global-line">
        <span>Clases asistidas</span>
        <strong>${classesStr}</strong>
      </div>
    </div>
    <div class="global-note">${note}</div>
  </div>`;
}

function groupOverallStatus(subjects) {
  const statuses = subjects.map(s => calcStats(s).status);
  if (statuses.every(s => s==='ok'))                         return {cls:'ok',     label:'✓ Aprueba'};
  if (statuses.some(s => s==='danger'))                      return {cls:'danger',  label:'✗ No aprueba'};
  if (statuses.some(s => s==='warning'))                     return {cls:'warning', label:'⚠ En riesgo'};
  return {cls:'unknown', label:'~ Sin datos'};
}

function renderGroupCard(groupName, subjects) {
  const overall = groupOverallStatus(subjects);
  return `<div class="group-wrap" style="grid-column:span ${subjects.length}">
    <div class="glabel">
      <span class="glabel-name">${esc(groupName)}</span>
      <span class="gstatus ${overall.cls}">${overall.label}</span>
      <button class="ibtn" onclick="promptRenameGroup('${esc(groupName)}')" title="Renombrar grupo">${icon('pencil')}</button>
    </div>
    <div class="group-cards">${subjects.map(renderCard).join('')}</div>
  </div>`;
}

function renderCard(s) {
  const st=calcStats(s);
  const pctStr=st.pct!==null?st.pct.toFixed(1)+'%':'—';
  const barW=st.pct!==null?Math.min(st.pct,100):0;

  let missHtml='';
  if(st.pct!==null&&S.semEnd&&st.canMiss!==null){
    if(st.canMiss<0) missHtml=`<div class="miss-line danger">⚠ Superaste el límite por ${Math.abs(st.canMiss)} clase${Math.abs(st.canMiss)!==1?'s':''}</div>`;
    else if(st.canMiss===0) missHtml=`<div class="miss-line danger">⚠ No puedes faltar más</div>`;
    else missHtml=`<div class="miss-line ok">✓ Puedes faltar ${st.canMiss} más</div>`;
  } else if(!S.semEnd){
    missHtml=`<div class="miss-line muted">Agrega fecha fin para ver proyección</div>`;
  }

  const schedSummary=(s.schedule||[]).map(sl=>`${DAYS_S[sl.day]} ${sl.start}`).join(', ');

  return `<div class="card" style="--cc:${s.color}">
    <div class="card-head">
      <div class="card-name">
        <span class="dot" style="background:${s.color}"></span>
        <strong style="font-size:14px">${esc(s.name)}</strong>
        <span class="badge">${esc(s.type)}</span>
      </div>
      <div style="display:flex;gap:2px">
        <button class="ibtn" onclick="openSubjModal('${s.id}')" title="Editar ramo">${icon('pencil')}</button>
        <button class="ibtn" onclick="confirmDel('${s.id}')" title="Eliminar ramo">${icon('trash-2')}</button>
      </div>
    </div>
    <div class="pct-row">
      <div class="pct-big ${st.status}">${pctStr}</div>
      <div class="pct-min">mín. ${s.minAtt}%</div>
    </div>
    <div class="bar">
      <div class="bar-fill ${st.status}" style="width:${barW}%"></div>
      <div class="bar-mark" style="left:${s.minAtt}%"></div>
    </div>
    <div class="card-meta">
      <span>${st.attended}/${st.actPast} clases</span>
      ${st.unmarked>0?`<span class="twarn">⏳ ${st.unmarked} sin marcar</span>`:''}
    </div>
    ${missHtml}
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${schedSummary}</div>
    <button class="btn-det" onclick="goDetail('${s.id}')">Ver registro completo →</button>
  </div>`;
}

// ── DETAIL VIEW ──
function renderDetail() {
  const s=S.subjects.find(x=>x.id===detailId);
  if(!s){ goBack(); return ''; }

  const st=calcStats(s);
  const pctStr=st.pct!==null?st.pct.toFixed(1)+'%':'—';
  const today=toStr(new Date());
  const all=genClasses(s);

  const months={};
  for(const {date,slot} of all){
    const[y,m]=date.split('-');
    const k=`${y}-${m}`;
    if(!months[k]) months[k]={lbl:`${MONTHS[+m-1]} ${y}`,entries:[]};
    months[k].entries.push({date,slot});
  }

  const listHtml=Object.values(months).map(({lbl,entries})=>`
    <div class="mgroup">
      <div class="mlbl">${lbl}</div>
      ${entries.map(({date,slot})=>renderRow(s,date,slot,today)).join('')}
    </div>`).join('');

  let canMissHtml='';
  if(S.semEnd&&st.canMiss!==null){
    if(st.canMiss<0)    canMissHtml=`<span style="color:var(--red)">⚠ Superaste el límite por ${Math.abs(st.canMiss)}</span>`;
    else if(st.canMiss===0) canMissHtml=`<span style="color:var(--red)">⚠ No puedes faltar más clases</span>`;
    else canMissHtml=`<span style="color:var(--green)">✓ Puedes faltar ${st.canMiss} clase${st.canMiss!==1?'s':''} más</span>`;
  }

  const schedSummary=(s.schedule||[]).map(sl=>`${DAYS_F[sl.day]} ${sl.start}–${sl.end}`).join(' · ');

  return `<div class="detail-wrap"><div class="detail-inner">
    <div class="det-head">
      <button class="back-btn" onclick="goBack()">← Volver</button>
      <div class="det-title">
        <span class="dot" style="background:${s.color};width:12px;height:12px"></span>
        <h2>${esc(s.name)}</h2>
        <span class="badge">${esc(s.type)}</span>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat">
        <div class="stat-v ${st.status}">${pctStr}</div>
        <div class="stat-l">Asistencia</div>
      </div>
      <div class="stat">
        <div class="stat-v">${s.minAtt}%</div>
        <div class="stat-l">Mínimo</div>
      </div>
      <div class="stat">
        <div class="stat-v">${st.attended}/${st.actPast}</div>
        <div class="stat-l">Asistidas</div>
      </div>
      ${st.unmarked>0?`<div class="stat swarn">
        <div class="stat-v warning">${st.unmarked}</div>
        <div class="stat-l">Sin marcar</div>
      </div>`:''}
    </div>

    <div class="det-overview">
      <div class="det-overview-meta">
        ${canMissHtml?`<div class="info-bar">${canMissHtml}</div>`:''}
        <div class="info-bar">${icon('calendar','ico-inline')} <strong>${schedSummary||'Sin horario'}</strong></div>
      </div>
      <div class="det-acts">
        <button class="btn btn-s" onclick="openDayModal()">${icon('ban','btn-ico')}<span class="btn-label">Día libre</span></button>
        <button class="btn btn-s" onclick="openSubjModal('${s.id}')">${icon('pencil','btn-ico')}<span class="btn-label">Editar ramo</span></button>
      </div>
    </div>

    <div class="hist-title">Historial de clases</div>
    <div class="class-list">
      ${all.length===0
        ?'<p style="color:var(--muted);text-align:center;padding:20px;font-size:13px">No hay clases generadas. Verifica el horario y la fecha de inicio.</p>'
        :listHtml}
    </div>
  </div></div>`;
}

function renderRow(s,date,slot,today) {
  const isDayOff=S.offDays.includes(date);
  const isClsOff=!!S.offClasses[classKey(s.id,date,slot)];
  const active=!isDayOff&&!isClsOff;
  const att=S.attendance[classKey(s.id,date,slot)];
  const isPast=date<=today;
  const timeStr=`${slot.start}–${slot.end}`;
  const st=slot.start; // for onclick params

  let rowCls='';
  if(!active) rowCls='off';
  else if(att===true) rowCls='att';
  else if(att===false) rowCls='abs';

  let marks='';
  if(active&&isPast){
    marks=`
      <button class="mbtn ok${att===true?' ma':''}" onclick="markCls('${s.id}','${date}','${st}',true)">✓ Asistí</button>
      <button class="mbtn bad${att===false?' ma':''}" onclick="markCls('${s.id}','${date}','${st}',false)">✗ Falta</button>`;
  } else if(!active){
    marks=`<span class="clbl">${isDayOff?'Día libre':'Cancelada'}</span>`;
  } else {
    marks=`<span class="clbl">Próxima</span>`;
  }

  let offBtn='';
  if(!isDayOff){
    if(isClsOff)
      offBtn=`<button class="offbtn reac" onclick="toggleCls('${s.id}','${date}','${st}')">↩ Reactivar</button>`;
    else
      offBtn=`<button class="offbtn" onclick="toggleCls('${s.id}','${date}','${st}')" title="Cancelar clase">${icon('ban')}</button>`;
  }

  return `<div class="crow ${rowCls}">
    <div>
      <div class="cdate">${fmtDate(date)}</div>
      <div style="font-size:11px;color:var(--muted)">${timeStr}</div>
    </div>
    <div class="cacts">${marks}${offBtn}</div>
  </div>`;
}

