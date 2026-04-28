// =====================================
// 🚀 초기화
// =====================================

window.onload = async function(){
  // 1. 인증 시도
  const authOk = await initAuth();
  
  // 2. 인증 되었으면 프로젝트 로드
  if(authOk){
    await loadProjectsList();
    
    // 활성 프로젝트 복원 (재진입 시)
    const activeId = localStorage.getItem('activeProjectId');
    if(activeId){
      const project = projectsList.find(p => p.id === activeId);
      if(project){
        currentProjectId = project.id;
        currentProject = project;
        try{
          const data = await ghLoadProjectData(project.id);
          if(data) applyProjectData(data);
        } catch(e){
          console.warn('활성 프로젝트 복원 실패:', e);
        }
      }
    }
  }

  // 3. 기본 탭 활성화
  const firstMainBtn = document.querySelector('.main-tabs button[data-section="heatSection"]');
  if(firstMainBtn) firstMainBtn.classList.add('active');
  const firstSubBtn = document.querySelector('.sub-tabs button[data-sub="coldSourceSection"]');
  if(firstSubBtn) firstSubBtn.classList.add('active');
  
  // 4. 초기 요약 렌더링
  setTimeout(() => {
    ['coldSource','heatSource','coolingTower'].forEach(t=>renderGroupSummary(t));
  }, 300);
  
  // 5. 캘린더 렌더링
  renderCalendar();
  
  // 6. 시작 페이지를 intro로 설정
  showPage('intro');
};
