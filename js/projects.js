// =====================================
// 📂 프로젝트 목록 관리 (GitHub 연동)
// =====================================

let projectsList = [];
let currentProject = null;
let currentProjectId = null;

let projectModalMode = 'add';
let projectModalEditIdx = -1;

// =====================================
// 프로젝트 목록 로드 (GitHub)
// =====================================

async function loadProjectsList(){
  if(!isAuthenticated){
    projectsList = [];
    return;
  }
  
  try{
    showLoading('프로젝트 목록 동기화 중...');
    const data = await ghLoadProjectsList();
    projectsList = data.projects || [];
    hideLoading();
    console.log(`✅ 프로젝트 ${projectsList.length}개 로드`);
  } catch(e){
    hideLoading();
    console.error('❌ 프로젝트 목록 로드 실패:', e);
    showToast(`❌ 동기화 실패: ${e.message}`);
    projectsList = [];
  }
}

// =====================================
// 프로젝트 목록 저장 (GitHub)
// =====================================

async function saveProjectsList(){
  if(!canEdit){
    console.warn('편집 권한 없음');
    return false;
  }
  
  try{
    await ghSaveProjectsList({ projects: projectsList });
    return true;
  } catch(e){
    console.error('❌ 프로젝트 목록 저장 실패:', e);
    showToast(`❌ 저장 실패: ${e.message}`);
    return false;
  }
}

// =====================================
// 테이블 렌더링
// =====================================

function renderProjectsTable(){
  const tbody = document.getElementById('projectsTableBody');
  if(!tbody) return;
  
  if(!isAuthenticated){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="projects-empty">
          🔐 로그인이 필요합니다.<br>
          <button class="btn-primary" style="margin-top:12px;" onclick="showTokenModal()">로그인</button>
        </td>
      </tr>
    `;
    return;
  }
  
  if(projectsList.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="projects-empty">
          📋 등록된 프로젝트가 없습니다.<br>
          ${canEdit ? '<strong>"+ 새 프로젝트"</strong> 버튼을 눌러 추가하세요.' : '편집 권한이 없습니다.'}
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  projectsList.forEach((p, idx) => {
    const no = String(idx + 1).padStart(2, '0');
    const isActive = (p.id === currentProjectId) ? ' active-project' : '';
    
    const actionButtons = canEdit
      ? `<button class="action-edit" onclick="event.stopPropagation();openProjectModal('edit', ${idx})" title="수정">✏️</button>
         <button class="action-delete" onclick="event.stopPropagation();deleteProject(${idx})" title="삭제">🗑️</button>`
      : `<span class="readonly-badge">👀</span>`;
    
    html += `
      <tr class="${isActive}" onclick="selectProject(${idx})">
        <td class="no-cell">${no}</td>
        <td class="year-cell">${escapeHtml(p.year)}</td>
        <td class="project-name-cell">
          ${escapeHtml(p.name)}
          ${isActive ? '<span class="active-badge">● 작업 중</span>' : ''}
        </td>
        <td class="note-cell">${escapeHtml(p.note) || '-'}</td>
        <td class="project-action">${actionButtons}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// =====================================
// 프로젝트 선택
// =====================================

async function selectProject(idx){
  const project = projectsList[idx];
  if(!project) return;
  
  // 모든 카드/폼 초기화
  resetAllUnits();
  
  // 활성 프로젝트 변경
  currentProjectId = project.id;
  currentProject = project;
  localStorage.setItem('activeProjectId', currentProjectId);
  
  // GitHub에서 데이터 로드
  showLoading(`"${project.name}" 데이터 로드 중...`);
  
  try{
    const data = await ghLoadProjectData(project.id);
    if(data){
      applyProjectData(data);
    } else {
      // 데이터 없음 → 빈 상태 + 프로젝트명만
      document.getElementById('projectName').value = project.name;
      updateHeroBadge();
      renderCalendar();
    }
  } catch(e){
    console.error('데이터 로드 실패:', e);
    showToast(`❌ 데이터 로드 실패: ${e.message}`);
    document.getElementById('projectName').value = project.name;
    updateHeroBadge();
  }
  
  hideLoading();
  showPage('main');
  showToast(`✅ "${project.name}" 진입`);
}

// =====================================
// 데이터 적용
// =====================================

function applyProjectData(data){
  if(data.projectName) document.getElementById('projectName').value = data.projectName;
  if(data.buildingName) document.getElementById('buildingName').value = data.buildingName;
  if(data.projectStartDate) document.getElementById('projectStartDate').value = data.projectStartDate;
  if(data.dateRange) document.getElementById('dateRange').value = data.dateRange;
  updateHeroBadge();
  renderCalendar();

  if(typeof applyHVACDiagramData === 'function'){
    applyHVACDiagramData(data.hvacDiagram || null);
  }
  
  if(data.units){
    Object.keys(data.units).forEach(type => {
      if(!fieldConfig[type]) return;
      data.units[type].forEach(unitData => {
        addUnit(type);
        const id = unitCount[type];
        setTimeout(() => applyUnitData(type, id, unitData), 50);
      });
    });
    
    setTimeout(() => {
      Object.keys(fieldConfig).forEach(type => {
        refreshCardLabels(type);
        const container = document.getElementById(type + 'Units');
        if(container){
          container.querySelectorAll('.card').forEach(card => {
            updateSummary(type, card.dataset.id);
          });
        }
        renderGroupSummary(type);
      });
    }, 250);
  }
}

// =====================================
// 카드 초기화
// =====================================

function resetAllUnits(){
  Object.keys(fieldConfig).forEach(type => {
    const container = document.getElementById(type + 'Units');
    if(container) container.innerHTML = '';
    unitCount[type] = 0;
    updateCount(type);
    renderGroupSummary(type);
  });
  
  Object.keys(unitSubtype).forEach(k => delete unitSubtype[k]);
  Object.keys(unitPhotos).forEach(k => delete unitPhotos[k]);
  
  ['projectName', 'buildingName', 'projectStartDate', 'dateRange'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  
  updateHeroBadge();

  if(typeof resetHVACDiagram === 'function') resetHVACDiagram();
}

// =====================================
// 현재 프로젝트 데이터 수집
// =====================================

function collectCurrentProjectData(){
  const data = {
    projectName: document.getElementById('projectName')?.value || '',
    buildingName: document.getElementById('buildingName')?.value || '',
    projectStartDate: document.getElementById('projectStartDate')?.value || '',
    dateRange: document.getElementById('dateRange')?.value || '',
    hvacDiagram: (typeof collectHVACDiagramData === 'function') ? collectHVACDiagramData() : null,
    units: {},
    lastModified: new Date().toISOString(),
    lastModifiedBy: currentUser?.login || 'unknown'
  };
  
  Object.keys(fieldConfig).forEach(type => {
    data.units[type] = [];
    const container = document.getElementById(type + 'Units');
    if(!container) return;
    container.querySelectorAll('.card').forEach(card => {
      data.units[type].push(collectUnitData(type, card.dataset.id));
    });
  });
  
  return data;
}

// =====================================
// 프로젝트 모달
// =====================================

function openProjectModal(mode, idx){
  if(!canEdit){
    showToast('❌ 편집 권한이 없습니다');
    return;
  }
  
  projectModalMode = mode;
  projectModalEditIdx = (typeof idx === 'number') ? idx : -1;
  
  const titleEl = document.getElementById('projectModalTitle');
  const submitBtn = document.getElementById('pmSubmitBtn');
  const yearInput = document.getElementById('pmYear');
  const nameInput = document.getElementById('pmName');
  const noteInput = document.getElementById('pmNote');
  
  [yearInput, nameInput].forEach(el => el.classList.remove('error'));
  
  if(mode === 'edit' && projectModalEditIdx >= 0){
    const project = projectsList[projectModalEditIdx];
    if(!project) return;
    
    titleEl.textContent = '✏️ 프로젝트 수정';
    submitBtn.textContent = '수정';
    yearInput.value = project.year || '';
    nameInput.value = project.name || '';
    noteInput.value = project.note || '';
  } else {
    titleEl.textContent = '📝 새 프로젝트 추가';
    submitBtn.textContent = '추가';
    yearInput.value = new Date().getFullYear();
    nameInput.value = '';
    noteInput.value = '';
  }
  
  document.getElementById('projectModal').classList.add('active');
  setTimeout(() => {
    nameInput.focus();
    if(mode === 'edit') nameInput.select();
  }, 100);
}

function closeProjectModal(e){
  if(e && e.target.id !== 'projectModal' && e.type === 'click') return;
  document.getElementById('projectModal').classList.remove('active');
  projectModalMode = 'add';
  projectModalEditIdx = -1;
}

async function submitProjectForm(){
  if(!canEdit){
    showToast('❌ 편집 권한이 없습니다');
    return;
  }
  
  const yearInput = document.getElementById('pmYear');
  const nameInput = document.getElementById('pmName');
  const noteInput = document.getElementById('pmNote');
  
  const year = yearInput.value.trim();
  const name = nameInput.value.trim();
  const note = noteInput.value.trim();
  
  let hasError = false;
  if(!year){ yearInput.classList.add('error'); hasError = true; }
  else { yearInput.classList.remove('error'); }
  if(!name){ nameInput.classList.add('error'); hasError = true; }
  else { nameInput.classList.remove('error'); }
  
  if(hasError){
    showToast('❌ 필수 항목(연도, 프로젝트명)을 입력해주세요');
    return;
  }
  
  showLoading('GitHub에 저장 중...');
  
  if(projectModalMode === 'edit' && projectModalEditIdx >= 0){
    projectsList[projectModalEditIdx] = { 
      ...projectsList[projectModalEditIdx],
      year, name, note 
    };
  } else {
    projectsList.push({ 
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      year, name, note,
      createdBy: currentUser?.login,
      createdAt: new Date().toISOString()
    });
  }
  
  const success = await saveProjectsList();
  hideLoading();
  
  if(success){
    showToast(projectModalMode === 'edit' ? `✅ "${name}" 수정 완료` : `✅ "${name}" 추가됨`);
    renderProjectsTable();
    closeProjectModal();
  }
}

document.addEventListener('keydown', function(e){
  const modal = document.getElementById('projectModal');
  if(!modal || !modal.classList.contains('active')) return;
  
  if(e.key === 'Enter' && e.target.classList.contains('form-input')){
    e.preventDefault();
    submitProjectForm();
  } else if(e.key === 'Escape'){
    closeProjectModal();
  }
});

// =====================================
// 프로젝트 삭제
// =====================================

async function deleteProject(idx){
  if(!canEdit){
    showToast('❌ 편집 권한이 없습니다');
    return;
  }
  
  const project = projectsList[idx];
  if(!project) return;
  
  if(!confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n※ GitHub에서도 데이터가 삭제됩니다.`)) return;
  
  showLoading('삭제 중...');
  
  try{
    // 1. 프로젝트 데이터 파일 삭제
    try{
      await ghDeleteProjectData(project.id);
    } catch(e){
      console.warn('데이터 파일 없음 (스킵):', e.message);
    }
    
    // 2. 목록에서 제거
    if(currentProjectId === project.id){
      currentProjectId = null;
      currentProject = null;
      localStorage.removeItem('activeProjectId');
    }
    
    projectsList.splice(idx, 1);
    await saveProjectsList();
    
    hideLoading();
    showToast(`✅ "${project.name}" 삭제됨`);
    renderProjectsTable();
  } catch(e){
    hideLoading();
    showToast(`❌ 삭제 실패: ${e.message}`);
  }
}

// =====================================
// 프로젝트 목록 페이지로 이동
// =====================================

async function goToProjects(){
  if(!isAuthenticated){
    showTokenModal();
    return;
  }
  
  showPage('projects');
  await loadProjectsList();
  renderProjectsTable();
}
