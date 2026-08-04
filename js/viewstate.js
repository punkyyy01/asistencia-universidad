// ════════════════════════════════════════
// VIEW STATE
// ════════════════════════════════════════
let curView   = 'cal';   // 'cal' | 'list' | 'detail'
let weekOffset= 0;
let detailId  = null;
let mobileDayOffset = 0; // días desde hoy en la vista diaria móvil

function switchView(v) {
  curView=v;
  document.getElementById('tab-cal').classList.toggle('active',v==='cal');
  document.getElementById('tab-list').classList.toggle('active',v==='list');
  render();
}
function goDetail(id) { curView='detail'; detailId=id; render(); }
function goBack()     {
  const prev = detailId ? 'list' : 'cal';
  curView=prev; detailId=null; render();
  document.getElementById('tab-list').classList.toggle('active',prev==='list');
  document.getElementById('tab-cal').classList.toggle('active',prev==='cal');
}
function shiftMobileDay(delta) { mobileDayOffset += delta; render(); }
function isMobileDayView() { return window.innerWidth <= 600; }

