// =====================================
// 📂 프로젝트 목록 관리
// =====================================

// 기본 프로젝트 데이터 (localStorage가 비어있을 때 사용)
const defaultProjects = [
  { year: '2026', name: '영락교회 노후화 진단', note: '' }
];

let projectsList = [];
let currentProject = null;

// 모달 상태 추적
let projectModalMode = 'add';
let projectModalEditIdx = -1;

// 프로젝트 목록 로드
function loadProjectsList(){
  const raw = localStorage.getItem('projectsList');
  if(raw){
    try{
      projectsList = JSON.parse(raw);
    } catch(e){
      projectsList = [...defaultProjects];
    }
  } else {
    projectsList = [...defaultProjects];
    saveProjectsList();
  }
}

// 프로젝트 목록 저장
function saveProjectsList(){
  localStorage.setItem('projectsList', JSON.stringify(projectsList));
}

// 프로젝트 테이블 렌더링
function renderProjectsTable(){
  const tbody = document.getElementById('projectsTableBody');
  if(!tbody) return;
  
  if(projectsList.length === 0){
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="projects-empty">
          📋 등록된 프로젝트가 없습니다. <strong>"+ 새 프로젝트"</strong> 버튼을 눌러 추가하세요.
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  projectsList.forEach((p, idx) => {
    const no = String(idx + 1).padStart(2, '0');
    html += `
      <tr onclick="selectProject(${idx})">
        <td class="no-cell">${no}</td>
        <td class="year-cell">${escapeHtml(p.year)}</td>
        <td class="project-name-cell">${escapeHtml(p.name)}</td>
        <td class="note-cell">${escapeHtml(p.note) || '-'}</td>
        <td class="project-action">
          <button class="action-edit" onclick="event.stopPropagation();openProjectModal('edit', ${idx})" title="수정">✏️</button>
          <button class="action-delete" onclick="event.stopPropagation();deleteProject(${idx})" title="삭제">🗑️</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// 🆕 프로젝트 선택 → 진단 페이지로 이동 (프로젝트명 항상 덮어쓰기)
function selectProject(idx){
  const project = projectsList[idx];
  if(!project) return;
  
  currentProject = project;
  
  // 🆕 프로젝트명 항상 덮어쓰기 (기존 값 무시)
  const projectNameEl = document.getElementById('projectName');
  if(projectNameEl){
    projectNameEl.value = project.name;
    updateHeroBadge();
  }
  
  showPage('main');
  showToast(`✅ "${project.name}" 프로젝트 진입`);
}

// =====================================
// 프로젝트 추가/수정 모달
// =====================================

function openProjectModal(mode, idx){
  projectModalMode = mode;
  projectModalEditIdx = (typeof idx === 'number') ? idx : -1;
  
  const titleEl = document.getElementById('projectModalTitle');
  const submitBtn = document.getElementById('pmSubmitBtn');
  const yearInput = document.getElementById('pmYear');
  const nameInput = document.getElementById('pmName');
  const noteInput = document.getElementById('pmNote');
  
  // 에러 스타일 제거
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
    if(mode === 'edit'){
      nameInput.focus();
      nameInput.select();
    } else {
      nameInput.focus();
    }
  }, 100);
}

function closeProjectModal(e){
  if(e && e.target.id !== 'projectModal' && e.type === 'click') return;
  document.getElementById('projectModal').classList.remove('active');
  projectModalMode = 'add';
  projectModalEditIdx = -1;
}

function submitProjectForm(){
  const yearInput = document.getElementById('pmYear');
  const nameInput = document.getElementById('pmName');
  const noteInput = document.getElementById('pmNote');
  
  const year = yearInput.value.trim();
  const name = nameInput.value.trim();
  const note = noteInput.value.trim();
  
  let hasError = false;
  
  if(!year){
    yearInput.classList.add('error');
    hasError = true;
  } else {
    yearInput.classList.remove('error');
  }
  
  if(!name){
    nameInput.classList.add('error');
    hasError = true;
  } else {
    nameInput.classList.remove('error');
  }
  
  if(hasError){
    showToast('❌ 필수 항목(연도, 프로젝트명)을 입력해주세요');
    return;
  }
  
  if(projectModalMode === 'edit' && projectModalEditIdx >= 0){
    projectsList[projectModalEditIdx] = { year, name, note };
    showToast(`✅ "${name}" 수정 완료`);
  } else {
    projectsList.push({ year, name, note });
    showToast(`✅ "${name}" 프로젝트 추가됨`);
  }
  
  saveProjectsList();
  renderProjectsTable();
  closeProjectModal();
}

// 키보드 이벤트: Enter로 저장, ESC로 닫기
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

// 프로젝트 삭제
function deleteProject(idx){
  const project = projectsList[idx];
  if(!project) return;
  
  if(!confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n※ 진단 데이터는 그대로 유지됩니다.`)) return;
  
  projectsList.splice(idx, 1);
  saveProjectsList();
  renderProjectsTable();
  showToast(`✅ 프로젝트 삭제됨`);
}

// 프로젝트 목록 페이지로 이동
function goToProjects(){
  showPage('projects');
  renderProjectsTable();
}
