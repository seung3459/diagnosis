// =====================================
// 🆕 플로팅 빠른이동 버튼 (FAB)
// =====================================
//  - 우측 하단 📋 버튼
//  - 클릭 시 등록된 모든 호기 목록 표시
//  - 호기 클릭 → 해당 카드로 자동 점프 (탭 전환 + 펼침 + 스크롤)
//  - 모두 접기 / 맨 위로 가기
// =====================================

// 타입별 메타정보 (메인탭 / 서브탭 / 라벨)
const FAB_TYPE_META = {
  coldSource:   { label:'❄️ 냉열원',     mainTab:'heatSection', subTab:'coldSourceSection',  subFn:'showHeatType' },
  heatSource:   { label:'🔥 온열원',     mainTab:'heatSection', subTab:'heatSourceSection',  subFn:'showHeatType' },
  coolingTower: { label:'🗼 냉각탑',     mainTab:'heatSection', subTab:'coolingTowerSection',subFn:'showHeatType' },
  ahu:          { label:'💨 공조기',     mainTab:'airSection',  subTab:'ahuSection',         subFn:'showAirType' },
  fan:          { label:'🌀 급·배기팬',  mainTab:'airSection',  subTab:'fanSection',         subFn:'showAirType' },
  chilled_pump: { label:'💧 냉수펌프',   mainTab:'pumpSection', subTab:'chilledPumpSection', subFn:'showPumpType' },
  hot_pump:     { label:'🔥 온수펌프',   mainTab:'pumpSection', subTab:'hotPumpSection',     subFn:'showPumpType' },
  cooling_pump: { label:'❄️ 냉각수펌프', mainTab:'pumpSection', subTab:'coolingPumpSection', subFn:'showPumpType' },
  pipe:         { label:'🔗 배관',       mainTab:'pipeSection', subTab:null,                 subFn:null }
};
// =====================================
// 메뉴 열기/닫기
// =====================================
function toggleFabMenu(e){
  // 🆕 이벤트 전파 차단 → 외부 클릭 닫기 핸들러와의 충돌 방지
  if(e){
    e.stopPropagation();
    e.preventDefault();
  }
  
  const menu = document.getElementById('fabMenu');
  if(!menu){
    console.warn('[FAB] fabMenu 엘리먼트를 찾을 수 없습니다');
    return;
  }
  
  if(menu.classList.contains('active')){
    menu.classList.remove('active');
  } else {
    refreshFabMenu();
    menu.classList.add('active');
  }
}

// 메뉴 외부 클릭 시 닫기
document.addEventListener('click', function(e){
  const container = document.getElementById('fabContainer');
  if(!container) return;
  // 🆕 메뉴가 열려있을 때만 외부 클릭 감지
  const menu = document.getElementById('fabMenu');
  if(!menu || !menu.classList.contains('active')) return;
  
  if(!container.contains(e.target)){
    menu.classList.remove('active');
  }
});

// ESC로 메뉴 닫기
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    document.getElementById('fabMenu')?.classList.remove('active');
  }
});

// =====================================
// 호기 목록 갱신
// =====================================
function refreshFabMenu(){
  const list = document.getElementById('fabMenuList');
  if(!list) return;
  
  let html = '';
  let totalCount = 0;
  
  Object.keys(FAB_TYPE_META).forEach(type=>{
    const meta = FAB_TYPE_META[type];
    const container = document.getElementById(`${type}Units`);
    if(!container) return;
    
    const cards = container.querySelectorAll('.card');
    if(!cards.length) return;
    
    html += `<div class="fab-menu-section-title">${meta.label} (${cards.length}대)</div>`;
    
    cards.forEach(card=>{
      const id = card.dataset.id;
      
      // 아이콘 / 이름
      const icon = (typeof getDisplayIcon === 'function') ? getDisplayIcon(type, id) : '⚙️';
      const name = (typeof getDisplayName === 'function') ? getDisplayName(type, id) : `${type} ${id}호기`;
      
      // 운전 상태 → 칩
      const statusEl = document.querySelector(`input[name="${type}_${id}_status"]:checked`);
      const status = statusEl ? statusEl.value : '';
      let statusBadge = '';
      if(status === 'use')         statusBadge = `<span class="fab-status use">사용</span>`;
      else if(status === 'fail')   statusBadge = `<span class="fab-status fail">고장</span>`;
      else if(status === 'unused') statusBadge = `<span class="fab-status unused">미사용</span>`;
      else                          statusBadge = `<span class="fab-status empty">-</span>`;
      
      html += `
        <div class="fab-menu-item" onclick="fabJumpTo('${type}',${id})">
          <span class="fab-icon">${icon}</span>
          <span class="fab-name">${name}</span>
          ${statusBadge}
        </div>
      `;
      totalCount++;
    });
  });
  
  if(totalCount === 0){
    html = `<div class="fab-menu-empty">
      📭 등록된 호기가 없습니다<br>
      <span style="font-size:11px;color:#9ca3af;">설비 진단 페이지에서<br>호기를 추가해보세요</span>
    </div>`;
  }
  
  list.innerHTML = html;
}

// =====================================
// 호기로 점프 (탭 전환 + 펼침 + 스크롤)
// =====================================
function fabJumpTo(type, id){
  // 메뉴 닫기
  document.getElementById('fabMenu')?.classList.remove('active');
  
  // 1️⃣ 진단 페이지로 이동 (다른 페이지에 있을 수 있음)
  if(typeof showPage === 'function'){
    const diagPage = document.getElementById('diag');
    if(!diagPage || !diagPage.classList.contains('active')){
      showPage('diag');
    }
  }
  
  // 2️⃣ 메인 탭 + 서브 탭 전환
  const meta = FAB_TYPE_META[type];
  if(meta){
    // 메인 탭 (열원/공조/펌프/배관)
    const mainBtn = document.querySelector(`.main-tabs button[data-section="${meta.mainTab}"]`);
    if(mainBtn && typeof showSection === 'function'){
      showSection(meta.mainTab, mainBtn);
    }
    
    // 서브 탭 (냉열원/온열원/냉각탑 등)
    if(meta.subTab && meta.subFn){
      const subBtn = document.querySelector(`.sub-tabs button[data-sub="${meta.subTab}"]`);
      const fn = window[meta.subFn];
      if(subBtn && typeof fn === 'function'){
        fn(meta.subTab, subBtn);
      }
    }
  }
  
  // 3️⃣ 약간 지연 후 스크롤 + 펼침 (탭 전환 애니메이션 후)
  setTimeout(()=>{
    if(typeof scrollToCard === 'function'){
      scrollToCard(`${type}_${id}_card`);
    } else {
      const card = document.getElementById(`${type}_${id}_card`);
      if(card){
        card.classList.add('expanded');
        setTimeout(()=>card.scrollIntoView({behavior:'smooth', block:'start'}), 50);
      }
    }
  }, 150);
}

// =====================================
// 모두 접기
// =====================================
function fabCollapseAll(){
  const cards = document.querySelectorAll('.card.expanded');
  if(cards.length === 0){
    if(typeof showToast === 'function') showToast('💡 펼쳐진 카드가 없습니다');
    return;
  }
  
  cards.forEach(c=>c.classList.remove('expanded'));
  document.getElementById('fabMenu')?.classList.remove('active');
  
  if(typeof showToast === 'function') showToast(`📦 ${cards.length}개 카드를 접었습니다`);
}

// =====================================
// 맨 위로
// =====================================
function fabScrollTop(){
  window.scrollTo({top:0, behavior:'smooth'});
  document.getElementById('fabMenu')?.classList.remove('active');
}

// =====================================
// 페이지 전환에 따라 FAB 표시/숨김
// (intro / projects 페이지에서는 숨김)
// =====================================
function updateFabVisibility(){
  const container = document.getElementById('fabContainer');
  if(!container) return;
  
  const intro = document.getElementById('intro');
  const projects = document.getElementById('projects');
  const isHidden = (intro && intro.classList.contains('active'))
                || (projects && projects.classList.contains('active'));
  
  container.style.display = isHidden ? 'none' : 'block';
  
  // 페이지 떠날 때 메뉴도 닫기
  if(isHidden){
    document.getElementById('fabMenu')?.classList.remove('active');
  }
}

// 페이지 전환 감지: .page 요소의 class 변경 모니터링
(function setupFabPageObserver(){
  // DOM이 준비된 후 실행
  function init(){
    const pages = document.querySelectorAll('.page');
    if(!pages.length){
      setTimeout(init, 100);
      return;
    }
    
    const observer = new MutationObserver(updateFabVisibility);
    pages.forEach(p=>{
      observer.observe(p, { attributes:true, attributeFilter:['class'] });
    });
    
    // 초기 상태 반영
    updateFabVisibility();
  }
  
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
