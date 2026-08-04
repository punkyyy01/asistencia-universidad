// ════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════
function markCls(subId,date,startTime,val){
  const key=`${subId}_${date}_${startTime.replace(':','')}`;
  const cur = S.attendance[key];
  if(cur===val) {
    delete S.attendance[key];
    saveState();
    toast('Marca de asistencia eliminada', 'info');
    return;
  }
  S.attendance[key]=val;
  saveState();
  toast(val ? 'Clase marcada como asistida' : 'Clase marcada como falta', val ? 'ok' : 'warn');
}

function toggleCls(subId,date,startTime){
  const key=`${subId}_${date}_${startTime.replace(':','')}`;
  if(S.offClasses[key]) {
    delete S.offClasses[key];
    saveState();
    toast('Clase reactivada', 'ok');
    return;
  }
  S.offClasses[key]=true;
  delete S.attendance[key];
  saveState();
  toast('Clase cancelada', 'warn');
}

function addOffDay(date){
  if(!S.offDays.includes(date)){
    S.offDays.push(date);
    saveState();
    toast('Día inhabilitado', 'ok');
  }
}
function removeOffDay(date){
  const next = S.offDays.filter(d=>d!==date);
  if(next.length===S.offDays.length) return;
  S.offDays=next;
  saveState();
  toast('Día reactivado', 'ok');
}
function delSubject(id){
  const removingViewedDetail = curView==='detail' && detailId===id;
  S.subjects=S.subjects.filter(s=>s.id!==id);
  for(const k of Object.keys(S.attendance)) if(k.startsWith(id+'_')) delete S.attendance[k];
  for(const k of Object.keys(S.offClasses)) if(k.startsWith(id+'_')) delete S.offClasses[k];
  if(removingViewedDetail){
    curView='list';
    detailId=null;
    document.getElementById('tab-list')?.classList.add('active');
    document.getElementById('tab-cal')?.classList.remove('active');
  }
  saveState();
  toast('Ramo eliminado', 'warn');
}

