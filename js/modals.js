// ════════════════════════════════════════
// MODALS
// ════════════════════════════════════════
function enableModalSwipeDownClose(){
  if(!window.matchMedia?.('(pointer: coarse)').matches) return;
  const overlay=document.querySelector('#mc .overlay');
  if(!overlay) return;
  const panel=overlay.querySelector('.modal, .qpop');
  if(!panel) return;

  let tracking=false;
  let startX=0, startY=0, dragY=0;

  const resetPanel=()=>{
    panel.style.transition='transform .18s ease, opacity .18s ease';
    panel.style.transform='';
    panel.style.opacity='';
  };

  overlay.addEventListener('touchstart', (ev)=>{
    if(ev.touches.length!==1) return;
    const t=ev.touches[0];
    const rect=panel.getBoundingClientRect();
    const topZone=rect.top+Math.min(92, rect.height*0.28);
    if(t.clientY>topZone) return;
    tracking=true;
    startX=t.clientX;
    startY=t.clientY;
    dragY=0;
    panel.style.transition='none';
  }, {passive:true});

  overlay.addEventListener('touchmove', (ev)=>{
    if(!tracking||ev.touches.length!==1) return;
    const t=ev.touches[0];
    const dx=t.clientX-startX;
    const dy=t.clientY-startY;
    if(dy<=0||Math.abs(dx)>Math.max(28,dy)) return;
    dragY=Math.min(dy,220);
    panel.style.transform=`translateY(${dragY}px)`;
    panel.style.opacity=String(Math.max(0.72,1-dragY/260));
  }, {passive:true});

  const finish=()=>{
    if(!tracking) return;
    tracking=false;
    if(dragY>=90){ closeM(); return; }
    resetPanel();
  };

  overlay.addEventListener('touchend', finish, {passive:true});
  overlay.addEventListener('touchcancel', finish, {passive:true});
}

function openModal(html){
  document.getElementById('mc').innerHTML=html;
  enableModalSwipeDownClose();
  refreshIcons();
}
function closeModal(e)  { if(e&&e.target!==e.currentTarget)return; closeM(); }
function closeM()       { document.getElementById('mc').innerHTML=''; }

// ── Quick mark (calendar click) ──
function openQuick(subId,date,startTime){
  const ctx=getClassContext(subId,date,startTime);
  if(!ctx) return;
  const{s,slot,key,active,isPast,isDayOff,isClsOff,inSem}=ctx;
  const att=S.attendance[key];
  const timeStr=`${slot.start}–${slot.end}`;

  let markBtns='';
  if(active&&isPast&&inSem){
    markBtns=`
      <button class="btn${att===true?' btn-p':' btn-s'}" onclick="markCls('${subId}','${date}','${startTime}',true);closeM()">✓ Asistí</button>
      <button class="btn${att===false?' btn-d':' btn-s'}" onclick="markCls('${subId}','${date}','${startTime}',false);closeM()">✗ Falta</button>`;
  } else if(!active){
    markBtns=`<div style="color:var(--muted);font-size:13px;margin-bottom:6px">${isDayOff?'Día libre completo':'Clase cancelada'}</div>`;
  } else if(!inSem){
    markBtns=`<div style="color:var(--muted);font-size:13px;margin-bottom:6px">Fuera del semestre</div>`;
  } else {
    markBtns=`<div style="color:var(--muted);font-size:13px;margin-bottom:6px">Clase futura</div>`;
  }

  let offBtn='';
  if(inSem&&!isDayOff){
    if(isClsOff)
      offBtn=`<button class="btn btn-s" onclick="toggleCls('${subId}','${date}','${startTime}');closeM()">↩ Reactivar clase</button>`;
    else
      offBtn=`<button class="btn btn-s" onclick="toggleCls('${subId}','${date}','${startTime}');closeM()">${icon('ban','btn-ico')}<span class="btn-label">Cancelar clase</span></button>`;
  }

  openModal(`<div class="overlay" onclick="closeModal(event)">
    <div class="qpop">
      <div class="qpop-title" style="color:${s.color}">${esc(s.name)}</div>
      <div class="qpop-sub">${fmtDateLong(date)}${timeStr?' · '+timeStr:''} · ${esc(s.type)}</div>
      <div class="qpop-btns">
        ${markBtns}
        <hr class="qpop-sep">
        ${offBtn}
        <button class="btn btn-g" onclick="closeM();goDetail('${subId}')">Ver historial →</button>
        <button class="btn btn-g" onclick="closeM()">Cerrar</button>
      </div>
    </div>
  </div>`);
}

// ── Subject Modal ──
let editingSched = []; // [{day, start, end}] — temp state for the open modal
let editingColor = COLORS[0];

function openSubjModal(editId){
  const s=editId?S.subjects.find(x=>x.id===editId):null;
  const nm=s?s.name:'', tp=s?s.type:'Teoría';
  const mn=s?s.minAtt:75, col=normalizeColor(s?s.color:COLORS[0]);

  // seed the editing schedule from existing data (or empty)
  editingSched = s
    ? s.schedule.map(sl=>({day:sl.day,start:sl.start,end:sl.end,persisted:true}))
    : [];
  editingColor = col;

  const hasPresetType = SUBJECT_TYPES.includes(tp);
  const selectedType = hasPresetType ? tp : SUBJECT_TYPE_OTHER;
  const customTypeValue = hasPresetType || tp === SUBJECT_TYPE_OTHER ? '' : tp;
  const typeOpts=[...SUBJECT_TYPES, SUBJECT_TYPE_OTHER]
    .map(t=>`<option value="${t}"${selectedType===t?' selected':''}>${t}</option>`).join('');

  const colHtml=COLORS.map(c=>`
    <input type="radio" class="colr" name="col" id="c${c.slice(1)}" value="${c}" onchange="setPresetColor(this.value)"${col===c?' checked':''}>
    <label class="colsw" for="c${c.slice(1)}" style="background:${c}"></label>`).join('');

  // existing group names for datalist
  const existingGroups = [...new Set(S.subjects.filter(s=>s.group&&s.id!==editId).map(s=>s.group))];
  const groupDatalist = existingGroups.map(g=>`<option value="${esc(g)}">`).join('');
  const grp = s?.group || '';

  openModal(`<div class="overlay" onclick="closeModal(event)">
    <div class="modal">
      <div class="mhd">
        <h3>${editId?'Editar ramo':'Agregar ramo'}</h3>
        <button class="mclose" onclick="closeM()">✕</button>
      </div>
      <div class="mbody">
        <div class="fg">
          <label class="fl">Nombre del ramo</label>
          <input class="fi" id="fn" placeholder="Ej: Cálculo Diferencial" value="${esc(nm)}">
        </div>
        <div class="frow">
          <div class="fg">
            <label class="fl">Tipo</label>
            <select class="fsel" id="ft" onchange="onTypeSelectChange(this.value)">${typeOpts}</select>
          </div>
          <div class="fg">
            <label class="fl">% mínimo de asistencia</label>
            <input class="fi" id="fm" type="number" min="0" max="100" value="${mn}">
          </div>
        </div>
        <div class="fg" id="ft-custom-wrap" style="${selectedType===SUBJECT_TYPE_OTHER?'':'display:none'}">
          <label class="fl">Tipo personalizado (opcional)</label>
          <input class="fi" id="ftc" maxlength="40" placeholder="Ej: Ayudantía" value="${esc(customTypeValue)}">
          <div class="fhint">Si lo dejas vacío, se guardará como "Otro".</div>
        </div>
        <div class="fg">
          <label class="fl">Grupo (opcional)</label>
          <input class="fi" id="fg" list="gl" placeholder="Ej: Cálculo Diferencial" value="${esc(grp)}">
          <datalist id="gl">${groupDatalist}</datalist>
          <div class="fhint">Agrupa Teoría + Taller del mismo ramo para ver si apruebas en conjunto</div>
        </div>
        <div class="fg">
          <label class="fl">Bloques de clase</label>
          <div class="sched-list" id="sched-list"></div>
          <button class="sched-add" onclick="addSchedEntry()">+ Agregar bloque horario</button>
          ${editId ? `<div class="fwarn">${icon('info','ico-inline')}<span>Editar bloques recalcula todo el semestre de este ramo (totales y "Puedes faltar X más"). Si cambias días/horas o agregas/quitas bloques, la proyección se ajusta automáticamente.</span></div>` : ''}
        </div>
        <div class="fg">
          <label class="fl">Color</label>
          <div class="color-grid">${colHtml}</div>
          <div class="fhint" style="margin-bottom:7px">Paleta rápida</div>
          <input class="fi" id="fcustom" type="color" value="${col}" oninput="syncCustomColor(this.value)">
          <div class="fhint">También puedes elegir un color personalizado</div>
        </div>
      </div>
      <div class="mfoot">
        <button class="btn btn-s" onclick="closeM()">Cancelar</button>
        <button class="btn btn-p" onclick="saveSubj(${editId?`'${editId}'`:'null'})">
          ${editId?'Guardar cambios':'Agregar ramo'}
        </button>
      </div>
    </div>
  </div>`);

  renderSchedEntries();
}

function renderSchedEntries(){
  const el=document.getElementById('sched-list');
  if(!el) return;
  if(!editingSched.length){
    el.innerHTML='<p style="color:var(--muted);font-size:12px;padding:4px 0">Sin bloques. Agrega al menos uno.</p>';
    return;
  }
  const dayOpts=d=>[1,2,3,4,5,6,0].map(x=>`<option value="${x}"${x===d?' selected':''}>${DAYS_F[x]}</option>`).join('');
  el.innerHTML=editingSched.map((e,i)=>`
    <div class="sched-entry">
      <select class="sched-day" onchange="editingSched[${i}].day=+this.value">${dayOpts(e.day)}</select>
      <input type="time" step="300" class="fi-t" id="sched-start-${i}" value="${e.start}" oninput="onSchedStartChange(${i},this.value)">
      <span class="sched-arrow">→</span>
      <input type="time" step="300" class="fi-t" id="sched-end-${i}" value="${e.end}" oninput="editingSched[${i}].end=this.value">
      <button class="ibtn" onclick="removeSchedEntry(${i})" title="Quitar">✕</button>
    </div>`).join('');
}

function addSchedEntry(){
  editingSched.push({day:1,start:'08:00',end:'09:20',persisted:false});
  renderSchedEntries();
}

// mueve el término junto con el inicio, conservando la duración del bloque (fallback 1h20 si no había una válida)
function minToHHMM(min){
  const m=((Math.round(min)%1440)+1440)%1440;
  return `${pad(Math.floor(m/60))}:${pad(m%60)}`;
}
function onSchedStartChange(i,value){
  const entry=editingSched[i];
  if(!entry||!value) return;
  const oldStart=tMin(entry.start), oldEnd=tMin(entry.end);
  const duration=(Number.isFinite(oldStart)&&Number.isFinite(oldEnd)&&oldEnd>oldStart) ? oldEnd-oldStart : 80;
  entry.start=value;
  entry.end=minToHHMM(tMin(value)+duration);
  const endInput=document.getElementById(`sched-end-${i}`);
  if(endInput) endInput.value=entry.end;
}

function setPresetColor(value){
  editingColor = normalizeColor(value, COLORS[0]);
  const custom = document.getElementById('fcustom');
  if(custom) custom.value = editingColor;
}

function syncCustomColor(value){
  editingColor = normalizeColor(value, COLORS[0]);
  for(const r of document.querySelectorAll('input[name="col"]')){
    r.checked = r.value.toLowerCase() === editingColor;
  }
}

function onTypeSelectChange(value){
  const wrap=document.getElementById('ft-custom-wrap');
  if(!wrap) return;
  wrap.style.display = value===SUBJECT_TYPE_OTHER ? '' : 'none';
}

function removeSchedEntry(i){
  const entry = editingSched[i];
  if(!entry) return;
  if(entry.persisted){
    const ok = confirm(`¿Quitar este bloque guardado?\n${DAYS_F[entry.day]} ${entry.start}–${entry.end}`);
    if(!ok) return;
  }
  editingSched.splice(i,1);
  renderSchedEntries();
  toast('Bloque horario eliminado', 'warn');
}

function saveSubj(editId){
  const name=document.getElementById('fn').value.trim();
  const typeChoice=document.getElementById('ft').value;
  const customType=(document.getElementById('ftc')?.value||'').trim();
  const type=typeChoice===SUBJECT_TYPE_OTHER ? (customType||SUBJECT_TYPE_OTHER) : typeChoice;
  const minAtt=parseInt(document.getElementById('fm').value);
  const color=normalizeColor(editingColor, COLORS[0]);
  const schedule=editingSched
    .filter(e=>e.start&&e.end)
    .map(e=>({day:e.day,start:e.start,end:e.end}));
  const group=(document.getElementById('fg')?.value||'').trim();

  if(!name)                              { alert('Ingresa el nombre del ramo'); return; }
  if(isNaN(minAtt)||minAtt<0||minAtt>100){ alert('El % debe ser entre 0 y 100'); return; }
  if(!schedule.length)                   { alert('Agrega al menos un bloque horario'); return; }

  const badSlot=schedule.find(sl=>tMin(sl.end)<=tMin(sl.start));
  if(badSlot){
    alert(`Bloque horario inválido en ${DAYS_F[badSlot.day]} (${badSlot.start}–${badSlot.end}). La hora de término debe ser posterior al inicio.`);
    return;
  }

  let scheduleChanged=false;

  if(editId){
    const oldSub=S.subjects.find(x=>x.id===editId);
    if(!oldSub){ alert('No se encontró el ramo a editar'); return; }
    const oldSlots=(oldSub.schedule||[]).map(sl=>({day:sl.day,start:sl.start,end:sl.end}));
    scheduleChanged=!areSchedulesEquivalent(oldSlots,schedule);
    if(scheduleChanged){
      const ok=confirm(
        '⚠️ Cambio de horario\n\n' +
        'Cambiar los bloques horarios reasignará todos tus registros históricos de asistencia al nuevo horario.\n\n' +
        'Esto afecta el historial pasado: si moviste una clase de Lunes a Martes, los registros anteriores ' +
        'pasarán a aparecer como Martes desde el inicio del semestre.\n\n' +
        '¿Deseas continuar de todas formas?'
      );
      if(!ok) return;
    }
    Object.assign(oldSub,{name,type,minAtt,color,schedule,group});
    if(scheduleChanged) migrateSubjectDataKeys(editId,oldSlots,schedule);
  } else {
    S.subjects.push({id:uid(),name,type,minAtt,color,schedule,group});
  }
  closeM(); saveState();
  toast(editId ? 'Ramo actualizado exitosamente' : 'Ramo guardado exitosamente', 'ok');
  if(editId&&scheduleChanged){
    toast('Horario actualizado. Los registros históricos fueron reasignados al nuevo horario.', 'warn');
  }
}

function promptRenameGroup(oldName){
  const newName = prompt(`Renombrar grupo "${oldName}":`, oldName);
  if(!newName||newName.trim()===oldName) return;
  const name = newName.trim();
  for(const s of S.subjects){ if(s.group===oldName) s.group=name; }
  saveState();
  toast('Grupo renombrado', 'ok');
}

function confirmDel(id){
  const s=S.subjects.find(x=>x.id===id);
  if(!s) return;
  openModal(`<div class="overlay" onclick="closeModal(event)">
    <div class="modal" style="max-width:340px">
      <div class="mhd"><h3>Eliminar ramo</h3><button class="mclose" onclick="closeM()">✕</button></div>
      <div class="mbody">
        <p>¿Eliminar <strong>${esc(s.name)}</strong>? Se perderá todo el historial.</p>
      </div>
      <div class="mfoot">
        <button class="btn btn-s" onclick="closeM()">Cancelar</button>
        <button class="btn btn-d" onclick="delSubject('${id}');closeM()">Sí, eliminar</button>
      </div>
    </div>
  </div>`);
}

// ── Day off modal ──
function openDayModal(){
  const today=toStr(new Date());
  const listHtml=S.offDays.length
    ? S.offDays.slice().sort().map(d=>`
        <div class="ddi">
          <span>${fmtDate(d)}</span>
          <button class="rmbtn" onclick="removeOffDay('${d}');openDayModal()">✕</button>
        </div>`).join('')
    :'<p style="color:var(--muted);font-size:13px">Sin días inhabilitados.</p>';

  openModal(`<div class="overlay" onclick="closeModal(event)">
    <div class="modal" style="max-width:390px">
      <div class="mhd"><h3>${icon('ban','ico-inline')} Día libre / Feriado</h3><button class="mclose" onclick="closeM()">✕</button></div>
      <div class="mbody">
        <p style="color:var(--muted);font-size:13px;margin-bottom:13px">
          Cancela todas las clases del día seleccionado para todos los ramos.
        </p>
        <div class="fg">
          <label class="fl">Fecha</label>
          <input class="fi" type="date" id="ddval" value="${today}">
        </div>
        <button class="btn btn-p" onclick="doAddDay()" style="margin-bottom:18px">Inhabilitar este día</button>
        <div class="seclbl">Días inhabilitados</div>
        ${listHtml}
      </div>
      <div class="mfoot"><button class="btn btn-s" onclick="closeM()">Cerrar</button></div>
    </div>
  </div>`);
}

function doAddDay(){
  const d=document.getElementById('ddval').value;
  if(!d){ alert('Selecciona una fecha'); return; }
  addOffDay(d); openDayModal();
}

// ── Settings ──
function openSettings(){
  const subsHtml=S.subjects.length
    ? S.subjects.map(s=>`
        <div class="sli">
          <div class="sli-info">
            <span class="dot" style="background:${s.color}"></span>
            <span>${esc(s.name)}</span>
            <span class="badge">${esc(s.type)}</span>
            <span style="color:var(--muted);font-size:11px">${s.minAtt}%</span>
          </div>
          <div style="display:flex;gap:3px">
            <button class="ibtn" onclick="closeM();openSubjModal('${s.id}')" title="Editar ramo">${icon('pencil')}</button>
            <button class="ibtn" onclick="closeM();confirmDel('${s.id}')" title="Eliminar ramo">${icon('trash-2')}</button>
          </div>
        </div>`).join('')
    :'<p style="color:var(--muted);font-size:13px">Sin ramos.</p>';

  openModal(`<div class="overlay" onclick="closeModal(event)">
    <div class="modal">
      <div class="mhd"><h3>${icon('settings','ico-inline')} Configuración</h3><button class="mclose" onclick="closeM()">✕</button></div>
      <div class="mbody">
        <div class="sec">
          <div class="seclbl">Semestre</div>
          <div class="frow">
            <div class="fg">
              <label class="fl">Fecha de inicio</label>
              <input class="fi" type="date" id="cs" value="${S.semStart}">
            </div>
            <div class="fg">
              <label class="fl">Fecha de término</label>
              <input class="fi" type="date" id="ce" value="${S.semEnd||''}">
              <div class="fhint">Opcional — activa proyección de faltas</div>
            </div>
          </div>
          <button class="btn btn-p" onclick="saveSem()">Guardar fechas</button>
        </div>
        <div class="sec">
          <div class="seclbl">Apariencia</div>
          <div class="fg">
            <label class="fl">Tema</label>
            <select class="fsel" id="ct">
              <option value="dark"${S.theme!=='light'?' selected':''}>Oscuro</option>
              <option value="light"${S.theme==='light'?' selected':''}>Claro</option>
            </select>
          </div>
          <button class="btn btn-s" onclick="saveTheme()">${icon('sun','btn-ico')}<span class="btn-label">Aplicar tema</span></button>
        </div>
        <div class="sec">
          <div class="seclbl">Ramos (${S.subjects.length})</div>
          ${subsHtml}
          <button class="btn btn-s" style="margin-top:7px" onclick="closeM();openSubjModal(null)">+ Agregar ramo</button>
        </div>
        <div class="sec">
          <div class="seclbl">Datos</div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">
            <button class="btn btn-s" onclick="generateSyncLink()">${icon('link','btn-ico')}<span class="btn-label">Generar link de sincronización</span></button>
          </div>
          <button class="btn btn-d" onclick="confirmReset()">${icon('triangle-alert','btn-ico')}<span class="btn-label">Borrar todos los datos</span></button>
        </div>
      </div>
    </div>
  </div>`);
}

function saveTheme(){
  const theme = document.getElementById('ct')?.value === 'light' ? 'light' : 'dark';
  applyTheme(theme);
  saveState();
  toast(`Tema ${theme==='light'?'claro':'oscuro'} activado`, 'ok');
}

function saveSem(){
  const s=document.getElementById('cs').value;
  const e=document.getElementById('ce').value;
  if(!s){ alert('La fecha de inicio es requerida'); return; }
  if(e&&e<s){
    alert('La fecha de término no puede ser anterior a la de inicio');
    return;
  }

  const startDate=parseD(s);
  const todayDate=parseD(toStr(new Date()));
  const startGap=daysBetween(startDate,todayDate);
  const spanDays=e?daysBetween(parseD(e),startDate):0;

  const suspiciousStart=startGap>YEAR_GUARD_DAYS;
  const suspiciousSpan=!!e&&spanDays>YEAR_GUARD_DAYS;
  if(suspiciousStart||suspiciousSpan){
    const reasons=[];
    if(suspiciousStart) reasons.push(`inicio a ${startGap} días de hoy`);
    if(suspiciousSpan) reasons.push(`duración de ${spanDays} días`);
    const msg=`La fecha del semestre parece fuera de rango (${reasons.join(', ')}).\nEsto puede generar cientos de clases innecesarias en el historial.\n¿Guardar de todos modos?`;
    if(!confirm(msg)) return;
  }

  S.semStart=s; S.semEnd=e||''; closeM(); saveState();
  toast('Fechas del semestre guardadas', 'ok');
}

function confirmReset(){
  if(confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')){
    localStorage.removeItem(KEY);
    localStorage.removeItem(KEY_OLD);
    S=loadState(); applyTheme(S.theme); closeM(); curView='cal'; weekOffset=0; detailId=null; render();
    toast('Todos los datos fueron borrados', 'warn');
  }
}

