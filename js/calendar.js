// =====================================
// 📅 캘린더
// =====================================

let calYear, calMonth;
(function initCal(){ const t = new Date(); calYear = t.getFullYear(); calMonth = t.getMonth(); })();

function renderCalendar(){
  const title = document.getElementById('calTitle');
  const grid = document.getElementById('calGrid');
  if(!title || !grid) return;
  title.textContent = `${calYear}년 ${calMonth+1}월`;
  const today = new Date();
  const startDateStr = document.getElementById('projectStartDate')?.value;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const dayNames = ['일','월','화','수','목','금','토'];
  let html = '';
  dayNames.forEach((d,i)=>{ const cls = i===0?'sun':(i===6?'sat':''); html += `<div class="cal-day-head ${cls}">${d}</div>`; });
  for(let i=firstDay-1; i>=0; i--){ const dayNum = prevMonthDays - i; const dow = (firstDay-1-i); const cls = dow===0?'sun':(dow===6?'sat':''); html += `<div class="cal-day prev ${cls}">${dayNum}</div>`; }
  for(let d=1; d<=daysInMonth; d++){
    const dow = new Date(calYear, calMonth, d).getDay();
    const classes = ['cal-day'];
    if(dow===0) classes.push('sun'); else if(dow===6) classes.push('sat');
    if(today.getFullYear()===calYear && today.getMonth()===calMonth && today.getDate()===d) classes.push('today');
    if(startDate && startDate.getFullYear()===calYear && startDate.getMonth()===calMonth && startDate.getDate()===d) classes.push('start-date');
    html += `<div class="${classes.join(' ')}">${d}</div>`;
  }
  const used = firstDay + daysInMonth;
  for(let d=1; d<=totalCells-used; d++){ const dow = (used+d-1)%7; const cls = dow===0?'sun':(dow===6?'sat':''); html += `<div class="cal-day next ${cls}">${d}</div>`; }
  grid.innerHTML = html;
}

function calPrev(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function calNext(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }
function calToday(){ const t=new Date(); calYear=t.getFullYear(); calMonth=t.getMonth(); renderCalendar(); }

function updateHeroBadge(){
  const el = document.getElementById('projectName');
  const badge = document.getElementById('heroProjectBadge');
  if(!el || !badge) return;
  badge.textContent = el.value.trim() || '프로젝트를 입력해주세요';
}
