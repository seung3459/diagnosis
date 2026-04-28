// =====================================
// 🚀 초기화
// =====================================

window.onload = function(){
  const raw = localStorage.getItem('facilityReport');
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch(e){ data = {}; }
  
  if(data.projectName) document.getElementById('projectName').value = data.projectName;
  if(data.buildingName) document.getElementById('buildingName').value = data.buildingName;
  if(data.projectStartDate) document.getElementById('projectStartDate').value = data.projectStartDate;
  if(data.dateRange) document.getElementById('dateRange').value = data.dateRange;
  updateHeroBadge();

  if(data.units){
    Object.keys(data.units).forEach(type=>{
      if(!fieldConfig[type]) return;
      data.units[type].forEach((unitData)=>{
        addUnit(type);
        const id = unitCount[type];
        setTimeout(()=>applyUnitData(type, id, unitData), 50);
      });
    });
    setTimeout(()=>{
      Object.keys(fieldConfig).forEach(type=>{
        refreshCardLabels(type);
        const container = document.getElementById(type+'Units');
        if(container){ 
          container.querySelectorAll('.card').forEach(card=>{ 
            updateSummary(type, card.dataset.id); 
          }); 
        }
        renderGroupSummary(type);
      });
    }, 250);
  }

  // 기본 탭 활성화
  const firstMainBtn = document.querySelector('.main-tabs button[data-section="heatSection"]');
  if(firstMainBtn) firstMainBtn.classList.add('active');
  const firstSubBtn = document.querySelector('.sub-tabs button[data-sub="coldSourceSection"]');
  if(firstSubBtn) firstSubBtn.classList.add('active');
  
  // 초기 요약 렌더링
  ['coldSource','heatSource','coolingTower'].forEach(t=>renderGroupSummary(t));
  
  // 캘린더 렌더링
  renderCalendar();
};
